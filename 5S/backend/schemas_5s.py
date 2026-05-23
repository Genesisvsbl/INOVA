from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List
# =========================================================
# 5S - SCHEMAS
# =========================================================

class Configuracion5SUpdate(BaseModel):
    meta_bodega: Optional[float] = None
    meta_general: Optional[float] = None


class Catalogo5SCreate(BaseModel):
    tipo: str
    nombre: str
    orden: Optional[int] = 0
    activo: Optional[bool] = True


class Catalogo5SOut(Catalogo5SCreate):
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True


class Bodega5SCreate(BaseModel):
    nombre: str
    puntos: Optional[int] = 0
    area: Optional[str] = None
    estado: Optional[str] = None
    meta_bodega: Optional[float] = None


class Bodega5SOut(Bodega5SCreate):
    id: int
    activo: bool
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True


class Responsable5SCreate(BaseModel):
    nombre: str
    cargo: Optional[str] = None
    area: Optional[str] = None
    color: Optional[str] = None
    activo: Optional[bool] = True


class Responsable5SOut(Responsable5SCreate):
    id: int
    codigo: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class Cronograma5SCreate(BaseModel):
    bodega: str
    responsable: str
    actividad: Optional[str] = None
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    estado: Optional[str] = None
    prioridad: Optional[str] = None
    meta_bodega: Optional[float] = None
    observacion: Optional[str] = None


class Cronograma5SOut(Cronograma5SCreate):
    id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class ChecklistItem5SCreate(BaseModel):
    bodega: str
    pilar: Optional[str] = None
    pregunta: str
    orden: Optional[int] = 0
    peso: Optional[float] = 1.0
    requiere_evidencia: Optional[bool] = False
    activo: Optional[bool] = True


class ChecklistItem5SOut(ChecklistItem5SCreate):
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True


class Evidencia5SCreate(BaseModel):
    nombre_archivo: Optional[str] = None
    url: Optional[str] = None


class Evidencia5SOut(Evidencia5SCreate):
    id: int
    item_id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class InspeccionItem5SCreate(BaseModel):
    punto: str
    pilar: Optional[str] = None
    peso: Optional[float] = 1.0
    cumple: bool
    severidad: Optional[str] = None
    observacion: Optional[str] = None
    evidencias: Optional[List[Evidencia5SCreate]] = []


class InspeccionItem5SOut(BaseModel):
    id: int
    inspeccion_id: int
    punto: str
    pilar: Optional[str] = None
    peso: Optional[float] = 1.0
    cumple: bool
    severidad: Optional[str] = None
    observacion: Optional[str] = None
    evidencias: List[Evidencia5SOut] = []

    class Config:
        from_attributes = True


class Inspeccion5SCreate(BaseModel):
    fecha: date
    responsable: str
    area: Optional[str] = None
    bodega: str
    items: List[InspeccionItem5SCreate]


class Inspeccion5SOut(BaseModel):
    id: int
    fecha: date
    semana: Optional[str] = None
    responsable: str
    area: Optional[str] = None
    bodega: str
    cumplimiento: float
    meta_bodega: float
    fecha_creacion: datetime
    items: List[InspeccionItem5SOut] = []

    class Config:
        from_attributes = True
