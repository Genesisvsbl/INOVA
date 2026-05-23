from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
# =========================================================
# 5S - MODELOS
# =========================================================

class Configuracion5S(Base):
    __tablename__ = "configuracion_5s"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String, unique=True, index=True, nullable=False)
    valor = Column(String, nullable=True)
    fecha_actualizacion = Column(DateTime, nullable=True)


class Catalogo5S(Base):
    __tablename__ = "catalogos_5s"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, nullable=False, index=True)
    nombre = Column(String, nullable=False, index=True)
    orden = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, nullable=True)


class Bodega5S(Base):
    __tablename__ = "bodegas_5s"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    puntos = Column(Integer, nullable=False, default=0)
    area = Column(String, nullable=True)
    estado = Column(String, nullable=False, default="Activa", index=True)
    activo = Column(Boolean, nullable=False, default=True)
    meta_bodega = Column(Float, nullable=False, default=90.0)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, nullable=True)


class Responsable5S(Base):
    __tablename__ = "responsables_5s"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True, nullable=False)
    nombre = Column(String, nullable=False)
    cargo = Column(String, nullable=True)
    area = Column(String, nullable=True)
    color = Column(String, nullable=True)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)


class Cronograma5S(Base):
    __tablename__ = "cronograma_5s"

    id = Column(Integer, primary_key=True, index=True)

    bodega = Column(String, nullable=False, index=True)
    responsable = Column(String, nullable=False, index=True)
    actividad = Column(String, nullable=False, default="AuditorÃ­a 5S")

    fecha_inicio = Column(Date, nullable=False, index=True)
    fecha_fin = Column(Date, nullable=False)

    estado = Column(String, nullable=False, default="Programada", index=True)
    prioridad = Column(String, nullable=False, default="Media")

    meta_bodega = Column(Float, nullable=False, default=90.0)
    observacion = Column(String, nullable=True)

    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)


class ChecklistItem5S(Base):
    __tablename__ = "checklist_items_5s"

    id = Column(Integer, primary_key=True, index=True)
    bodega = Column(String, nullable=False, index=True)
    pilar = Column(String, nullable=True, index=True)
    pregunta = Column(String, nullable=False)
    orden = Column(Integer, nullable=False, default=0)
    peso = Column(Float, nullable=False, default=1.0)
    requiere_evidencia = Column(Boolean, nullable=False, default=False)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, nullable=True)


class Inspeccion5S(Base):
    __tablename__ = "inspecciones_5s"

    id = Column(Integer, primary_key=True, index=True)

    fecha = Column(Date, nullable=False, index=True)
    semana = Column(String, nullable=True, index=True)

    responsable = Column(String, nullable=False, index=True)
    area = Column(String, nullable=True)
    bodega = Column(String, nullable=False, index=True)

    cumplimiento = Column(Float, nullable=False, default=0)
    meta_bodega = Column(Float, nullable=False, default=90.0)

    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)

    items = relationship(
        "InspeccionItem5S",
        back_populates="inspeccion",
        cascade="all, delete"
    )


class InspeccionItem5S(Base):
    __tablename__ = "inspeccion_items_5s"

    id = Column(Integer, primary_key=True, index=True)

    inspeccion_id = Column(Integer, ForeignKey("inspecciones_5s.id"), nullable=False, index=True)

    punto = Column(String, nullable=False)
    pilar = Column(String, nullable=True)
    peso = Column(Float, nullable=False, default=1.0)
    cumple = Column(Boolean, nullable=False, default=False)
    severidad = Column(String, nullable=True)
    observacion = Column(String, nullable=True)

    inspeccion = relationship("Inspeccion5S", back_populates="items")
    evidencias = relationship(
        "Evidencia5S",
        back_populates="item",
        cascade="all, delete"
    )


class Evidencia5S(Base):
    __tablename__ = "evidencias_5s"

    id = Column(Integer, primary_key=True, index=True)

    item_id = Column(Integer, ForeignKey("inspeccion_items_5s.id"), nullable=False, index=True)

    nombre_archivo = Column(String, nullable=True)
    url = Column(String, nullable=True)

    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)

    item = relationship("InspeccionItem5S", back_populates="evidencias")
