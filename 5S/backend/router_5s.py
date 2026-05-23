from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc, func, text
from typing import List, Optional
from datetime import datetime
import unicodedata

import models_5s as models
import schemas_5s as schemas
from database import SessionLocal, engine

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_columns():
    with engine.connect() as conn:
        for ddl in [
            "ALTER TABLE checklist_items_5s ADD COLUMN pilar VARCHAR",
            "ALTER TABLE checklist_items_5s ADD COLUMN peso FLOAT NOT NULL DEFAULT 1.0",
            "ALTER TABLE checklist_items_5s ADD COLUMN requiere_evidencia BOOLEAN NOT NULL DEFAULT false",
            "ALTER TABLE inspeccion_items_5s ADD COLUMN pilar VARCHAR",
            "ALTER TABLE inspeccion_items_5s ADD COLUMN peso FLOAT NOT NULL DEFAULT 1.0",
        ]:
            try:
                conn.execute(text(ddl))
            except Exception:
                pass

        try:
            conn.commit()
        except Exception:
            pass
# =========================================================
# 5S - CONFIGURACION BASE
# =========================================================

CATALOG_TYPES_5S = [
    {"tipo": "estado_bodega", "nombre": "Estados de bodega"},
    {"tipo": "estado_cronograma", "nombre": "Estados de cronograma"},
    {"tipo": "prioridad_cronograma", "nombre": "Prioridades de cronograma"},
    {"tipo": "severidad", "nombre": "Severidades"},
    {"tipo": "pilar", "nombre": "Pilares 5S"},
]


def catalog_type_5s(tipo: Optional[str]) -> str:
    tipo_limpio = (tipo or "").strip()
    tipos_validos = {item["tipo"] for item in CATALOG_TYPES_5S}
    if tipo_limpio not in tipos_validos:
        raise HTTPException(status_code=400, detail="Tipo de catÃ¡logo 5S invÃ¡lido")
    return tipo_limpio


def parse_float_5s(value, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def get_configuracion_5s(db: Session, clave: str, default: float = 0.0) -> float:
    row = db.query(models.Configuracion5S).filter(
        models.Configuracion5S.clave == clave
    ).first()
    return parse_float_5s(row.valor if row else None, default)


def set_configuracion_5s(db: Session, clave: str, valor) -> models.Configuracion5S:
    row = db.query(models.Configuracion5S).filter(
        models.Configuracion5S.clave == clave
    ).first()

    if not row:
        row = models.Configuracion5S(clave=clave)
        db.add(row)

    row.valor = "" if valor is None else str(valor)
    row.fecha_actualizacion = datetime.utcnow()
    return row


def catalogos_5s(db: Session, tipo: str, active_only: bool = True):
    tipo = catalog_type_5s(tipo)
    query = db.query(models.Catalogo5S).filter(models.Catalogo5S.tipo == tipo)

    if active_only:
        query = query.filter(models.Catalogo5S.activo == True)

    return query.order_by(asc(models.Catalogo5S.orden), asc(models.Catalogo5S.nombre)).all()


def valores_catalogo_5s(db: Session, tipo: str, active_only: bool = True) -> List[str]:
    return [item.nombre for item in catalogos_5s(db, tipo, active_only)]


def validar_valor_catalogo_5s(db: Session, tipo: str, valor: Optional[str]) -> str:
    valor_limpio = (valor or "").strip()

    if not valor_limpio:
        raise HTTPException(status_code=400, detail="Valor de catÃ¡logo obligatorio")

    existe = db.query(models.Catalogo5S).filter(
        models.Catalogo5S.tipo == catalog_type_5s(tipo),
        func.lower(models.Catalogo5S.nombre) == valor_limpio.lower(),
        models.Catalogo5S.activo == True,
    ).first()

    if not existe:
        raise HTTPException(status_code=400, detail=f"{valor_limpio} no estÃ¡ configurado en catÃ¡logo 5S")

    return existe.nombre


def normalizar_estado_bodega_5s(db: Session, estado: Optional[str]) -> str:
    return validar_valor_catalogo_5s(db, "estado_bodega", estado)


def bodega_5s_activa_por_estado(estado: Optional[str]) -> bool:
    return not (estado or "").strip().lower().startswith("inact")


def validar_nombre_bodega_5s(nombre: Optional[str]) -> str:
    nombre_limpio = (nombre or "").strip()
    if not nombre_limpio:
        raise HTTPException(status_code=400, detail="Nombre de bodega obligatorio")
    return nombre_limpio


def obtener_bodega_5s_por_nombre(
    db: Session,
    nombre: str,
    solo_activa: bool = True,
):
    nombre_limpio = validar_nombre_bodega_5s(nombre)
    query = db.query(models.Bodega5S).filter(
        func.lower(models.Bodega5S.nombre) == nombre_limpio.lower()
    )
    if solo_activa:
        query = query.filter(models.Bodega5S.activo == True)
    return query.first()


def slugify_5s(value: str):
    text = str(value or "").strip().lower()
    replacements = {
        "Ã¡": "a",
        "Ã©": "e",
        "Ã­": "i",
        "Ã³": "o",
        "Ãº": "u",
        "Ã±": "n",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    clean = []
    for ch in text:
        if ch.isalnum():
            clean.append(ch)
        elif ch in [" ", "-", "_"]:
            clean.append("_")

    result = "".join(clean)
    while "__" in result:
        result = result.replace("__", "_")

    return result.strip("_") or datetime.utcnow().strftime("item_%Y%m%d_%H%M%S")


def semana_5s(fecha_ref):
    if isinstance(fecha_ref, datetime):
        ref = fecha_ref.date()
    else:
        ref = fecha_ref

    year, week_num, _ = ref.isocalendar()
    return f"Semana_{week_num:02d}_{year}"


def estado_cumplimiento_5s(valor: float, meta: float = 0.0):
    if meta <= 0:
        return "Sin meta"
    if valor >= meta:
        return "Excelente"
    if valor > 0:
        return "AtenciÃ³n"
    return "CrÃ­tico"


# =========================================================
# 5S - CONFIG
# =========================================================

@router.get("/api/5s/config")
def obtener_config_5s(db: Session = Depends(get_db)):
    bodegas = db.query(models.Bodega5S).order_by(asc(models.Bodega5S.nombre)).all()
    catalogos = db.query(models.Catalogo5S).order_by(
        asc(models.Catalogo5S.tipo),
        asc(models.Catalogo5S.orden),
        asc(models.Catalogo5S.nombre),
    ).all()

    return {
        "meta_bodega": get_configuracion_5s(db, "meta_bodega", 0),
        "meta_general": get_configuracion_5s(db, "meta_general", 0),
        "bodegas": bodegas,
        "catalog_types": CATALOG_TYPES_5S,
        "catalogos": catalogos,
        "estados_bodega": valores_catalogo_5s(db, "estado_bodega"),
        "estados_cronograma": valores_catalogo_5s(db, "estado_cronograma"),
        "prioridades_cronograma": valores_catalogo_5s(db, "prioridad_cronograma"),
        "severidades": valores_catalogo_5s(db, "severidad"),
        "pilares": valores_catalogo_5s(db, "pilar"),
    }


@router.put("/api/5s/config")
def actualizar_config_5s(
    payload: schemas.Configuracion5SUpdate,
    db: Session = Depends(get_db),
):
    if payload.meta_bodega is not None:
        set_configuracion_5s(db, "meta_bodega", payload.meta_bodega)

    if payload.meta_general is not None:
        set_configuracion_5s(db, "meta_general", payload.meta_general)

    db.commit()
    return obtener_config_5s(db)


@router.get("/api/5s/catalogos", response_model=List[schemas.Catalogo5SOut])
def listar_catalogos_5s(
    tipo: Optional[str] = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.Catalogo5S)

    if tipo and tipo.strip():
        query = query.filter(models.Catalogo5S.tipo == catalog_type_5s(tipo))

    if active_only:
        query = query.filter(models.Catalogo5S.activo == True)

    return query.order_by(
        asc(models.Catalogo5S.tipo),
        asc(models.Catalogo5S.orden),
        asc(models.Catalogo5S.nombre),
    ).all()


@router.post("/api/5s/catalogos", response_model=schemas.Catalogo5SOut)
def crear_catalogo_5s(
    payload: schemas.Catalogo5SCreate,
    db: Session = Depends(get_db),
):
    tipo = catalog_type_5s(payload.tipo)
    nombre = (payload.nombre or "").strip()

    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre de catÃ¡logo obligatorio")

    existe = db.query(models.Catalogo5S).filter(
        models.Catalogo5S.tipo == tipo,
        func.lower(models.Catalogo5S.nombre) == nombre.lower(),
    ).first()

    if existe:
        raise HTTPException(status_code=400, detail="El valor de catÃ¡logo ya existe")

    item = models.Catalogo5S(
        tipo=tipo,
        nombre=nombre,
        orden=max(0, int(payload.orden or 0)),
        activo=True if payload.activo is None else bool(payload.activo),
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.put("/api/5s/catalogos/{catalogo_id}", response_model=schemas.Catalogo5SOut)
def actualizar_catalogo_5s(
    catalogo_id: int,
    payload: schemas.Catalogo5SCreate,
    db: Session = Depends(get_db),
):
    item = db.query(models.Catalogo5S).filter(
        models.Catalogo5S.id == catalogo_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="CatÃ¡logo no encontrado")

    tipo = catalog_type_5s(payload.tipo)
    nombre = (payload.nombre or "").strip()

    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre de catÃ¡logo obligatorio")

    existe = db.query(models.Catalogo5S).filter(
        models.Catalogo5S.tipo == tipo,
        func.lower(models.Catalogo5S.nombre) == nombre.lower(),
        models.Catalogo5S.id != catalogo_id,
    ).first()

    if existe:
        raise HTTPException(status_code=400, detail="El valor de catÃ¡logo ya existe")

    item.tipo = tipo
    item.nombre = nombre
    item.orden = max(0, int(payload.orden or 0))
    item.activo = True if payload.activo is None else bool(payload.activo)
    item.fecha_actualizacion = datetime.utcnow()

    db.commit()
    db.refresh(item)

    return item


@router.delete("/api/5s/catalogos/{catalogo_id}")
def eliminar_catalogo_5s(
    catalogo_id: int,
    db: Session = Depends(get_db),
):
    item = db.query(models.Catalogo5S).filter(
        models.Catalogo5S.id == catalogo_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="CatÃ¡logo no encontrado")

    db.delete(item)
    db.commit()

    return {
        "mensaje": "CatÃ¡logo eliminado correctamente",
        "catalogo_id": catalogo_id,
    }


# =========================================================
# 5S - BODEGAS
# =========================================================

@router.get("/api/5s/bodegas", response_model=List[schemas.Bodega5SOut])
def listar_bodegas_5s(
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.Bodega5S)

    if active_only:
        query = query.filter(models.Bodega5S.activo == True)

    return query.order_by(asc(models.Bodega5S.nombre)).all()


@router.post("/api/5s/bodegas", response_model=schemas.Bodega5SOut)
def crear_bodega_5s(
    payload: schemas.Bodega5SCreate,
    db: Session = Depends(get_db),
):
    nombre = validar_nombre_bodega_5s(payload.nombre)

    existe = db.query(models.Bodega5S).filter(
        func.lower(models.Bodega5S.nombre) == nombre.lower()
    ).first()

    if existe:
        raise HTTPException(status_code=400, detail="La bodega ya existe")

    estado = normalizar_estado_bodega_5s(db, payload.estado)
    meta_bodega = payload.meta_bodega
    if meta_bodega is None:
        meta_bodega = get_configuracion_5s(db, "meta_bodega", 0)

    bodega = models.Bodega5S(
        nombre=nombre,
        puntos=max(0, int(payload.puntos or 0)),
        area=(payload.area or "").strip() or None,
        estado=estado,
        activo=bodega_5s_activa_por_estado(estado),
        meta_bodega=float(meta_bodega or 0),
    )

    db.add(bodega)
    db.commit()
    db.refresh(bodega)

    return bodega


@router.put("/api/5s/bodegas/{bodega_id}", response_model=schemas.Bodega5SOut)
def actualizar_bodega_5s(
    bodega_id: int,
    payload: schemas.Bodega5SCreate,
    db: Session = Depends(get_db),
):
    bodega = db.query(models.Bodega5S).filter(
        models.Bodega5S.id == bodega_id
    ).first()

    if not bodega:
        raise HTTPException(status_code=404, detail="Bodega no encontrada")

    nombre = validar_nombre_bodega_5s(payload.nombre)

    existe = db.query(models.Bodega5S).filter(
        func.lower(models.Bodega5S.nombre) == nombre.lower(),
        models.Bodega5S.id != bodega_id,
    ).first()

    if existe:
        raise HTTPException(status_code=400, detail="La bodega ya existe")

    estado = normalizar_estado_bodega_5s(db, payload.estado)
    meta_bodega = payload.meta_bodega
    if meta_bodega is None:
        meta_bodega = get_configuracion_5s(db, "meta_bodega", 0)

    bodega.nombre = nombre
    bodega.puntos = max(0, int(payload.puntos or 0))
    bodega.area = (payload.area or "").strip() or None
    bodega.estado = estado
    bodega.activo = bodega_5s_activa_por_estado(estado)
    bodega.meta_bodega = float(meta_bodega or 0)
    bodega.fecha_actualizacion = datetime.utcnow()

    db.commit()
    db.refresh(bodega)

    return bodega


@router.delete("/api/5s/bodegas/{bodega_id}")
def eliminar_bodega_5s(
    bodega_id: int,
    db: Session = Depends(get_db),
):
    bodega = db.query(models.Bodega5S).filter(
        models.Bodega5S.id == bodega_id
    ).first()

    if not bodega:
        raise HTTPException(status_code=404, detail="Bodega no encontrada")

    db.delete(bodega)
    db.commit()

    return {
        "mensaje": "Bodega eliminada correctamente",
        "bodega_id": bodega_id,
    }


# =========================================================
# 5S - RESPONSABLES
# =========================================================

@router.get("/api/5s/responsables", response_model=List[schemas.Responsable5SOut])
def listar_responsables_5s(
    activo: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Responsable5S)

    if activo is not None:
        query = query.filter(models.Responsable5S.activo == activo)

    return query.order_by(asc(models.Responsable5S.nombre)).all()


@router.post("/api/5s/responsables", response_model=schemas.Responsable5SOut)
def crear_responsable_5s(
    payload: schemas.Responsable5SCreate,
    db: Session = Depends(get_db),
):
    nombre = (payload.nombre or "").strip()

    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre obligatorio")

    codigo = slugify_5s(nombre)

    existe = db.query(models.Responsable5S).filter(
        models.Responsable5S.codigo == codigo
    ).first()

    if existe:
        raise HTTPException(status_code=400, detail="El responsable ya existe")

    responsable = models.Responsable5S(
        codigo=codigo,
        nombre=nombre,
        cargo=(payload.cargo or "").strip() or None,
        area=(payload.area or "").strip() or None,
        color=(payload.color or "").strip() or None,
        activo=True if payload.activo is None else bool(payload.activo),
    )

    db.add(responsable)
    db.commit()
    db.refresh(responsable)

    return responsable


@router.put("/api/5s/responsables/{responsable_id}", response_model=schemas.Responsable5SOut)
def actualizar_responsable_5s(
    responsable_id: int,
    payload: schemas.Responsable5SCreate,
    db: Session = Depends(get_db),
):
    responsable = db.query(models.Responsable5S).filter(
        models.Responsable5S.id == responsable_id
    ).first()

    if not responsable:
        raise HTTPException(status_code=404, detail="Responsable no encontrado")

    nombre = (payload.nombre or "").strip()

    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre obligatorio")

    responsable.nombre = nombre
    responsable.cargo = (payload.cargo or "").strip() or None
    responsable.area = (payload.area or "").strip() or None
    responsable.color = (payload.color or "").strip() or None
    responsable.activo = True if payload.activo is None else bool(payload.activo)

    db.commit()
    db.refresh(responsable)

    return responsable


@router.delete("/api/5s/responsables/{responsable_id}")
def desactivar_responsable_5s(
    responsable_id: int,
    db: Session = Depends(get_db),
):
    responsable = db.query(models.Responsable5S).filter(
        models.Responsable5S.id == responsable_id
    ).first()

    if not responsable:
        raise HTTPException(status_code=404, detail="Responsable no encontrado")

    responsable.activo = False

    db.commit()

    return {
        "mensaje": "Responsable desactivado correctamente",
        "responsable_id": responsable_id,
    }


# =========================================================
# 5S - CRONOGRAMA
# =========================================================

@router.get("/api/5s/cronograma", response_model=List[schemas.Cronograma5SOut])
def listar_cronograma_5s(
    estado: Optional[str] = None,
    bodega: Optional[str] = None,
    responsable: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Cronograma5S)

    if estado and estado.strip():
        query = query.filter(models.Cronograma5S.estado == estado.strip())

    if bodega and bodega.strip():
        query = query.filter(models.Cronograma5S.bodega == bodega.strip())

    if responsable and responsable.strip():
        query = query.filter(models.Cronograma5S.responsable == responsable.strip())

    return query.order_by(
        asc(models.Cronograma5S.fecha_inicio),
        asc(models.Cronograma5S.bodega),
    ).all()


@router.post("/api/5s/cronograma", response_model=schemas.Cronograma5SOut)
def crear_cronograma_5s(
    payload: schemas.Cronograma5SCreate,
    db: Session = Depends(get_db),
):
    bodega = (payload.bodega or "").strip()
    responsable = (payload.responsable or "").strip()

    if not bodega:
        raise HTTPException(status_code=400, detail="Bodega obligatoria")

    if not obtener_bodega_5s_por_nombre(db, bodega, solo_activa=True):
        raise HTTPException(status_code=400, detail="Bodega invÃ¡lida o inactiva")

    if not responsable:
        raise HTTPException(status_code=400, detail="Responsable obligatorio")

    actividad = (payload.actividad or "").strip()
    if not actividad:
        raise HTTPException(status_code=400, detail="Actividad obligatoria")

    estado = validar_valor_catalogo_5s(db, "estado_cronograma", payload.estado)
    prioridad = validar_valor_catalogo_5s(db, "prioridad_cronograma", payload.prioridad)
    meta_bodega = payload.meta_bodega
    if meta_bodega is None:
        meta_bodega = get_configuracion_5s(db, "meta_bodega", 0)

    fecha_fin = payload.fecha_fin or payload.fecha_inicio

    if fecha_fin <= payload.fecha_inicio:
        fecha_fin = payload.fecha_inicio + timedelta(days=1)

    item = models.Cronograma5S(
        bodega=bodega,
        responsable=responsable,
        actividad=actividad,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=fecha_fin,
        estado=estado,
        prioridad=prioridad,
        meta_bodega=float(meta_bodega or 0),
        observacion=(payload.observacion or "").strip() or None,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.put("/api/5s/cronograma/{cronograma_id}", response_model=schemas.Cronograma5SOut)
def actualizar_cronograma_5s(
    cronograma_id: int,
    payload: schemas.Cronograma5SCreate,
    db: Session = Depends(get_db),
):
    item = db.query(models.Cronograma5S).filter(
        models.Cronograma5S.id == cronograma_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Cronograma no encontrado")

    fecha_fin = payload.fecha_fin or payload.fecha_inicio

    if fecha_fin <= payload.fecha_inicio:
        fecha_fin = payload.fecha_inicio + timedelta(days=1)

    bodega = (payload.bodega or "").strip()

    if not obtener_bodega_5s_por_nombre(db, bodega, solo_activa=True):
        raise HTTPException(status_code=400, detail="Bodega invÃ¡lida o inactiva")

    actividad = (payload.actividad or "").strip()
    if not actividad:
        raise HTTPException(status_code=400, detail="Actividad obligatoria")

    estado = validar_valor_catalogo_5s(db, "estado_cronograma", payload.estado)
    prioridad = validar_valor_catalogo_5s(db, "prioridad_cronograma", payload.prioridad)
    meta_bodega = payload.meta_bodega
    if meta_bodega is None:
        meta_bodega = get_configuracion_5s(db, "meta_bodega", 0)

    item.bodega = bodega
    item.responsable = payload.responsable.strip()
    item.actividad = actividad
    item.fecha_inicio = payload.fecha_inicio
    item.fecha_fin = fecha_fin
    item.estado = estado
    item.prioridad = prioridad
    item.meta_bodega = float(meta_bodega or 0)
    item.observacion = (payload.observacion or "").strip() or None

    db.commit()
    db.refresh(item)

    return item


@router.delete("/api/5s/cronograma/{cronograma_id}")
def eliminar_cronograma_5s(
    cronograma_id: int,
    db: Session = Depends(get_db),
):
    item = db.query(models.Cronograma5S).filter(
        models.Cronograma5S.id == cronograma_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Cronograma no encontrado")

    db.delete(item)
    db.commit()

    return {
        "mensaje": "Cronograma eliminado correctamente",
        "cronograma_id": cronograma_id,
    }


# =========================================================
# 5S - CHECKLIST POR BODEGA
# =========================================================

@router.get("/api/5s/checklist", response_model=List[schemas.ChecklistItem5SOut])
def listar_checklist_5s(
    bodega: Optional[str] = None,
    pilar: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(models.ChecklistItem5S)

    if bodega and bodega.strip():
        query = query.filter(models.ChecklistItem5S.bodega == bodega.strip())

    if pilar and pilar.strip():
        query = query.filter(models.ChecklistItem5S.pilar == pilar.strip())

    if active_only:
        query = query.filter(models.ChecklistItem5S.activo == True)

    return query.order_by(
        asc(models.ChecklistItem5S.bodega),
        asc(models.ChecklistItem5S.pilar),
        asc(models.ChecklistItem5S.orden),
        asc(models.ChecklistItem5S.id),
    ).all()


@router.post("/api/5s/checklist", response_model=schemas.ChecklistItem5SOut)
def crear_checklist_item_5s(
    payload: schemas.ChecklistItem5SCreate,
    db: Session = Depends(get_db),
):
    bodega = validar_nombre_bodega_5s(payload.bodega)

    if not obtener_bodega_5s_por_nombre(db, bodega, solo_activa=True):
        raise HTTPException(status_code=400, detail="Bodega invÃƒÂ¡lida o inactiva")

    pregunta = (payload.pregunta or "").strip()

    if not pregunta:
        raise HTTPException(status_code=400, detail="Pregunta obligatoria")

    pilar = None
    if payload.pilar and payload.pilar.strip():
        pilar = validar_valor_catalogo_5s(db, "pilar", payload.pilar)

    item = models.ChecklistItem5S(
        bodega=bodega,
        pilar=pilar,
        pregunta=pregunta,
        orden=max(0, int(payload.orden or 0)),
        peso=max(0, float(payload.peso or 1)),
        requiere_evidencia=bool(payload.requiere_evidencia),
        activo=True if payload.activo is None else bool(payload.activo),
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.put("/api/5s/checklist/{item_id}", response_model=schemas.ChecklistItem5SOut)
def actualizar_checklist_item_5s(
    item_id: int,
    payload: schemas.ChecklistItem5SCreate,
    db: Session = Depends(get_db),
):
    item = db.query(models.ChecklistItem5S).filter(
        models.ChecklistItem5S.id == item_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Punto de checklist no encontrado")

    bodega = validar_nombre_bodega_5s(payload.bodega)

    if not obtener_bodega_5s_por_nombre(db, bodega, solo_activa=True):
        raise HTTPException(status_code=400, detail="Bodega invÃƒÂ¡lida o inactiva")

    pregunta = (payload.pregunta or "").strip()

    if not pregunta:
        raise HTTPException(status_code=400, detail="Pregunta obligatoria")

    pilar = None
    if payload.pilar and payload.pilar.strip():
        pilar = validar_valor_catalogo_5s(db, "pilar", payload.pilar)

    item.bodega = bodega
    item.pilar = pilar
    item.pregunta = pregunta
    item.orden = max(0, int(payload.orden or 0))
    item.peso = max(0, float(payload.peso or 1))
    item.requiere_evidencia = bool(payload.requiere_evidencia)
    item.activo = True if payload.activo is None else bool(payload.activo)
    item.fecha_actualizacion = datetime.utcnow()

    db.commit()
    db.refresh(item)

    return item


@router.delete("/api/5s/checklist/{item_id}")
def eliminar_checklist_item_5s(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.query(models.ChecklistItem5S).filter(
        models.ChecklistItem5S.id == item_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Punto de checklist no encontrado")

    db.delete(item)
    db.commit()

    return {
        "mensaje": "Punto de checklist eliminado correctamente",
        "item_id": item_id,
    }


# =========================================================
# 5S - INSPECCIONES
# =========================================================

@router.post("/api/5s/inspecciones", response_model=schemas.Inspeccion5SOut)
def crear_inspeccion_5s(
    payload: schemas.Inspeccion5SCreate,
    db: Session = Depends(get_db),
):
    bodega = (payload.bodega or "").strip()

    if not bodega:
        raise HTTPException(status_code=400, detail="Bodega obligatoria")

    if not obtener_bodega_5s_por_nombre(db, bodega, solo_activa=True):
        raise HTTPException(status_code=400, detail="Bodega invÃ¡lida o inactiva")

    if not payload.items:
        raise HTTPException(status_code=400, detail="Debe enviar puntos evaluados")

    total_peso = sum(max(0, float(item.peso or 1)) for item in payload.items)
    cumplido_peso = sum(
        max(0, float(item.peso or 1))
        for item in payload.items
        if item.cumple
    )
    cumplimiento = round((cumplido_peso / total_peso) * 100, 2) if total_peso > 0 else 0
    meta_bodega = get_configuracion_5s(db, "meta_bodega", 0)

    inspeccion = models.Inspeccion5S(
        fecha=payload.fecha,
        semana=semana_5s(payload.fecha),
        responsable=(payload.responsable or "").strip(),
        area=(payload.area or "").strip() or None,
        bodega=bodega,
        cumplimiento=cumplimiento,
        meta_bodega=meta_bodega,
    )

    db.add(inspeccion)
    db.commit()
    db.refresh(inspeccion)

    for item_payload in payload.items:
        item = models.InspeccionItem5S(
            inspeccion_id=inspeccion.id,
            punto=(item_payload.punto or "").strip(),
            pilar=(item_payload.pilar or "").strip() or None,
            peso=max(0, float(item_payload.peso or 1)),
            cumple=bool(item_payload.cumple),
            severidad=(item_payload.severidad or "").strip() or None,
            observacion=(item_payload.observacion or "").strip() or None,
        )

        db.add(item)
        db.commit()
        db.refresh(item)

        for evidencia_payload in item_payload.evidencias or []:
            evidencia = models.Evidencia5S(
                item_id=item.id,
                nombre_archivo=(evidencia_payload.nombre_archivo or "").strip() or None,
                url=(evidencia_payload.url or "").strip() or None,
            )
            db.add(evidencia)

    db.commit()
    db.refresh(inspeccion)

    return inspeccion


@router.get("/api/5s/inspecciones", response_model=List[schemas.Inspeccion5SOut])
def listar_inspecciones_5s(
    bodega: Optional[str] = None,
    responsable: Optional[str] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Inspeccion5S)

    if bodega and bodega.strip():
        query = query.filter(models.Inspeccion5S.bodega == bodega.strip())

    if responsable and responsable.strip():
        query = query.filter(models.Inspeccion5S.responsable == responsable.strip())

    if fecha_desde is not None:
        query = query.filter(models.Inspeccion5S.fecha >= fecha_desde)

    if fecha_hasta is not None:
        query = query.filter(models.Inspeccion5S.fecha <= fecha_hasta)

    return query.order_by(desc(models.Inspeccion5S.fecha), desc(models.Inspeccion5S.id)).all()


@router.get("/api/5s/inspecciones/{inspeccion_id}", response_model=schemas.Inspeccion5SOut)
def obtener_inspeccion_5s(
    inspeccion_id: int,
    db: Session = Depends(get_db),
):
    inspeccion = db.query(models.Inspeccion5S).filter(
        models.Inspeccion5S.id == inspeccion_id
    ).first()

    if not inspeccion:
        raise HTTPException(status_code=404, detail="InspecciÃ³n no encontrada")

    return inspeccion


@router.delete("/api/5s/inspecciones/{inspeccion_id}")
def eliminar_inspeccion_5s(
    inspeccion_id: int,
    db: Session = Depends(get_db),
):
    inspeccion = db.query(models.Inspeccion5S).filter(
        models.Inspeccion5S.id == inspeccion_id
    ).first()

    if not inspeccion:
        raise HTTPException(status_code=404, detail="InspecciÃ³n no encontrada")

    db.delete(inspeccion)
    db.commit()

    return {
        "mensaje": "InspecciÃ³n eliminada correctamente",
        "inspeccion_id": inspeccion_id,
    }


# =========================================================
# 5S - DASHBOARD
# =========================================================

@router.get("/api/5s/dashboard")
def dashboard_5s(
    db: Session = Depends(get_db),
):
    inspecciones = db.query(models.Inspeccion5S).all()
    meta_bodega = get_configuracion_5s(db, "meta_bodega", 0)
    meta_general = get_configuracion_5s(db, "meta_general", 0)

    total_inspecciones = len(inspecciones)

    promedio_general = 0.0
    if total_inspecciones > 0:
        promedio_general = round(
            sum(float(x.cumplimiento or 0) for x in inspecciones) / total_inspecciones,
            2,
        )

    bajo_meta = len([
        x for x in inspecciones
        if meta_bodega > 0 and float(x.cumplimiento or 0) < meta_bodega
    ])

    bodegas = db.query(models.Bodega5S).order_by(asc(models.Bodega5S.nombre)).all()

    por_bodega = []
    for bodega_db in bodegas:
        registros = [x for x in inspecciones if x.bodega == bodega_db.nombre]
        promedio = 0.0

        if registros:
            promedio = round(
                sum(float(x.cumplimiento or 0) for x in registros) / len(registros),
                2,
            )

        por_bodega.append({
            "bodega": bodega_db.nombre,
            "auditorias": len(registros),
            "cumplimiento": promedio,
            "estado": estado_cumplimiento_5s(promedio, float(bodega_db.meta_bodega or meta_bodega)) if registros else "Sin auditorÃ­a",
            "meta": float(bodega_db.meta_bodega or meta_bodega),
        })

    por_responsable_map = {}

    for inspeccion in inspecciones:
        key = inspeccion.responsable or "Sin responsable"

        if key not in por_responsable_map:
            por_responsable_map[key] = {
                "responsable": key,
                "auditorias": 0,
                "total": 0.0,
            }

        por_responsable_map[key]["auditorias"] += 1
        por_responsable_map[key]["total"] += float(inspeccion.cumplimiento or 0)

    por_responsable = []

    for item in por_responsable_map.values():
        auditorias = item["auditorias"]
        promedio = round(item["total"] / auditorias, 2) if auditorias else 0.0

        por_responsable.append({
            "responsable": item["responsable"],
            "auditorias": auditorias,
            "cumplimiento": promedio,
            "estado": estado_cumplimiento_5s(promedio, meta_bodega),
        })

    por_responsable.sort(key=lambda x: x["cumplimiento"], reverse=True)

    return {
        "meta_bodega": meta_bodega,
        "meta_general": meta_general,
        "promedio_general": promedio_general,
        "estado_general": estado_cumplimiento_5s(promedio_general, meta_general or meta_bodega) if total_inspecciones else "Sin auditorÃ­a",
        "total_inspecciones": total_inspecciones,
        "bodegas_activas": len([b for b in bodegas if b.activo]),
        "bajo_meta": bajo_meta,
        "por_bodega": por_bodega,
        "por_responsable": por_responsable,
    }
