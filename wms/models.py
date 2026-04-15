from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Material(Base):
    __tablename__ = "materiales"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True, nullable=False)
    descripcion = Column(String, nullable=False)
    unidad = Column(Float, nullable=True)
    unidad_medida = Column(String, nullable=False)
    familia = Column(String)

    movimientos = relationship("Movimiento", back_populates="material", cascade="all, delete")
    inventario_detalles = relationship("InventarioTareaDetalle", back_populates="material")


class Ubicacion(Base):
    __tablename__ = "ubicaciones"

    id = Column(Integer, primary_key=True, index=True)

    ubicacion = Column(String, unique=True, index=True, nullable=False)
    ubicacion_base = Column(String, index=True, nullable=True)
    posicion = Column(String, index=True, nullable=True)

    zona = Column(String)
    familias = Column(String)
    bodega = Column(String)

    movimientos = relationship("Movimiento", back_populates="ubicacion", cascade="all, delete")
    inventario_detalles = relationship("InventarioTareaDetalle", back_populates="ubicacion_rel")


class Movimiento(Base):
    __tablename__ = "movimientos"

    id = Column(Integer, primary_key=True, index=True)

    fecha = Column(DateTime, nullable=False)
    usuario = Column(String, nullable=False)
    documento = Column(String)

    codigo_cita = Column(String, index=True)

    proveedor = Column(String)
    remesa = Column(String)
    orden_compra = Column(String)
    um = Column(String)
    umb = Column(String)

    material_id = Column(Integer, ForeignKey("materiales.id"), nullable=False)
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)

    estado = Column(String, nullable=False, default="ALMACENADO", index=True)

    lote_almacen = Column(String)
    lote_proveedor = Column(String)
    fecha_fabricacion = Column(Date)
    fecha_vencimiento = Column(Date)

    cantidad_r = Column(Float, nullable=False)

    material = relationship("Material", back_populates="movimientos")
    ubicacion = relationship("Ubicacion", back_populates="movimientos")


class Proveedor(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False, unique=True, index=True)
    acreedor = Column(String, nullable=False)


class Rotulo(Base):
    __tablename__ = "rotulos"

    id = Column(Integer, primary_key=True, index=True)

    codigo_cita = Column(String, index=True, nullable=False)
    impresion = Column(String, index=True, nullable=False)

    fecha_recepcion = Column(Date, nullable=False)
    numero_semana = Column(String)

    proveedor = Column(String)
    documento = Column(String)
    remesa = Column(String)
    orden_compra = Column(String)

    cantidad = Column(Float)
    sku = Column(String)

    texto_breve = Column(String)

    um = Column(String)
    umb = Column(String)

    fecha_fabricacion = Column(Date)
    fecha_vencimiento = Column(Date)

    lote_proveedor = Column(String)
    lote_almacen = Column(String)


class DespachoCarga(Base):
    __tablename__ = "despacho_cargas"

    id = Column(Integer, primary_key=True, index=True)
    fecha_carga = Column(DateTime, nullable=False, default=datetime.utcnow)
    archivo_nombre = Column(String, nullable=False)

    detalles = relationship("DespachoDetalle", back_populates="carga", cascade="all, delete")


class DespachoDetalle(Base):
    __tablename__ = "despacho_detalles"

    id = Column(Integer, primary_key=True, index=True)
    carga_id = Column(Integer, ForeignKey("despacho_cargas.id"), nullable=False)

    fecha_necesidad = Column(Date, nullable=True)
    reserva = Column(String, index=True, nullable=False)
    sku = Column(String, nullable=False)
    texto_breve = Column(String, nullable=True)
    cantidad = Column(Float, nullable=False)

    cantidad_retirada = Column(Float, default=0)
    diferencia = Column(Float, default=0)
    lineas_usadas = Column(Integer, default=0)
    pct_cumplimiento_sku = Column(Float, default=0)
    pct_cumplimiento_reserva = Column(Float, default=0)
    clasificacion_sku = Column(String, default="NO CUMPLIDA")
    clasificacion_final = Column(String, default="NO CUMPLIDA")

    estado_operativo = Column(String, default="ABIERTA", nullable=False)
    cerrada = Column(Boolean, default=False, nullable=False)
    fecha_cierre = Column(DateTime, nullable=True)

    carga = relationship("DespachoCarga", back_populates="detalles")
    picks = relationship("PickingDetalle", back_populates="despacho_detalle", cascade="all, delete")


class PickingDetalle(Base):
    __tablename__ = "picking_detalle"

    id = Column(Integer, primary_key=True, index=True)

    reserva = Column(String, index=True, nullable=False)
    sku = Column(String, index=True, nullable=False)
    texto_breve = Column(String)

    cantidad_requerida = Column(Float, nullable=False)
    cantidad_sugerida = Column(Float, nullable=False, default=0)
    cantidad_confirmada = Column(Float, nullable=False, default=0)

    ubicacion = Column(String)
    lote_almacen = Column(String)
    lote_proveedor = Column(String)
    fecha_vencimiento = Column(Date)

    impreso = Column(Boolean, nullable=False, default=False)
    confirmado = Column(Boolean, nullable=False, default=False)

    # =========================
    # INCUMPLIMIENTO DE ROTACION
    # =========================
    motivo_rotacion = Column(String, nullable=True)
    ubicacion_alternativa = Column(String, nullable=True)
    lote_almacen_alternativo = Column(String, nullable=True)
    lote_proveedor_alternativo = Column(String, nullable=True)
    fecha_vencimiento_alternativa = Column(Date, nullable=True)

    despacho_detalle_id = Column(Integer, ForeignKey("despacho_detalles.id"), nullable=True)
    despacho_detalle = relationship("DespachoDetalle", back_populates="picks")


# =========================================================
# INVENTARIOS
# =========================================================

class InventarioTarea(Base):
    __tablename__ = "inventario_tareas"

    id = Column(Integer, primary_key=True, index=True)

    tipo_conteo = Column(String, nullable=False, index=True)  # zona / familia / material
    criterio = Column(String, nullable=False)                 # valor resumen
    zona = Column(String, nullable=True, index=True)
    familia = Column(String, nullable=True, index=True)
    codigo_material = Column(String, nullable=True, index=True)

    asignado_a = Column(String, nullable=False, index=True)
    creado_por = Column(String, nullable=False)
    observacion = Column(String, nullable=True)

    estado = Column(String, nullable=False, default="PENDIENTE", index=True)
    es_reconteo = Column(Boolean, nullable=False, default=False)
    tarea_origen_id = Column(Integer, ForeignKey("inventario_tareas.id"), nullable=True)

    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_finalizacion = Column(DateTime, nullable=True)
    fecha_conciliacion = Column(DateTime, nullable=True)
    fecha_cierre = Column(DateTime, nullable=True)

    total_lineas = Column(Integer, nullable=False, default=0)
    total_coinciden = Column(Integer, nullable=False, default=0)
    total_no_coinciden = Column(Integer, nullable=False, default=0)
    porcentaje_exactitud = Column(Float, nullable=False, default=0)

    tarea_origen = relationship("InventarioTarea", remote_side=[id])
    detalles = relationship("InventarioTareaDetalle", back_populates="tarea", cascade="all, delete")


class InventarioTareaDetalle(Base):
    __tablename__ = "inventario_tarea_detalles"

    id = Column(Integer, primary_key=True, index=True)

    tarea_id = Column(Integer, ForeignKey("inventario_tareas.id"), nullable=False, index=True)

    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materiales.id"), nullable=True)

    ubicacion = Column(String, nullable=True, index=True)
    ubicacion_base = Column(String, nullable=True)
    posicion = Column(String, nullable=True)
    zona = Column(String, nullable=True, index=True)
    bodega = Column(String, nullable=True)

    codigo_material = Column(String, nullable=False, index=True)
    descripcion_material = Column(String, nullable=True)
    familia = Column(String, nullable=True, index=True)
    unidad_medida = Column(String, nullable=True)

    lote_almacen = Column(String, nullable=True)
    lote_proveedor = Column(String, nullable=True)
    fecha_vencimiento = Column(Date, nullable=True)

    cantidad_sistema = Column(Float, nullable=False, default=0)
    cantidad_contada = Column(Float, nullable=True)
    diferencia = Column(Float, nullable=True)

    coincide = Column(Boolean, nullable=True)
    contado = Column(Boolean, nullable=False, default=False)
    observacion = Column(String, nullable=True)

    tarea = relationship("InventarioTarea", back_populates="detalles")
    ubicacion_rel = relationship("Ubicacion", back_populates="inventario_detalles")
    material = relationship("Material", back_populates="inventario_detalles")