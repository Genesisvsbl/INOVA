from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List


# ==============================
# MATERIAL
# ==============================

class MaterialBase(BaseModel):
    codigo: str
    descripcion: str
    unidad: Optional[float] = None
    unidad_medida: str
    familia: Optional[str] = None


class MaterialCreate(MaterialBase):
    pass


class MaterialResponse(MaterialBase):
    id: int

    class Config:
        from_attributes = True


# ==============================
# UBICACION
# ==============================

class UbicacionBase(BaseModel):
    ubicacion: str
    ubicacion_base: Optional[str] = None
    posicion: Optional[str] = None
    zona: Optional[str] = None
    familias: Optional[str] = None
    bodega: Optional[str] = None


class UbicacionCreate(BaseModel):
    ubicacion: str
    ubicacion_base: Optional[str] = None
    posicion: Optional[str] = None
    zona: Optional[str] = None
    familias: Optional[str] = None
    bodega: Optional[str] = None


class UbicacionResponse(UbicacionBase):
    id: int

    class Config:
        from_attributes = True


# ==============================
# MOVIMIENTO
# ==============================

class MovimientoCreate(BaseModel):
    fecha: datetime
    usuario: str
    documento: Optional[str] = None
    codigo_cita: Optional[str] = None

    proveedor: Optional[str] = None
    remesa: Optional[str] = None
    orden_compra: Optional[str] = None
    um: Optional[str] = None
    umb: Optional[str] = None

    codigo_material: str
    codigo_ubicacion: Optional[str] = None
    estado: Optional[str] = "ALMACENADO"

    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_fabricacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None

    cantidad_r: float


class MovimientoResponse(BaseModel):
    id: int
    fecha: datetime
    usuario: str
    documento: Optional[str] = None
    codigo_cita: Optional[str] = None

    proveedor: Optional[str] = None
    remesa: Optional[str] = None
    orden_compra: Optional[str] = None
    um: Optional[str] = None
    umb: Optional[str] = None

    estado: str
    cantidad_r: float
    material: MaterialResponse
    ubicacion: Optional[UbicacionResponse] = None

    class Config:
        from_attributes = True


# ==============================
# PROVEEDOR
# ==============================

class ProveedorCreate(BaseModel):
    nombre: str
    acreedor: str


class ProveedorOut(BaseModel):
    id: int
    nombre: str
    acreedor: str

    class Config:
        from_attributes = True


# ==============================
# MOVIMIENTOS BULK
# ==============================

class MovimientoBulkItem(BaseModel):
    fecha: datetime
    usuario: str
    documento: Optional[str] = None
    codigo_cita: Optional[str] = None

    proveedor: Optional[str] = None
    remesa: Optional[str] = None
    orden_compra: Optional[str] = None
    um: Optional[str] = None
    umb: Optional[str] = None

    codigo_material: str
    codigo_ubicacion: Optional[str] = None

    estado: Optional[str] = "ALMACENADO"

    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_fabricacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None

    cantidad_r: float


class MovimientoBulkCreate(BaseModel):
    items: List[MovimientoBulkItem]


# ==============================
# MOTOR
# ==============================

class MotorRowResponse(BaseModel):
    id: int
    fecha: datetime
    tipo: str
    usuario: str
    documento: Optional[str] = None
    codigo_cita: Optional[str] = None

    proveedor: Optional[str] = None
    remesa: Optional[str] = None
    orden_compra: Optional[str] = None

    sku: str
    um: Optional[str] = None
    umb: Optional[str] = None

    codigo_material: str
    descripcion_material: str
    unidad_medida: str
    familia: Optional[str] = None

    estado: str
    ubicacion: str
    ubicacion_base: Optional[str] = None
    posicion: Optional[str] = None
    zona: Optional[str] = None
    familias: Optional[str] = None
    bodega: Optional[str] = None

    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_fabricacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None

    cantidad: float

    class Config:
        from_attributes = True


# ==============================
# EN TRANSITO
# ==============================

class EnTransitoRowResponse(BaseModel):
    id: int
    fecha: datetime
    usuario: str
    documento: Optional[str] = None
    codigo_cita: Optional[str] = None

    proveedor: Optional[str] = None
    remesa: Optional[str] = None
    orden_compra: Optional[str] = None

    codigo_material: str
    descripcion_material: str
    unidad_medida: str
    familia: Optional[str] = None

    um: Optional[str] = None
    umb: Optional[str] = None

    estado: str

    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_fabricacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None

    cantidad: float

    class Config:
        from_attributes = True


class AsignarUbicacionPayload(BaseModel):
    codigo_ubicacion: str


# ==============================
# ROTULOS
# ==============================

class RotuloCreate(BaseModel):
    codigo_cita: str
    impresion: str

    fecha_recepcion: Optional[date] = None
    numero_semana: Optional[str] = None

    proveedor: Optional[str] = None
    documento: Optional[str] = None
    remesa: Optional[str] = None
    orden_compra: Optional[str] = None

    cantidad: Optional[float] = None
    sku: Optional[str] = None

    texto_breve: Optional[str] = None

    um: Optional[str] = None
    umb: Optional[str] = None

    fecha_fabricacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None

    lote_proveedor: Optional[str] = None
    lote_almacen: Optional[str] = None

    class Config:
        from_attributes = True


class RotuloOut(RotuloCreate):
    id: int

    class Config:
        from_attributes = True


class RotuloBulkItem(RotuloCreate):
    pass


class RotuloBulkCreate(BaseModel):
    items: List[RotuloBulkItem]


# ==============================
# DESPACHO
# ==============================

class DespachoDetalleOut(BaseModel):
    id: int
    carga_id: int
    fecha_necesidad: Optional[date] = None
    reserva: str
    sku: str
    texto_breve: Optional[str] = None
    cantidad: float
    cantidad_retirada: float
    diferencia: float
    lineas_usadas: int
    pct_cumplimiento_sku: float
    pct_cumplimiento_reserva: float
    clasificacion_sku: str
    clasificacion_final: str

    estado_operativo: Optional[str] = "ABIERTA"
    cerrada: Optional[bool] = False
    fecha_cierre: Optional[datetime] = None

    class Config:
        from_attributes = True


class PickingDetalleOut(BaseModel):
    id: int
    reserva: str
    sku: str
    texto_breve: Optional[str] = None

    cantidad_requerida: float
    cantidad_sugerida: float
    cantidad_confirmada: float

    ubicacion: Optional[str] = None
    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_vencimiento: Optional[date] = None

    impreso: bool
    confirmado: bool

    class Config:
        from_attributes = True


class DespachoCargaOut(BaseModel):
    id: int
    fecha_carga: datetime
    archivo_nombre: str

    class Config:
        from_attributes = True


class PickingConfirmItem(BaseModel):
    id: int
    cantidad_confirmada: float


class PickingConfirmPayload(BaseModel):
    usuario: str
    documento: Optional[str] = None
    items: List[PickingConfirmItem]