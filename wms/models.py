from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Material(Base):
    __tablename__ = "materiales"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True, nullable=False)
    descripcion = Column(String, nullable=False)
    unidad_medida = Column(String, nullable=False)
    familia = Column(String)

    movimientos = relationship("Movimiento", back_populates="material", cascade="all, delete")


class Ubicacion(Base):
    __tablename__ = "ubicaciones"

    id = Column(Integer, primary_key=True, index=True)
    ubicacion = Column(String, unique=True, index=True, nullable=False)

    zona = Column(String)
    familias = Column(String)
    bodega = Column(String)

    movimientos = relationship("Movimiento", back_populates="ubicacion", cascade="all, delete")


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

    # AHORA PUEDE SER NULL PARA EN TRANSITO
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)

    # NUEVO
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
    __tablename__ = "despachos_carga"

    id = Column(Integer, primary_key=True, index=True)
    fecha_carga = Column(DateTime, nullable=False, default=datetime.utcnow)
    archivo_nombre = Column(String, nullable=False)

    detalles = relationship("DespachoDetalle", back_populates="carga", cascade="all, delete")


class DespachoDetalle(Base):
    __tablename__ = "despachos_detalle"

    id = Column(Integer, primary_key=True, index=True)

    carga_id = Column(Integer, ForeignKey("despachos_carga.id"), nullable=False)

    fecha_necesidad = Column(Date)
    reserva = Column(String, index=True, nullable=False)
    sku = Column(String, index=True, nullable=False)
    texto_breve = Column(String)
    cantidad = Column(Float, nullable=False)

    cantidad_retirada = Column(Float, default=0)
    diferencia = Column(Float, default=0)
    lineas_usadas = Column(Integer, default=0)

    pct_cumplimiento_sku = Column(Float, default=0)
    pct_cumplimiento_reserva = Column(Float, default=0)

    clasificacion_sku = Column(String)
    clasificacion_final = Column(String)

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

    despacho_detalle_id = Column(Integer, ForeignKey("despachos_detalle.id"), nullable=True)
    despacho_detalle = relationship("DespachoDetalle", back_populates="picks")