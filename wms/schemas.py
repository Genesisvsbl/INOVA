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
    cantidad_disponible: Optional[float] = 0

    ubicacion: Optional[str] = None
    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_vencimiento: Optional[date] = None

    impreso: bool
    confirmado: bool

    motivo_rotacion: Optional[str] = None
    ubicacion_alternativa: Optional[str] = None
    lote_almacen_alternativo: Optional[str] = None
    lote_proveedor_alternativo: Optional[str] = None
    fecha_vencimiento_alternativa: Optional[date] = None

    class Config:
        from_attributes = True


class DespachoCargaOut(BaseModel):
    id: int
    fecha_carga: datetime
    archivo_nombre: str

    class Config:
        from_attributes = True


class PickingAlternativaOut(BaseModel):
    ubicacion: Optional[str] = None
    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_vencimiento: Optional[date] = None
    cantidad_disponible: float


class PickingAlternativasResponse(BaseModel):
    pick_id: int
    reserva: str
    sku: str
    ubicacion_actual: Optional[str] = None
    lote_almacen_actual: Optional[str] = None
    lote_proveedor_actual: Optional[str] = None
    fecha_vencimiento_actual: Optional[date] = None
    alternativas: List[PickingAlternativaOut] = []


class PickingConfirmItem(BaseModel):
    id: Optional[int] = None
    cantidad_confirmada: float

    usar_alternativa: Optional[bool] = False
    motivo_rotacion: Optional[str] = None
    ubicacion_alternativa: Optional[str] = None
    lote_almacen_alternativo: Optional[str] = None
    lote_proveedor_alternativo: Optional[str] = None
    fecha_vencimiento_alternativa: Optional[date] = None

    manual: Optional[bool] = False
    sku: Optional[str] = None
    texto_breve: Optional[str] = None
    reserva: Optional[str] = None
    ubicacion: Optional[str] = None
    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_vencimiento: Optional[date] = None


class PickingConfirmPayload(BaseModel):
    usuario: str
    documento: Optional[str] = None
    items: List[PickingConfirmItem]


class SkuManualSuggestionOut(BaseModel):
    sku: str
    texto_breve: Optional[str] = None
    familia: Optional[str] = None
    unidad_medida: Optional[str] = None
    ubicacion: Optional[str] = None
    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_vencimiento: Optional[date] = None
    cantidad_disponible: float


class SkuManualSuggestionResponse(BaseModel):
    items: List[SkuManualSuggestionOut]


# =========================================================
# INVENTARIOS
# =========================================================

class InventarioTareaCreate(BaseModel):
    tipo_conteo: str
    zona: Optional[str] = None
    familia: Optional[str] = None
    codigo_material: Optional[str] = None
    asignado_a: str
    creado_por: str
    observacion: Optional[str] = None


class InventarioTareaDetalleOut(BaseModel):
    id: int
    tarea_id: int

    ubicacion_id: Optional[int] = None
    material_id: Optional[int] = None

    ubicacion: Optional[str] = None
    ubicacion_base: Optional[str] = None
    posicion: Optional[str] = None
    zona: Optional[str] = None
    bodega: Optional[str] = None

    codigo_material: str
    descripcion_material: Optional[str] = None
    familia: Optional[str] = None
    unidad_medida: Optional[str] = None

    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_vencimiento: Optional[date] = None

    cantidad_sistema: float
    cantidad_contada: Optional[float] = None
    diferencia: Optional[float] = None

    coincide: Optional[bool] = None
    contado: bool
    observacion: Optional[str] = None

    class Config:
        from_attributes = True


class InventarioTareaOut(BaseModel):
    id: int

    tipo_conteo: str
    criterio: str
    zona: Optional[str] = None
    familia: Optional[str] = None
    codigo_material: Optional[str] = None

    asignado_a: str
    creado_por: str
    observacion: Optional[str] = None

    estado: str
    es_reconteo: bool
    tarea_origen_id: Optional[int] = None

    fecha_creacion: datetime
    fecha_inicio: Optional[datetime] = None
    fecha_finalizacion: Optional[datetime] = None
    fecha_conciliacion: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None

    total_lineas: int
    total_coinciden: int
    total_no_coinciden: int
    porcentaje_exactitud: float

    class Config:
        from_attributes = True


class InventarioTareaConDetalleOut(InventarioTareaOut):
    detalles: List[InventarioTareaDetalleOut] = []


class InventarioConteoCiegoDetalleOut(BaseModel):
    id: int
    tarea_id: int

    ubicacion: Optional[str] = None
    ubicacion_base: Optional[str] = None
    posicion: Optional[str] = None
    zona: Optional[str] = None
    bodega: Optional[str] = None

    codigo_material: str
    descripcion_material: Optional[str] = None
    familia: Optional[str] = None
    unidad_medida: Optional[str] = None

    lote_almacen: Optional[str] = None
    lote_proveedor: Optional[str] = None
    fecha_vencimiento: Optional[date] = None

    cantidad_contada: Optional[float] = None
    contado: bool
    observacion: Optional[str] = None

    class Config:
        from_attributes = True


class InventarioConteoItem(BaseModel):
    detalle_id: int
    cantidad_contada: float
    observacion: Optional[str] = None


class InventarioRegistrarConteoPayload(BaseModel):
    usuario: str
    items: List[InventarioConteoItem]


class InventarioFinalizarPayload(BaseModel):
    usuario: str
    asignado_a_reconteo: Optional[str] = None


class InventarioInformeOut(BaseModel):
    tarea_id: int
    estado: str
    total_lineas: int
    total_coinciden: int
    total_no_coinciden: int
    porcentaje_exactitud: float
    genera_reconteo: bool
    reconteo_tarea_id: Optional[int] = None