from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc, func
from typing import List, Optional
import pandas as pd
import io
import unicodedata
import os
import subprocess
import csv
from io import StringIO
from datetime import date, datetime

import models
import schemas
from database import SessionLocal, engine

# =========================================================
# CONFIG BARTENDER
# =========================================================
BARTENDER_EXE = r"C:\Program Files\Seagull\BarTender Suite\bartend.exe"
BTW_RECEPCION_MP = r"C:\Users\JOSUE\Documents\VSBL\ALMACENAMIENTO\ROTULOS\1. RECEPCION MP.btw"
BTW_RECEPCION_MP_COD_TRAZ = r"C:\Users\JOSUE\Documents\VSBL\ALMACENAMIENTO\ROTULOS\5. RECEPCION MP COD + TRAZ.btw"

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="WMS API")

# ==============================
# CORS
# ==============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://inova-delta.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# DB
# ==============================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def apply_offset_limit(query, skip: int = 0, limit: Optional[int] = None):
    if skip and skip > 0:
        query = query.offset(skip)
    if limit is not None and limit > 0:
        query = query.limit(limit)
    return query


# ==============================
# HELPERS GENERALES
# ==============================
def normalize_excel_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [
        unicodedata.normalize("NFKD", str(col))
        .encode("ascii", "ignore")
        .decode("utf-8")
        .strip()
        .lower()
        for col in df.columns
    ]
    return df


def clean_str(v):
    if pd.isna(v):
        return None
    s = str(v).strip()
    if s == "" or s.lower() == "nan":
        return None
    return s


def clean_date(v):
    if pd.isna(v):
        return None
    d = pd.to_datetime(v, errors="coerce")
    if pd.isna(d):
        return None
    return d.date()


def clean_datetime(v):
    if pd.isna(v):
        return None
    d = pd.to_datetime(v, errors="coerce")
    if pd.isna(d):
        return None
    return d.to_pydatetime()


def clean_float(v):
    if pd.isna(v):
        return None
    n = pd.to_numeric(v, errors="coerce")
    if pd.isna(n):
        return None
    return float(n)


def clasificar_cumplimiento(requerida: float, retirada: float) -> str:
    if requerida <= 0:
        return "NO CUMPLIDA"
    if retirada <= 0:
        return "NO CUMPLIDA"
    if retirada >= requerida:
        return "CUMPLIDA"
    return "PARCIAL"


def recalcular_reserva(reserva: str, db: Session):
    detalles = db.query(models.DespachoDetalle).filter(
        models.DespachoDetalle.reserva == reserva
    ).all()

    total_requerido_reserva = 0.0
    total_retirado_reserva = 0.0

    for det in detalles:
        picks_confirmados = db.query(models.PickingDetalle).filter(
            models.PickingDetalle.despacho_detalle_id == det.id,
            models.PickingDetalle.confirmado == True
        ).all()

        retirado = sum(float(x.cantidad_confirmada or 0) for x in picks_confirmados)
        lineas = len([x for x in picks_confirmados if float(x.cantidad_confirmada or 0) > 0])

        requerida = float(det.cantidad or 0)

        det.cantidad_retirada = retirado
        det.diferencia = requerida - retirado
        det.lineas_usadas = lineas
        det.pct_cumplimiento_sku = round((retirado / requerida) * 100, 2) if requerida > 0 else 0
        det.clasificacion_sku = clasificar_cumplimiento(requerida, retirado)

        total_requerido_reserva += requerida
        total_retirado_reserva += retirado

    pct_reserva = round((total_retirado_reserva / total_requerido_reserva) * 100, 2) if total_requerido_reserva > 0 else 0
    clasif_reserva = clasificar_cumplimiento(total_requerido_reserva, total_retirado_reserva)

    for det in detalles:
        det.pct_cumplimiento_reserva = pct_reserva
        det.clasificacion_final = clasif_reserva

    db.commit()

    return {
        "reserva": reserva,
        "total_requerido": total_requerido_reserva,
        "total_retirado": total_retirado_reserva,
        "pct_cumplimiento_reserva": pct_reserva,
        "clasificacion_final": clasif_reserva,
    }


# ==============================
# CRUD MATERIALES
# ==============================
@app.post("/materiales", response_model=schemas.MaterialResponse)
def crear_material(material: schemas.MaterialCreate, db: Session = Depends(get_db)):
    existe = db.query(models.Material).filter(
        models.Material.codigo == material.codigo.strip()
    ).first()

    if existe:
        raise HTTPException(status_code=400, detail="El código ya existe")

    db_material = models.Material(
        codigo=material.codigo.strip(),
        descripcion=material.descripcion.strip(),
        unidad_medida=material.unidad_medida.strip(),
        familia=material.familia.strip() if material.familia else None,
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material


@app.get("/materiales", response_model=List[schemas.MaterialResponse])
def listar_materiales(
    search: Optional[str] = None,
    sort_by: str = "codigo",
    order: str = "asc",
    skip: int = 0,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Material)

    if search and search.strip():
        needle = search.strip()
        query = query.filter(
            or_(
                models.Material.codigo.contains(needle),
                models.Material.descripcion.contains(needle),
                models.Material.familia.contains(needle),
            )
        )

    if hasattr(models.Material, sort_by):
        columna = getattr(models.Material, sort_by)
        query = query.order_by(desc(columna) if order == "desc" else asc(columna))
    else:
        query = query.order_by(asc(models.Material.codigo))

    query = apply_offset_limit(query, skip, limit)
    return query.all()


@app.put("/materiales/{material_id}", response_model=schemas.MaterialResponse)
def actualizar_material(material_id: int, material: schemas.MaterialCreate, db: Session = Depends(get_db)):
    db_material = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not db_material:
        raise HTTPException(status_code=404, detail="Material no encontrado")

    db_material.codigo = material.codigo.strip()
    db_material.descripcion = material.descripcion.strip()
    db_material.unidad_medida = material.unidad_medida.strip()
    db_material.familia = material.familia.strip() if material.familia else None

    db.commit()
    db.refresh(db_material)
    return db_material


@app.delete("/materiales/{material_id}")
def eliminar_material(material_id: int, db: Session = Depends(get_db)):
    db_material = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not db_material:
        raise HTTPException(status_code=404, detail="Material no encontrado")

    db.delete(db_material)
    db.commit()
    return {"mensaje": "Material eliminado correctamente"}


@app.post("/materiales/importar")
async def importar_materiales(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")

    contenido = await file.read()
    df = pd.read_excel(io.BytesIO(contenido))

    df.columns = [
        unicodedata.normalize("NFKD", str(col))
        .encode("ascii", "ignore")
        .decode("utf-8")
        .strip()
        .lower()
        for col in df.columns
    ]

    columnas_requeridas = ["codigo", "descripcion", "unidad_medida", "familia"]
    for col in columnas_requeridas:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Falta la columna requerida: {col}")

    df = df.drop_duplicates(subset=["codigo"])

    codigos_existentes = {m[0] for m in db.query(models.Material.codigo).all()}
    materiales_creados = 0

    for _, row in df.iterrows():
        codigo = str(row["codigo"]).strip()
        if not codigo or codigo in codigos_existentes:
            continue

        material = models.Material(
            codigo=codigo,
            descripcion=str(row["descripcion"]).strip(),
            unidad_medida=str(row["unidad_medida"]).strip(),
            familia=str(row["familia"]).strip(),
        )
        db.add(material)
        materiales_creados += 1

    db.commit()
    return {"mensaje": "Importación completada", "materiales_nuevos": materiales_creados}


# ==============================
# MOVIMIENTOS
# ==============================
@app.post("/movimientos", response_model=schemas.MovimientoResponse)
def crear_movimiento(movimiento: schemas.MovimientoCreate, db: Session = Depends(get_db)):
    material = db.query(models.Material).filter(
        models.Material.codigo == movimiento.codigo_material.strip()
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material no existe")

    estado_final = (movimiento.estado or "ALMACENADO").strip().upper()
    if estado_final not in ["ALMACENADO", "EN_TRANSITO"]:
        raise HTTPException(status_code=400, detail="Estado inválido. Use ALMACENADO o EN_TRANSITO")

    ubicacion = None

    if movimiento.codigo_ubicacion and movimiento.codigo_ubicacion.strip():
        ubicacion = db.query(models.Ubicacion).filter(
            models.Ubicacion.ubicacion == movimiento.codigo_ubicacion.strip()
        ).first()
        if not ubicacion:
            raise HTTPException(status_code=404, detail="Ubicación no existe en datos maestros")
    else:
        if estado_final == "ALMACENADO":
            raise HTTPException(status_code=400, detail="Si el estado es ALMACENADO debe enviar ubicación")

    if estado_final == "EN_TRANSITO":
        ubicacion = None

    nuevo_movimiento = models.Movimiento(
        fecha=movimiento.fecha,
        usuario=movimiento.usuario.strip(),
        documento=movimiento.documento.strip() if movimiento.documento else None,
        codigo_cita=movimiento.codigo_cita.strip() if movimiento.codigo_cita else None,
        proveedor=movimiento.proveedor.strip() if movimiento.proveedor else None,
        remesa=movimiento.remesa.strip() if movimiento.remesa else None,
        orden_compra=movimiento.orden_compra.strip() if movimiento.orden_compra else None,
        um=movimiento.um.strip() if movimiento.um else None,
        umb=movimiento.umb.strip() if movimiento.umb else None,
        material_id=material.id,
        ubicacion_id=ubicacion.id if ubicacion else None,
        estado=estado_final,
        lote_almacen=movimiento.lote_almacen.strip() if movimiento.lote_almacen else None,
        lote_proveedor=movimiento.lote_proveedor.strip() if movimiento.lote_proveedor else None,
        fecha_fabricacion=movimiento.fecha_fabricacion,
        fecha_vencimiento=movimiento.fecha_vencimiento,
        cantidad_r=movimiento.cantidad_r,
    )

    db.add(nuevo_movimiento)
    db.commit()
    db.refresh(nuevo_movimiento)
    return nuevo_movimiento


@app.post("/movimientos/bulk")
def crear_movimientos_bulk(payload: schemas.MovimientoBulkCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="No hay items para guardar")

    codigos_material = list({it.codigo_material.strip() for it in payload.items if it.codigo_material})
    mats = db.query(models.Material).filter(models.Material.codigo.in_(codigos_material)).all()
    mat_map = {m.codigo: m for m in mats}

    faltan_materiales = [c for c in codigos_material if c not in mat_map]
    if faltan_materiales:
        raise HTTPException(status_code=404, detail=f"Material(es) no existe(n): {', '.join(faltan_materiales)}")

    codigos_ubic = list({
        it.codigo_ubicacion.strip()
        for it in payload.items
        if it.codigo_ubicacion and it.codigo_ubicacion.strip()
    })
    ubis = db.query(models.Ubicacion).filter(models.Ubicacion.ubicacion.in_(codigos_ubic)).all()
    ubi_map = {u.ubicacion: u for u in ubis}

    faltan_ubicaciones = [u for u in codigos_ubic if u not in ubi_map]
    if faltan_ubicaciones:
        raise HTTPException(
            status_code=404,
            detail=f"Ubicación(es) no existe(n) en datos maestros: {', '.join(faltan_ubicaciones)}"
        )

    nuevos = []
    for it in payload.items:
        m = mat_map[it.codigo_material.strip()]
        estado_final = (it.estado or "ALMACENADO").strip().upper()

        if estado_final not in ["ALMACENADO", "EN_TRANSITO"]:
            raise HTTPException(status_code=400, detail="Estado inválido. Use ALMACENADO o EN_TRANSITO")

        u = None
        if it.codigo_ubicacion and it.codigo_ubicacion.strip():
            u = ubi_map[it.codigo_ubicacion.strip()]
        else:
            if estado_final == "ALMACENADO":
                raise HTTPException(status_code=400, detail="Hay items ALMACENADO sin ubicación")

        if estado_final == "EN_TRANSITO":
            u = None

        mov = models.Movimiento(
            fecha=it.fecha,
            usuario=it.usuario.strip(),
            documento=it.documento.strip() if it.documento else None,
            codigo_cita=it.codigo_cita.strip() if it.codigo_cita else None,
            proveedor=it.proveedor.strip() if it.proveedor else None,
            remesa=it.remesa.strip() if it.remesa else None,
            orden_compra=it.orden_compra.strip() if it.orden_compra else None,
            um=it.um.strip() if it.um else None,
            umb=it.umb.strip() if it.umb else None,
            material_id=m.id,
            ubicacion_id=u.id if u else None,
            estado=estado_final,
            lote_almacen=it.lote_almacen.strip() if it.lote_almacen else None,
            lote_proveedor=it.lote_proveedor.strip() if it.lote_proveedor else None,
            fecha_fabricacion=it.fecha_fabricacion,
            fecha_vencimiento=it.fecha_vencimiento,
            cantidad_r=it.cantidad_r,
        )
        db.add(mov)
        nuevos.append(mov)

    db.commit()
    for mov in nuevos:
        db.refresh(mov)

    return {
        "mensaje": "Movimientos guardados correctamente",
        "total_guardados": len(nuevos),
        "ids": [m.id for m in nuevos]
    }


@app.get("/movimientos", response_model=List[schemas.MovimientoResponse])
def listar_movimientos(
    skip: int = 0,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Movimiento).order_by(desc(models.Movimiento.fecha))
    query = apply_offset_limit(query, skip, limit)
    return query.all()


@app.get("/movimientos/en-transito", response_model=List[schemas.EnTransitoRowResponse])
def listar_en_transito(
    q: Optional[str] = None,
    skip: int = 0,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Movimiento).filter(
        models.Movimiento.estado == "EN_TRANSITO"
    )

    if q and q.strip():
        needle = q.strip()
        query = query.join(models.Material).filter(
            or_(
                models.Movimiento.usuario.contains(needle),
                models.Movimiento.documento.contains(needle),
                models.Movimiento.codigo_cita.contains(needle),
                models.Movimiento.proveedor.contains(needle),
                models.Movimiento.remesa.contains(needle),
                models.Movimiento.orden_compra.contains(needle),
                models.Movimiento.lote_almacen.contains(needle),
                models.Movimiento.lote_proveedor.contains(needle),
                models.Material.codigo.contains(needle),
                models.Material.descripcion.contains(needle),
                models.Material.familia.contains(needle),
            )
        )

    query = query.order_by(desc(models.Movimiento.fecha))
    query = apply_offset_limit(query, skip, limit)
    rows = query.all()

    out = []
    for m in rows:
        out.append({
            "id": m.id,
            "fecha": m.fecha,
            "usuario": m.usuario,
            "documento": m.documento,
            "codigo_cita": m.codigo_cita,
            "proveedor": m.proveedor,
            "remesa": m.remesa,
            "orden_compra": m.orden_compra,
            "codigo_material": m.material.codigo,
            "descripcion_material": m.material.descripcion,
            "unidad_medida": m.material.unidad_medida,
            "familia": m.material.familia,
            "um": m.um or m.material.unidad_medida,
            "umb": m.umb,
            "estado": m.estado,
            "lote_almacen": m.lote_almacen,
            "lote_proveedor": m.lote_proveedor,
            "fecha_fabricacion": m.fecha_fabricacion,
            "fecha_vencimiento": m.fecha_vencimiento,
            "cantidad": m.cantidad_r,
        })
    return out


@app.post("/movimientos/{movimiento_id}/asignar-ubicacion")
def asignar_ubicacion_desde_transito(
    movimiento_id: int,
    payload: schemas.AsignarUbicacionPayload,
    db: Session = Depends(get_db),
):
    mov = db.query(models.Movimiento).filter(models.Movimiento.id == movimiento_id).first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    ubicacion_codigo = (payload.codigo_ubicacion or "").strip()
    if not ubicacion_codigo:
        raise HTTPException(status_code=400, detail="Debe enviar una ubicación")

    ubicacion = db.query(models.Ubicacion).filter(
        models.Ubicacion.ubicacion == ubicacion_codigo
    ).first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no existe en datos maestros")

    mov.ubicacion_id = ubicacion.id
    mov.estado = "ALMACENADO"

    db.commit()
    db.refresh(mov)

    return {
        "mensaje": "Ubicación asignada correctamente",
        "movimiento_id": mov.id,
        "estado": mov.estado,
        "ubicacion": ubicacion.ubicacion
    }


# ==============================
# STOCK
# ==============================
@app.get("/stock/{codigo_material}")
def obtener_stock(codigo_material: str, db: Session = Depends(get_db)):
    material = db.query(models.Material).filter(
        models.Material.codigo == codigo_material.strip()
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material no existe")

    stock_total = (
        db.query(func.sum(models.Movimiento.cantidad_r))
        .filter(models.Movimiento.material_id == material.id)
        .scalar()
        or 0
    )

    stock_almacenado = (
        db.query(func.sum(models.Movimiento.cantidad_r))
        .filter(
            models.Movimiento.material_id == material.id,
            models.Movimiento.estado == "ALMACENADO"
        )
        .scalar()
        or 0
    )

    stock_en_transito = (
        db.query(func.sum(models.Movimiento.cantidad_r))
        .filter(
            models.Movimiento.material_id == material.id,
            models.Movimiento.estado == "EN_TRANSITO"
        )
        .scalar()
        or 0
    )

    return {
        "codigo": material.codigo,
        "descripcion": material.descripcion,
        "unidad_medida": material.unidad_medida,
        "familia": material.familia,
        "stock_actual": stock_total,
        "stock_almacenado": stock_almacenado,
        "stock_en_transito": stock_en_transito
    }


# ==============================
# PROVEEDORES
# ==============================
@app.post("/proveedores", response_model=schemas.ProveedorOut)
def crear_proveedor(payload: schemas.ProveedorCreate, db: Session = Depends(get_db)):
    nombre = payload.nombre.strip()
    acreedor = payload.acreedor.strip()

    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre obligatorio")
    if not acreedor:
        raise HTTPException(status_code=400, detail="Acreedor obligatorio")

    existe = db.query(models.Proveedor).filter(models.Proveedor.nombre == nombre).first()
    if existe:
        raise HTTPException(status_code=400, detail="El proveedor ya existe")

    p = models.Proveedor(nombre=nombre, acreedor=acreedor)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@app.get("/proveedores", response_model=List[schemas.ProveedorOut])
def listar_proveedores(
    search: Optional[str] = None,
    sort_by: str = "nombre",
    order: str = "asc",
    skip: int = 0,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Proveedor)

    if search and search.strip():
        needle = search.strip()
        query = query.filter(
            or_(
                models.Proveedor.nombre.contains(needle),
                models.Proveedor.acreedor.contains(needle),
            )
        )

    if hasattr(models.Proveedor, sort_by):
        columna = getattr(models.Proveedor, sort_by)
        query = query.order_by(desc(columna) if order == "desc" else asc(columna))
    else:
        query = query.order_by(asc(models.Proveedor.nombre))

    query = apply_offset_limit(query, skip, limit)
    return query.all()


@app.put("/proveedores/{proveedor_id}", response_model=schemas.ProveedorOut)
def actualizar_proveedor(proveedor_id: int, payload: schemas.ProveedorCreate, db: Session = Depends(get_db)):
    proveedor = db.query(models.Proveedor).filter(models.Proveedor.id == proveedor_id).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    nombre = payload.nombre.strip()
    acreedor = payload.acreedor.strip()

    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre obligatorio")
    if not acreedor:
        raise HTTPException(status_code=400, detail="Acreedor obligatorio")

    existe = db.query(models.Proveedor).filter(
        models.Proveedor.nombre == nombre,
        models.Proveedor.id != proveedor_id
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe otro proveedor con ese nombre")

    proveedor.nombre = nombre
    proveedor.acreedor = acreedor

    db.commit()
    db.refresh(proveedor)
    return proveedor


@app.delete("/proveedores/{proveedor_id}")
def eliminar_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    proveedor = db.query(models.Proveedor).filter(models.Proveedor.id == proveedor_id).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    db.delete(proveedor)
    db.commit()
    return {"mensaje": "Proveedor eliminado correctamente"}


@app.post("/proveedores/importar")
async def importar_proveedores(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")

    contenido = await file.read()
    df = pd.read_excel(io.BytesIO(contenido))

    df.columns = [
        unicodedata.normalize("NFKD", str(col))
        .encode("ascii", "ignore")
        .decode("utf-8")
        .strip()
        .lower()
        for col in df.columns
    ]

    if "nombre proveedor" in df.columns:
        df = df.rename(columns={"nombre proveedor": "nombre"})
    if "codigo acreedor" in df.columns:
        df = df.rename(columns={"codigo acreedor": "acreedor"})

    for col in ["nombre", "acreedor"]:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Falta la columna requerida: {col}")

    df["nombre"] = df["nombre"].astype(str).str.strip()
    df["acreedor"] = df["acreedor"].astype(str).str.strip()
    df = df[(df["nombre"] != "") & (df["acreedor"] != "")]
    df = df.drop_duplicates(subset=["nombre"])

    existentes = {p[0] for p in db.query(models.Proveedor.nombre).all()}
    creados = 0

    for _, row in df.iterrows():
        nombre = row["nombre"]
        acreedor = row["acreedor"]
        if nombre in existentes:
            continue
        db.add(models.Proveedor(nombre=nombre, acreedor=acreedor))
        creados += 1

    db.commit()
    return {"mensaje": "Importación completada", "proveedores_nuevos": creados}


# ==============================
# UBICACIONES
# ==============================
@app.get("/ubicaciones", response_model=List[schemas.UbicacionResponse])
def listar_ubicaciones(
    search: Optional[str] = None,
    sort_by: str = "ubicacion",
    order: str = "asc",
    skip: int = 0,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Ubicacion)

    if search and search.strip():
        needle = search.strip()
        query = query.filter(
            or_(
                models.Ubicacion.ubicacion.contains(needle),
                models.Ubicacion.zona.contains(needle),
                models.Ubicacion.familias.contains(needle),
                models.Ubicacion.bodega.contains(needle),
            )
        )

    if hasattr(models.Ubicacion, sort_by):
        columna = getattr(models.Ubicacion, sort_by)
        query = query.order_by(desc(columna) if order == "desc" else asc(columna))
    else:
        query = query.order_by(asc(models.Ubicacion.ubicacion))

    query = apply_offset_limit(query, skip, limit)
    return query.all()


@app.post("/ubicaciones", response_model=schemas.UbicacionResponse)
def crear_ubicacion(payload: schemas.UbicacionCreate, db: Session = Depends(get_db)):
    ubicacion = payload.ubicacion.strip()
    if not ubicacion:
        raise HTTPException(status_code=400, detail="UBICACIÓN obligatoria")

    existe = db.query(models.Ubicacion).filter(models.Ubicacion.ubicacion == ubicacion).first()
    if existe:
        raise HTTPException(status_code=400, detail="La ubicación ya existe")

    u = models.Ubicacion(
        ubicacion=ubicacion,
        zona=(payload.zona or "").strip() if payload.zona else None,
        familias=(payload.familias or "").strip() if payload.familias else None,
        bodega=(payload.bodega or "").strip() if payload.bodega else None,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@app.put("/ubicaciones/{ubicacion_id}", response_model=schemas.UbicacionResponse)
def actualizar_ubicacion(ubicacion_id: int, payload: schemas.UbicacionCreate, db: Session = Depends(get_db)):
    ubicacion_db = db.query(models.Ubicacion).filter(models.Ubicacion.id == ubicacion_id).first()
    if not ubicacion_db:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")

    ubicacion = payload.ubicacion.strip()
    if not ubicacion:
        raise HTTPException(status_code=400, detail="UBICACIÓN obligatoria")

    existe = db.query(models.Ubicacion).filter(
        models.Ubicacion.ubicacion == ubicacion,
        models.Ubicacion.id != ubicacion_id
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe otra ubicación con ese nombre")

    ubicacion_db.ubicacion = ubicacion
    ubicacion_db.zona = (payload.zona or "").strip() if payload.zona else None
    ubicacion_db.familias = (payload.familias or "").strip() if payload.familias else None
    ubicacion_db.bodega = (payload.bodega or "").strip() if payload.bodega else None

    db.commit()
    db.refresh(ubicacion_db)
    return ubicacion_db


@app.delete("/ubicaciones/{ubicacion_id}")
def eliminar_ubicacion(ubicacion_id: int, db: Session = Depends(get_db)):
    ubicacion = db.query(models.Ubicacion).filter(models.Ubicacion.id == ubicacion_id).first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")

    db.delete(ubicacion)
    db.commit()
    return {"mensaje": "Ubicación eliminada correctamente"}


@app.post("/ubicaciones/importar")
async def importar_ubicaciones(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")

    contenido = await file.read()
    df = pd.read_excel(io.BytesIO(contenido))

    df.columns = [
        unicodedata.normalize("NFKD", str(col))
        .encode("ascii", "ignore")
        .decode("utf-8")
        .strip()
        .lower()
        for col in df.columns
    ]

    if "ubicacion" not in df.columns:
        raise HTTPException(
            status_code=400,
            detail="El Excel debe tener la columna 'UBICACIÓN' (o 'UBICACION')."
        )

    for col in ["zona", "familias", "bodega"]:
        if col not in df.columns:
            df[col] = ""

    df["ubicacion"] = df["ubicacion"].astype(str).str.strip()
    df["zona"] = df["zona"].astype(str).str.strip()
    df["familias"] = df["familias"].astype(str).str.strip()
    df["bodega"] = df["bodega"].astype(str).str.strip()

    df = df[df["ubicacion"] != ""]
    df = df.drop_duplicates(subset=["ubicacion"])

    existentes = {x[0] for x in db.query(models.Ubicacion.ubicacion).all()}

    creadas = 0
    actualizadas = 0

    for _, row in df.iterrows():
        ubi = str(row["ubicacion"]).strip()
        zona = str(row["zona"]).strip()
        familias = str(row["familias"]).strip()
        bodega = str(row["bodega"]).strip()

        if ubi in existentes:
            obj = db.query(models.Ubicacion).filter(models.Ubicacion.ubicacion == ubi).first()
            if obj:
                obj.zona = zona or obj.zona
                obj.familias = familias or obj.familias
                obj.bodega = bodega or obj.bodega
                actualizadas += 1
            continue

        db.add(models.Ubicacion(
            ubicacion=ubi,
            zona=zona,
            familias=familias,
            bodega=bodega
        ))
        creadas += 1

    db.commit()
    return {
        "mensaje": "Importación completada",
        "ubicaciones_nuevas": creadas,
        "ubicaciones_actualizadas": actualizadas
    }


# ==============================
# MOTOR
# ==============================
@app.get("/motor", response_model=List[schemas.MotorRowResponse])
def listar_motor(
    skip: int = 0,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Movimiento).order_by(desc(models.Movimiento.fecha))
    query = apply_offset_limit(query, skip, limit)
    movs = query.all()

    out = []
    for m in movs:
        tipo = "ENTRADA" if (m.cantidad_r or 0) >= 0 else "SALIDA"
        out.append(
            {
                "id": m.id,
                "fecha": m.fecha,
                "tipo": tipo,
                "usuario": m.usuario,
                "documento": m.documento,
                "codigo_cita": m.codigo_cita,
                "proveedor": m.proveedor,
                "remesa": m.remesa,
                "orden_compra": m.orden_compra,
                "sku": m.material.codigo,
                "um": m.um or m.material.unidad_medida,
                "umb": m.umb,
                "codigo_material": m.material.codigo,
                "descripcion_material": m.material.descripcion,
                "unidad_medida": m.material.unidad_medida,
                "familia": m.material.familia,
                "estado": m.estado,
                "ubicacion": m.ubicacion.ubicacion if m.ubicacion else "EN TRANSITO",
                "zona": m.ubicacion.zona if m.ubicacion else None,
                "familias": m.ubicacion.familias if m.ubicacion else None,
                "bodega": m.ubicacion.bodega if m.ubicacion else None,
                "lote_almacen": m.lote_almacen,
                "lote_proveedor": m.lote_proveedor,
                "fecha_fabricacion": m.fecha_fabricacion,
                "fecha_vencimiento": m.fecha_vencimiento,
                "cantidad": m.cantidad_r,
            }
        )

    return out


# ==============================
# ROTULOS
# ==============================
@app.post("/rotulos", response_model=schemas.RotuloOut)
def crear_rotulo(payload: schemas.RotuloCreate, db: Session = Depends(get_db)):
    if not payload.codigo_cita or not payload.codigo_cita.strip():
        raise HTTPException(status_code=400, detail="codigo_cita (serial) obligatorio")
    if not payload.impresion or not payload.impresion.strip():
        raise HTTPException(status_code=400, detail="impresion (serial-item) obligatorio")

    data = payload.model_dump()

    if not data.get("fecha_recepcion"):
        data["fecha_recepcion"] = date.today()

    r = models.Rotulo(**data)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@app.post("/rotulos/bulk")
def crear_rotulos_bulk(payload: schemas.RotuloBulkCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="No hay items para guardar")

    nuevos = []
    for it in payload.items:
        if not it.codigo_cita or not it.codigo_cita.strip():
            raise HTTPException(status_code=400, detail="codigo_cita obligatorio en todos los items")
        if not it.impresion or not it.impresion.strip():
            raise HTTPException(status_code=400, detail="impresion obligatorio en todos los items")

        data = it.model_dump()

        if not data.get("fecha_recepcion"):
            data["fecha_recepcion"] = date.today()

        r = models.Rotulo(
            codigo_cita=data.get("codigo_cita"),
            impresion=data.get("impresion"),
            fecha_recepcion=data.get("fecha_recepcion"),
            numero_semana=data.get("numero_semana"),
            proveedor=data.get("proveedor"),
            documento=data.get("documento"),
            remesa=data.get("remesa"),
            orden_compra=data.get("orden_compra"),
            cantidad=data.get("cantidad"),
            sku=data.get("sku"),
            texto_breve=data.get("texto_breve"),
            um=data.get("um"),
            umb=data.get("umb"),
            fecha_fabricacion=data.get("fecha_fabricacion"),
            fecha_vencimiento=data.get("fecha_vencimiento"),
            lote_proveedor=data.get("lote_proveedor"),
            lote_almacen=data.get("lote_almacen"),
        )

        db.add(r)
        nuevos.append(r)

    db.commit()
    for r in nuevos:
        db.refresh(r)

    return {
        "mensaje": "Rotulos guardados",
        "total_guardados": len(nuevos),
        "ids": [x.id for x in nuevos]
    }


@app.get("/rotulos", response_model=List[schemas.RotuloOut])
def listar_rotulos(
    q: Optional[str] = None,
    codigo_cita: Optional[str] = None,
    impresion: Optional[str] = None,
    skip: int = 0,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Rotulo)

    if codigo_cita and codigo_cita.strip():
        query = query.filter(models.Rotulo.codigo_cita == codigo_cita.strip())

    if impresion and impresion.strip():
        query = query.filter(models.Rotulo.impresion == impresion.strip())

    if q and q.strip():
        needle = q.strip()
        query = query.filter(
            or_(
                models.Rotulo.codigo_cita.contains(needle),
                models.Rotulo.impresion.contains(needle),
                models.Rotulo.documento.contains(needle),
                models.Rotulo.sku.contains(needle),
                models.Rotulo.texto_breve.contains(needle),
                models.Rotulo.lote_almacen.contains(needle),
                models.Rotulo.lote_proveedor.contains(needle),
                models.Rotulo.remesa.contains(needle),
                models.Rotulo.orden_compra.contains(needle),
                models.Rotulo.proveedor.contains(needle),
            )
        )

    query = query.order_by(desc(models.Rotulo.id))
    query = apply_offset_limit(query, skip, limit)
    return query.all()


@app.get("/rotulos/export")
def exportar_rotulos_csv(
    codigo_cita: Optional[str] = None,
    impresion: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Rotulo)

    if codigo_cita and codigo_cita.strip():
        q = q.filter(models.Rotulo.codigo_cita == codigo_cita.strip())

    if impresion and impresion.strip():
        q = q.filter(models.Rotulo.impresion == impresion.strip())

    rows = q.order_by(asc(models.Rotulo.id)).all()

    cols = [
        "impresion",
        "codigo_cita",
        "fecha_recepcion",
        "numero_semana",
        "proveedor",
        "documento",
        "remesa",
        "orden_compra",
        "cantidad",
        "sku",
        "texto_breve",
        "um",
        "umb",
        "fecha_fabricacion",
        "fecha_vencimiento",
        "lote_proveedor",
        "lote_almacen",
    ]

    buff = StringIO()
    w = csv.writer(buff)
    w.writerow(cols)

    def v(x):
        return "" if x is None else str(x)

    for r in rows:
        w.writerow(
            [
                v(r.impresion),
                v(r.codigo_cita),
                v(r.fecha_recepcion),
                v(r.numero_semana),
                v(r.proveedor),
                v(r.documento),
                v(r.remesa),
                v(r.orden_compra),
                v(r.cantidad),
                v(r.sku),
                v(r.texto_breve),
                v(r.um),
                v(r.umb),
                v(r.fecha_fabricacion),
                v(r.fecha_vencimiento),
                v(r.lote_proveedor),
                v(r.lote_almacen),
            ]
        )

    tag = "todos"
    if impresion and impresion.strip():
        tag = impresion.strip()
    if codigo_cita and codigo_cita.strip():
        tag = codigo_cita.strip()

    filename = f"rotulos_{tag}.csv"
    return Response(
        content=buff.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/rotulos/imprimir")
def imprimir_rotulo(
    rotulo_id: int = Body(..., embed=True),
    copias: int = Body(1, embed=True),
    db: Session = Depends(get_db),
):
    r = db.query(models.Rotulo).filter(models.Rotulo.id == rotulo_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Rótulo no encontrado")

    if not os.path.exists(BTW_RECEPCION_MP):
        raise HTTPException(status_code=500, detail="No se encontró el archivo BTW 1. RECEPCION MP.btw")

    if not os.path.exists(BTW_RECEPCION_MP_COD_TRAZ):
        raise HTTPException(status_code=500, detail="No se encontró el archivo BTW 5. RECEPCION MP COD + TRAZ.btw")

    if not os.path.exists(BARTENDER_EXE):
        raise HTTPException(status_code=500, detail="No se encontró bartend.exe")

    csv_path = r"C:\Users\JOSUE\Documents\VSBL\ALMACENAMIENTO\ROTULOS\rotulo_print.csv"

    cols = [
        "IMPRESION",
        "SERIAL",
        "FECHA_RECEPCION",
        "NUMERO_SEMANA",
        "PROVEEDOR",
        "DOCUMENTO",
        "REMESA",
        "ORDEN_COMPRA",
        "CANTIDAD",
        "SKU",
        "TEXTO_BREVE",
        "UM",
        "UMB",
        "FF",
        "FV",
        "LOTE_PROV",
        "LOTE_ALM",
    ]

    def v(x):
        return "" if x is None else str(x)

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerow([
            v(r.impresion),
            v(r.codigo_cita),
            v(r.fecha_recepcion),
            v(r.numero_semana),
            v(r.proveedor),
            v(r.documento),
            v(r.remesa),
            v(r.orden_compra),
            v(r.cantidad),
            v(r.sku),
            v(r.texto_breve),
            v(r.um),
            v(r.umb),
            v(r.fecha_fabricacion),
            v(r.fecha_vencimiento),
            v(r.lote_proveedor),
            v(r.lote_almacen),
        ])

    copias_ok = max(1, int(copias))

    cmd1 = [
        BARTENDER_EXE,
        f"/F={BTW_RECEPCION_MP}",
        f"/D={csv_path}",
        "/P",
        f"/C={copias_ok}",
    ]

    cmd2 = [
        BARTENDER_EXE,
        f"/F={BTW_RECEPCION_MP_COD_TRAZ}",
        f"/D={csv_path}",
        "/P",
        f"/C={copias_ok}",
    ]

    try:
        p1 = subprocess.Popen(cmd1)
        p2 = subprocess.Popen(cmd2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error lanzando BarTender: {str(e)}")

    return {
        "mensaje": "Los 2 rótulos fueron lanzados a impresión al mismo tiempo",
        "rotulo_id": rotulo_id,
        "impresion": r.impresion,
        "copias": copias_ok,
        "csv_path": csv_path,
        "cmd_1": cmd1,
        "cmd_2": cmd2,
        "pid_1": p1.pid,
        "pid_2": p2.pid,
    }


@app.delete("/rotulos/{rotulo_id}")
def eliminar_rotulo(rotulo_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Rotulo).filter(models.Rotulo.id == rotulo_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Rótulo no encontrado")

    db.delete(r)
    db.commit()

    return {
        "mensaje": "Rótulo eliminado correctamente",
        "rotulo_id": rotulo_id,
        "impresion": r.impresion,
    }


# ==============================
# IMPORTAR INVENTARIO INICIAL
# ==============================
@app.post("/movimientos/importar_inicial")
async def importar_inventario_inicial(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        if not file.filename.lower().endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")

        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))

        print("=== IMPORT INVENTARIO INICIAL ===")
        print("Filas:", len(df))
        print("Columnas:", list(df.columns))

        df.columns = [str(c).strip().lower() for c in df.columns]

        required = ["fecha", "usuario", "documento", "codigo_material", "codigo_ubicacion", "cantidad_r"]
        for col in required:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Falta columna requerida: {col}")

        for col in [
            "codigo_cita", "lote_almacen", "lote_proveedor",
            "fecha_fabricacion", "fecha_vencimiento",
            "proveedor", "remesa", "orden_compra", "um", "umb"
        ]:
            if col not in df.columns:
                df[col] = None

        df["usuario"] = df["usuario"].apply(clean_str)
        df["documento"] = df["documento"].apply(clean_str)
        df["codigo_material"] = df["codigo_material"].apply(clean_str)
        df["codigo_ubicacion"] = df["codigo_ubicacion"].apply(clean_str)

        for c in ["codigo_cita", "proveedor", "remesa", "orden_compra", "um", "umb", "lote_almacen", "lote_proveedor"]:
            df[c] = df[c].apply(clean_str)

        for c in ["usuario", "documento", "codigo_material", "codigo_ubicacion"]:
            vacios = df[df[c].isna()]
            if not vacios.empty:
                filas = (vacios.index + 2).tolist()[:10]
                raise HTTPException(
                    status_code=400,
                    detail=f"La columna '{c}' tiene valores vacíos. Filas ejemplo: {filas}"
                )

        df["fecha_parsed"] = df["fecha"].apply(clean_datetime)
        if df["fecha_parsed"].isna().any():
            filas = (df[df["fecha_parsed"].isna()].index + 2).tolist()[:10]
            raise HTTPException(
                status_code=400,
                detail=f"Fechas inválidas en columna 'fecha'. Filas ejemplo: {filas}"
            )

        df["ff_parsed"] = df["fecha_fabricacion"].apply(clean_date)
        df["fv_parsed"] = df["fecha_vencimiento"].apply(clean_date)

        df["cantidad_r"] = df["cantidad_r"].apply(clean_float)
        if df["cantidad_r"].isna().any():
            filas = (df[df["cantidad_r"].isna()].index + 2).tolist()[:10]
            raise HTTPException(
                status_code=400,
                detail=f"Cantidad inválida en 'cantidad_r'. Filas ejemplo: {filas}"
            )

        if (df["cantidad_r"] <= 0).any():
            filas = (df[df["cantidad_r"] <= 0].index + 2).tolist()[:10]
            raise HTTPException(
                status_code=400,
                detail=f"'cantidad_r' debe ser > 0. Filas ejemplo: {filas}"
            )

        materiales_db = db.query(models.Material).all()
        material_map = {str(m.codigo).strip(): m for m in materiales_db}

        ubicaciones_db = db.query(models.Ubicacion).all()
        ubicacion_map = {str(u.ubicacion).strip(): u for u in ubicaciones_db}

        faltan_mats = sorted(set(df["codigo_material"].dropna()) - set(material_map.keys()))
        if faltan_mats:
            raise HTTPException(
                status_code=404,
                detail=f"Materiales no existen: {', '.join(faltan_mats[:50])}"
            )

        faltan_ubis = sorted(set(df["codigo_ubicacion"].dropna()) - set(ubicacion_map.keys()))
        if faltan_ubis:
            raise HTTPException(
                status_code=404,
                detail=f"Ubicaciones no existen: {', '.join(faltan_ubis[:50])}"
            )

        nuevos = []
        for idx, r in df.iterrows():
            material = material_map.get(r["codigo_material"])
            ubicacion = ubicacion_map.get(r["codigo_ubicacion"])

            if material is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"No se encontró material en fila Excel {idx + 2}: {r['codigo_material']}"
                )

            if ubicacion is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"No se encontró ubicación en fila Excel {idx + 2}: {r['codigo_ubicacion']}"
                )

            mov = models.Movimiento(
                fecha=r["fecha_parsed"],
                usuario=r["usuario"],
                documento=r["documento"],
                codigo_cita=r["codigo_cita"],
                proveedor=r["proveedor"],
                remesa=r["remesa"],
                orden_compra=r["orden_compra"],
                um=r["um"],
                umb=r["umb"],
                material_id=int(material.id),
                ubicacion_id=int(ubicacion.id),
                estado="ALMACENADO",
                lote_almacen=r["lote_almacen"],
                lote_proveedor=r["lote_proveedor"],
                fecha_fabricacion=r["ff_parsed"],
                fecha_vencimiento=r["fv_parsed"],
                cantidad_r=float(r["cantidad_r"]),
            )

            db.add(mov)
            nuevos.append(mov)

        db.commit()
        return {
            "mensaje": "Inventario inicial importado correctamente",
            "total_guardados": len(nuevos)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importando inventario inicial: {repr(e)}")


# ==============================
# DESPACHO - IMPORTAR RESERVAS
# ==============================
@app.post("/despachos/importar")
async def importar_despachos(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        if not file.filename.lower().endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")

        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        df = normalize_excel_columns(df)

        required = ["fecha de necesidad", "reserva", "sku", "texto breve", "cantidad"]
        for col in required:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Falta columna requerida: {col}")

        df = df.rename(columns={
            "fecha de necesidad": "fecha_necesidad",
            "texto breve": "texto_breve",
        })

        df["fecha_necesidad"] = df["fecha_necesidad"].apply(clean_date)
        df["reserva"] = df["reserva"].apply(clean_str)
        df["sku"] = df["sku"].apply(clean_str)
        df["texto_breve"] = df["texto_breve"].apply(clean_str)
        df["cantidad"] = pd.to_numeric(df["cantidad"], errors="coerce")

        if df["reserva"].isna().any():
            filas = (df[df["reserva"].isna()].index + 2).tolist()[:10]
            raise HTTPException(status_code=400, detail=f"Reserva vacía. Filas ejemplo: {filas}")

        if df["sku"].isna().any():
            filas = (df[df["sku"].isna()].index + 2).tolist()[:10]
            raise HTTPException(status_code=400, detail=f"SKU vacío. Filas ejemplo: {filas}")

        if df["cantidad"].isna().any():
            filas = (df[df["cantidad"].isna()].index + 2).tolist()[:10]
            raise HTTPException(status_code=400, detail=f"Cantidad inválida. Filas ejemplo: {filas}")

        if (df["cantidad"] <= 0).any():
            filas = (df[df["cantidad"] <= 0].index + 2).tolist()[:10]
            raise HTTPException(status_code=400, detail=f"La cantidad debe ser > 0. Filas ejemplo: {filas}")

        carga = models.DespachoCarga(
            fecha_carga=datetime.utcnow(),
            archivo_nombre=file.filename
        )
        db.add(carga)
        db.commit()
        db.refresh(carga)

        total = 0
        for _, row in df.iterrows():
            det = models.DespachoDetalle(
                carga_id=carga.id,
                fecha_necesidad=row["fecha_necesidad"],
                reserva=row["reserva"],
                sku=row["sku"],
                texto_breve=row["texto_breve"],
                cantidad=float(row["cantidad"]),
                cantidad_retirada=0,
                diferencia=float(row["cantidad"]),
                lineas_usadas=0,
                pct_cumplimiento_sku=0,
                pct_cumplimiento_reserva=0,
                clasificacion_sku="NO CUMPLIDA",
                clasificacion_final="NO CUMPLIDA",
            )
            db.add(det)
            total += 1

        db.commit()

        return {
            "mensaje": "Despachos importados correctamente",
            "carga_id": carga.id,
            "archivo": carga.archivo_nombre,
            "total_registros": total,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importando despacho: {repr(e)}")


@app.get("/despachos", response_model=List[schemas.DespachoDetalleOut])
def listar_despachos(
    reserva: Optional[str] = None,
    carga_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.DespachoDetalle)

    if carga_id is not None:
        query = query.filter(models.DespachoDetalle.carga_id == carga_id)

    if reserva and reserva.strip():
        query = query.filter(models.DespachoDetalle.reserva == reserva.strip())

    return query.order_by(
        asc(models.DespachoDetalle.reserva),
        asc(models.DespachoDetalle.sku),
        asc(models.DespachoDetalle.id),
    ).all()


@app.post("/despachos/generar-picking/{reserva}")
def generar_picking(reserva: str, db: Session = Depends(get_db)):
    reserva = (reserva or "").strip()
    if not reserva:
        raise HTTPException(status_code=400, detail="Reserva obligatoria")

    detalles = db.query(models.DespachoDetalle).filter(
        models.DespachoDetalle.reserva == reserva
    ).order_by(asc(models.DespachoDetalle.id)).all()

    if not detalles:
        raise HTTPException(status_code=404, detail="No existe esa reserva en despachos")

    db.query(models.PickingDetalle).filter(
        models.PickingDetalle.reserva == reserva,
        models.PickingDetalle.confirmado == False
    ).delete(synchronize_session=False)
    db.commit()

    hoy = date.today()
    lineas_creadas = 0

    for det in detalles:
        sku = (det.sku or "").strip()
        requerida = float(det.cantidad or 0)

        ya_confirmado = (
            db.query(func.sum(models.PickingDetalle.cantidad_confirmada))
            .filter(
                models.PickingDetalle.despacho_detalle_id == det.id,
                models.PickingDetalle.confirmado == True,
            )
            .scalar()
            or 0
        )
        ya_confirmado = float(ya_confirmado)

        pendiente = max(0.0, requerida - ya_confirmado)

        if pendiente <= 0:
            continue

        material = db.query(models.Material).filter(
            models.Material.codigo == sku
        ).first()

        if not material:
            continue

        stock_rows = (
            db.query(models.Movimiento)
            .filter(
                models.Movimiento.material_id == material.id,
                models.Movimiento.estado == "ALMACENADO",
                models.Movimiento.ubicacion_id.isnot(None),
                models.Movimiento.fecha_vencimiento.isnot(None),
                models.Movimiento.fecha_vencimiento >= hoy,
            )
            .order_by(
                asc(models.Movimiento.fecha_vencimiento),
                asc(models.Movimiento.id),
            )
            .all()
        )

        usados_en_esta_generacion = set()

        for mov in stock_rows:
            if pendiente <= 0:
                break

            key = (
                mov.material_id,
                mov.ubicacion_id,
                mov.lote_almacen,
                mov.lote_proveedor,
                mov.fecha_vencimiento,
            )

            if key in usados_en_esta_generacion:
                continue

            usados_en_esta_generacion.add(key)

            disponible = (
                db.query(func.sum(models.Movimiento.cantidad_r))
                .filter(
                    models.Movimiento.material_id == mov.material_id,
                    models.Movimiento.ubicacion_id == mov.ubicacion_id,
                    models.Movimiento.estado == "ALMACENADO",
                    models.Movimiento.lote_almacen == mov.lote_almacen,
                    models.Movimiento.lote_proveedor == mov.lote_proveedor,
                    models.Movimiento.fecha_vencimiento == mov.fecha_vencimiento,
                )
                .scalar()
                or 0
            )
            disponible = float(disponible)

            if disponible <= 0:
                continue

            tomar = min(disponible, pendiente)
            if tomar <= 0:
                continue

            pick = models.PickingDetalle(
                reserva=reserva,
                sku=sku,
                texto_breve=det.texto_breve,
                cantidad_requerida=requerida,
                cantidad_sugerida=tomar,
                cantidad_confirmada=0,
                ubicacion=mov.ubicacion.ubicacion if mov.ubicacion else None,
                lote_almacen=mov.lote_almacen,
                lote_proveedor=mov.lote_proveedor,
                fecha_vencimiento=mov.fecha_vencimiento,
                impreso=False,
                confirmado=False,
                despacho_detalle_id=det.id,
            )
            db.add(pick)

            pendiente -= tomar
            lineas_creadas += 1

    db.commit()

    resumen = recalcular_reserva(reserva, db)

    return {
        "mensaje": "Picking generado correctamente",
        "reserva": reserva,
        "total_requerido": resumen["total_requerido"],
        "total_retirado": resumen["total_retirado"],
        "pct_cumplimiento_reserva": resumen["pct_cumplimiento_reserva"],
        "clasificacion_final": resumen["clasificacion_final"],
        "lineas_picking": lineas_creadas,
        "pendiente_reserva": resumen["total_requerido"] - resumen["total_retirado"],
    }


@app.get("/despachos/picking/{reserva}", response_model=List[schemas.PickingDetalleOut])
def ver_picking(reserva: str, db: Session = Depends(get_db)):
    reserva = (reserva or "").strip()
    if not reserva:
        raise HTTPException(status_code=400, detail="Reserva obligatoria")

    rows = db.query(models.PickingDetalle).filter(
        models.PickingDetalle.reserva == reserva
    ).order_by(
        asc(models.PickingDetalle.confirmado),
        asc(models.PickingDetalle.sku),
        asc(models.PickingDetalle.fecha_vencimiento),
        asc(models.PickingDetalle.ubicacion),
        asc(models.PickingDetalle.id),
    ).all()

    return rows


@app.post("/despachos/confirmar-picking/{reserva}")
def confirmar_picking(reserva: str, payload: schemas.PickingConfirmPayload, db: Session = Depends(get_db)):
    reserva = (reserva or "").strip()
    if not reserva:
        raise HTTPException(status_code=400, detail="Reserva obligatoria")

    if not payload.usuario or not payload.usuario.strip():
        raise HTTPException(status_code=400, detail="Usuario obligatorio")

    if not payload.items:
        raise HTTPException(status_code=400, detail="No hay items para confirmar")

    picks = db.query(models.PickingDetalle).filter(
        models.PickingDetalle.reserva == reserva
    ).all()

    if not picks:
        raise HTTPException(status_code=404, detail="No existe picking para esa reserva")

    pick_map = {p.id: p for p in picks}
    total_guardado = 0.0
    lineas_procesadas = 0

    for item in payload.items:
        pick = pick_map.get(item.id)
        if not pick:
            raise HTTPException(status_code=404, detail=f"No existe línea picking ID {item.id}")

        if pick.confirmado:
            continue

        cantidad = float(item.cantidad_confirmada or 0)

        if cantidad < 0:
            raise HTTPException(status_code=400, detail=f"La cantidad no puede ser negativa en línea {item.id}")

        if cantidad > float(pick.cantidad_sugerida or 0):
            raise HTTPException(
                status_code=400,
                detail=f"La cantidad confirmada no puede ser mayor a la sugerida en línea {item.id}"
            )

        material = db.query(models.Material).filter(
            models.Material.codigo == pick.sku
        ).first()
        if not material:
            raise HTTPException(status_code=404, detail=f"No existe material {pick.sku}")

        ubicacion = db.query(models.Ubicacion).filter(
            models.Ubicacion.ubicacion == pick.ubicacion
        ).first()
        if not ubicacion:
            raise HTTPException(status_code=404, detail=f"No existe ubicación {pick.ubicacion}")

        if cantidad > 0:
            disponible = (
                db.query(func.sum(models.Movimiento.cantidad_r))
                .filter(
                    models.Movimiento.material_id == material.id,
                    models.Movimiento.ubicacion_id == ubicacion.id,
                    models.Movimiento.estado == "ALMACENADO",
                    models.Movimiento.lote_almacen == pick.lote_almacen,
                    models.Movimiento.lote_proveedor == pick.lote_proveedor,
                    models.Movimiento.fecha_vencimiento == pick.fecha_vencimiento,
                )
                .scalar()
                or 0
            )
            disponible = float(disponible)

            if cantidad > disponible:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente en línea {item.id}. Disponible: {disponible}"
                )

            mov = models.Movimiento(
                fecha=datetime.utcnow(),
                usuario=payload.usuario.strip(),
                documento=reserva,
                codigo_cita=reserva,
                proveedor=None,
                remesa=None,
                orden_compra=reserva,
                um=None,
                umb=None,
                material_id=material.id,
                ubicacion_id=ubicacion.id,
                estado="ALMACENADO",
                lote_almacen=pick.lote_almacen,
                lote_proveedor=pick.lote_proveedor,
                fecha_fabricacion=None,
                fecha_vencimiento=pick.fecha_vencimiento,
                cantidad_r=(-1 * cantidad),
            )
            db.add(mov)

            total_guardado += cantidad

        pick.cantidad_confirmada = cantidad
        pick.confirmado = True
        lineas_procesadas += 1

    db.commit()

    resumen = recalcular_reserva(reserva, db)

    return {
        "mensaje": "Picking confirmado correctamente",
        "reserva": reserva,
        "lineas_procesadas": lineas_procesadas,
        "total_guardado": total_guardado,
        **resumen
    }


@app.post("/despachos/marcar-impreso/{reserva}")
def marcar_picking_impreso(reserva: str, db: Session = Depends(get_db)):
    reserva = (reserva or "").strip()
    if not reserva:
        raise HTTPException(status_code=400, detail="Reserva obligatoria")

    picks = db.query(models.PickingDetalle).filter(
        models.PickingDetalle.reserva == reserva,
        models.PickingDetalle.confirmado == False
    ).all()

    if not picks:
        raise HTTPException(status_code=404, detail="No existe picking pendiente para esa reserva")

    for p in picks:
        p.impreso = True

    db.commit()

    return {"mensaje": "Picking marcado como impreso", "reserva": reserva}