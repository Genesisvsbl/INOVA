import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid3X3,
  Layers3,
  List,
  MapPinned,
  Maximize2,
  PackageCheck,
  PencilLine,
  RefreshCcw,
  Search,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getMovimientosLayoutStock, getUbicaciones } from "../api";

const WMS_PURPLE = "#6d28d9";
const WMS_DEEP = "#1f1148";
const WMS_CYAN = "#22d3ee";

const RACKS = 4;
const MODULES_PER_RACK = 9;
const LEVELS = 6;
const FRONT_POSITIONS = 2;
const DEPTHS = 2;
const SLOT_CAPACITY = RACKS * MODULES_PER_RACK * LEVELS * FRONT_POSITIONS * DEPTHS;
const POSITION_WIDTH = 1.15;
const DEPTH_WIDTH = 1;
const LEVEL_HEIGHT = 0.85;
const POSITION_STEP = 1.3;
const MODULE_WIDTH = FRONT_POSITIONS * POSITION_STEP;
const AISLE_WIDTH = 3.2;
const CENTRAL_RACK_GAP = 0.35;
const RACK_DEPTH = DEPTHS * DEPTH_WIDTH + 0.35;
const BASE_Y = 0.25;
const TOTAL_X = MODULES_PER_RACK * MODULE_WIDTH;
const TOTAL_Z = 4 * RACK_DEPTH + 2 * AISLE_WIDTH + CENTRAL_RACK_GAP;
const CENTER_X = TOTAL_X / 2;
const CENTER_Z = TOTAL_Z / 2;
const RACK_ROW_Z = [-6.725, -1.175, 1.175, 6.725];
const AISLE_Z = [-3.95, 3.95];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function toNumber(value) {
  const numeric = Number(String(value ?? 0).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
}

function cleanZone(value) {
  const match = String(value || "").match(/\d+/);
  return match ? match[0] : "";
}

function locationCode(row) {
  return String(row?.ubicacion || [row?.ubicacion_base, row?.posicion].filter(Boolean).join("") || "").trim();
}

function parseFinalLocationPosition(value) {
  const raw = String(value || "").replace(/\D/g, "");
  const finalNumber = Number(raw);
  const normalized = raw.padStart(2, "0");

  if (raw.length && finalNumber >= 1 && finalNumber <= 8) {
    return {
      depth: finalNumber === 3 || finalNumber === 4 || finalNumber === 7 || finalNumber === 8 ? 2 : 1,
      positionIndex: finalNumber >= 5 ? 2 : 1,
      rackSide: finalNumber % 2 === 0 ? 0 : 1,
      finalPosition: normalized,
    };
  }

  return {
    depth: 1,
    positionIndex: 1,
    rackSide: 0,
    finalPosition: raw || "01",
  };
}

function finalPositionFromSlot(depth, position, rack) {
  const rackNumber = Number(rack) || 1;
  const rackSide = rackNumber === 2 || rackNumber === 4 ? 1 : 0;
  const depthOffset = clamp(Number(depth) || 1, 1, DEPTHS) === 2 ? 2 : 0;
  const positionOffset = clamp(Number(position) || 1, 1, FRONT_POSITIONS) === 2 ? 4 : 0;
  return String(1 + rackSide + depthOffset + positionOffset).padStart(2, "0");
}
function parseLocation(row) {
  const code = locationCode(row);
  const base = cleanZone(row.ubicacion_base || row.zona || code.slice(0, 3));
  const raw = String(row.posicion || code.replace(base, "") || "").replace(/\s/g, "");
  const compact = raw.replace(/[\u00b4`]/g, "'");
  const fullCode = code.replace(/[\u00b4`]/g, "'");
  const wmsMatch = fullCode.match(/^(\d{3})(\d)(\d)(\d)'?(\d+)$/);

  if (wmsMatch) {
    const [, zoneValue, pasilloValue, bloqueValue, nivelValue, finalValue] = wmsMatch;
    const finalSlot = parseFinalLocationPosition(finalValue);
    return {
      base: zoneValue,
      module: Number(bloqueValue),
      level: Number(nivelValue),
      depth: finalSlot.depth,
      positionIndex: finalSlot.positionIndex,
      pasilloCode: clamp(Number(pasilloValue), 1, 2),
      finalPosition: finalSlot.finalPosition,
      rackSide: finalSlot.rackSide,
      position: compact || code.replace(zoneValue, ""),
      parseMode: "wms",
    };
  }

  const match = compact.match(/^(\d{2})(\d)['\u2019]?(\d{1,2})?$/);

  if (match) {
    const finalSlot = parseFinalLocationPosition(match[3] || "02");
    return {
      base,
      module: Number(match[1]),
      level: Number(match[2]),
      depth: finalSlot.depth,
      positionIndex: finalSlot.positionIndex,
      finalPosition: finalSlot.finalPosition,
      rackSide: finalSlot.rackSide,
      position: compact,
      parseMode: "operativo",
    };
  }

  const nums = compact.match(/\d+/g)?.join("") || "0";
  return {
    base,
    module: Number(nums.slice(0, 2) || 0),
    level: Number(nums.slice(2, 3) || 1),
    depth: Number(nums.slice(3, 5) || 1),
    positionIndex: clamp(Number(nums.slice(-1) || 1), 1, FRONT_POSITIONS),
    position: compact || row.posicion || "",
    parseMode: "fallback",
  };
}

function buildStock(movimientos, ubicaciones = []) {
  const map = new Map();
  const ubicacionById = new Map(
    (ubicaciones || []).map((row) => [String(row.id), locationCode(row)])
  );

  (movimientos || []).forEach((row) => {
    const type = normalize(row.tipo);
    const qty = toNumber(row.cantidad);
    const ubicacion = normalize(
      row.ubicacion_final ||
      row.ubicacion ||
      row.ubicacion_codigo ||
      ubicacionById.get(String(row.ubicacion_final_id || "")) ||
      ubicacionById.get(String(row.ubicacion_id || ""))
    );
    if (!ubicacion) return;
    const sign = type.includes("SALIDA") || type.includes("DESPACHO") ? -1 : 1;
    const signedQty = qty * sign;
    const current = map.get(ubicacion) || { qty: 0, lots: new Map() };
    const itemKey = [
      normalize(row.codigo_material || row.sku),
      normalize(row.lote_almacen),
      normalize(row.lote_proveedor),
      String(row.fecha_vencimiento || ""),
      normalize(row.proveedor),
    ].join("|");
    const currentItem = current.lots.get(itemKey) || { ...row, cantidad: 0, cantidad_r: 0 };
    current.qty += signedQty;
    currentItem.cantidad += signedQty;
    currentItem.cantidad_r += signedQty;
    current.lots.set(itemKey, currentItem);
    map.set(ubicacion, current);
  });

  map.forEach((value) => {
    value.items = Array.from(value.lots.values()).filter((item) => toNumber(item.cantidad) > 0);
    delete value.lots;
  });

  return map;
}

function buildCells(ubicaciones, stockMap, zone) {
  return (ubicaciones || [])
    .map((row) => {
      const parsed = parseLocation(row);
      const code = locationCode(row);
      const stockInfo = stockMap.get(normalize(code)) || { qty: 0, items: [] };
      const firstItem = stockInfo.items?.[0] || {};
      return {
        ...row,
        ...parsed,
        code,
        stock: stockInfo.qty || 0,
        stockItems: stockInfo.items || [],
        material: firstItem.codigo_material || firstItem.sku || row.material || "",
        descripcion: firstItem.descripcion_material || row.descripcion || "",
        familia: firstItem.familia || row.familia || row.familias || "",
        proveedor: firstItem.proveedor || row.proveedor || "",
        lote_almacen: firstItem.lote_almacen || row.lote_almacen || "",
        lote_proveedor: firstItem.lote_proveedor || row.lote_proveedor || "",
        fecha_vencimiento: firstItem.fecha_vencimiento || row.fecha_vencimiento || "",
      };
    })
    .filter((row) => cleanZone(row.base) === cleanZone(zone))
    .sort((a, b) => a.module - b.module || b.level - a.level || a.depth - b.depth || a.code.localeCompare(b.code));
}

function enhanceRackData(cells) {
  return cells.map((cell, index) => {
    const slot = index % SLOT_CAPACITY;
    const perRack = MODULES_PER_RACK * LEVELS * FRONT_POSITIONS * DEPTHS;
    const fallbackRack = Math.floor(slot / perRack) + 1;
    const rackSlot = slot % perRack;
    const fallbackModule = Math.floor(rackSlot / (LEVELS * FRONT_POSITIONS * DEPTHS)) + 1;
    const moduleSlot = rackSlot % (LEVELS * FRONT_POSITIONS * DEPTHS);
    const fallbackLevel = Math.floor(moduleSlot / (FRONT_POSITIONS * DEPTHS)) + 1;
    const faceSlot = moduleSlot % (FRONT_POSITIONS * DEPTHS);
    const fallbackDepth = (faceSlot % DEPTHS) + 1;
    const fallbackPosition = Math.floor(faceSlot / DEPTHS) + 1;
    const pasillo = cell.pasilloCode || (fallbackRack <= 2 ? 1 : 2);
    const physicalDepth = clamp(Number(cell.depth) || fallbackDepth, 1, DEPTHS);
    const rackSide = clamp(Number(cell.rackSide ?? (fallbackRack % 2 === 0 ? 1 : 0)), 0, 1);
    const rack = cell.parseMode === "wms"
      ? (pasillo === 2 ? 3 : 1) + rackSide
      : fallbackRack;
    const moduleInRack = clamp(Number(cell.module) || fallbackModule, 1, MODULES_PER_RACK);
    const physicalLevel = clamp(Number(cell.level) || fallbackLevel, 1, LEVELS);
    const physicalPosition = clamp(Number(cell.positionIndex) || fallbackPosition, 1, FRONT_POSITIONS);
    return {
      ...cell,
      rack,
      pasillo,
      moduleInRack,
      physicalLevel,
      physicalPosition,
      physicalDepth,
      rackLabel: `Rack ${rack}`,
      aisleLabel: `Pasillo ${pasillo}`,
    };
  });
}

function groupByModule(cells) {
  const map = new Map();
  cells.forEach((cell) => {
    const key = `${cell.rack || 1}-${cell.moduleInRack || 1}`;
    if (!map.has(key)) {
      map.set(key, { module: cell.moduleInRack || 1, rack: cell.rack || 1, pasillo: cell.pasillo || 1, rows: [] });
    }
    map.get(key).rows.push(cell);
  });
  return Array.from(map.values())
    .sort((a, b) => a.rack - b.rack || a.module - b.module)
    .map((group, index) => ({ ...group, index }));
}

function matchFilter(value, filterValue) {
  if (!filterValue || filterValue === "todos") return true;
  return String(value) === String(filterValue);
}

function aisleForRack(rack) {
  const rackNumber = Number(rack);
  if (!rackNumber) return "1";
  return rackNumber <= 2 ? "1" : "2";
}

function matchAisleFilter(cell, filterValue) {
  if (!filterValue || filterValue === "todos") return true;
  const value = String(filterValue);
  const rackFallback = aisleForRack(cell.rack);
  return String(cell.pasillo) === value || rackFallback === value;
}

function applyLayoutFilters(cells, filters) {
  return cells.filter((cell) => {
    const occupied = Number(cell.stock || 0) > 0;
    const occupancyOk = filters.ocupacion === "todas" || (filters.ocupacion === "ocupadas" && occupied) || (filters.ocupacion === "libres" && !occupied);
    return (
      occupancyOk &&
      matchAisleFilter(cell, filters.pasillo) &&
      matchFilter(cell.rack, filters.rack) &&
      matchFilter(cell.moduleInRack, filters.modulo) &&
      matchFilter(cell.physicalLevel, filters.nivel) &&
      matchFilter(cell.physicalPosition, filters.posicion) &&
      matchFilter(cell.physicalDepth, filters.profundidad)
    );
  });
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => Number(a) - Number(b));
}

const ZONE_LABELS = {
  100: "Recepcion",
  200: "Almacenamiento General",
  300: "Pallet Shuttle + AGV",
  400: "Picking",
  500: "Cuarentena",
  600: "Devoluciones",
  700: "Cross Docking",
  800: "Produccion",
  900: "Materia Prima",
  1000: "Producto Terminado",
  1100: "Refrigerados",
  1200: "Congelados",
  1300: "Alta Rotacion",
  1400: "Baja Rotacion",
  1500: "Quimicos",
  1600: "Inflamables",
  1700: "Herramientas",
  1800: "Oficinas y Servicios",
};

const ZONE_PALETTES = [
  { accent: "#6d28d9", soft: "#f3e8ff", text: "#5b21b6" },
  { accent: "#16a34a", soft: "#dcfce7", text: "#166534" },
  { accent: "#2563eb", soft: "#dbeafe", text: "#1d4ed8" },
  { accent: "#f97316", soft: "#ffedd5", text: "#c2410c" },
  { accent: "#db2777", soft: "#fce7f3", text: "#be185d" },
  { accent: "#0891b2", soft: "#cffafe", text: "#0e7490" },
  { accent: "#ca8a04", soft: "#fef3c7", text: "#a16207" },
];

function zoneKey(row) {
  return cleanZone(row?.ubicacion_base || row?.zona || locationCode(row).slice(0, 3));
}

function zoneName(value) {
  return `Base ${value}`;
}

function zonePalette(value, index) {
  const numeric = Number(value);
  if (numeric === 300) return ZONE_PALETTES[2];
  return ZONE_PALETTES[index % ZONE_PALETTES.length];
}

function zoneIcon(value) {
  const numeric = Number(value);
  if (numeric === 300) return PackageCheck;
  if ([100, 400, 600, 700].includes(numeric)) return Truck;
  if ([500, 1500, 1600].includes(numeric)) return ShieldCheck;
  return Building2;
}

function formatQty(value) {
  return Number(value || 0).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function slotLocationCode(cell, zone = "300") {
  if (cell?.code && !String(cell.code).startsWith("R")) return cell.code;
  const zoneCode = cleanZone(zone) || cleanZone(cell?.base) || "300";
  const pasillo = Number(cell?.pasillo) || (Number(aisleForRack(cell?.rack)));
  const modulo = clamp(Number(cell?.moduleInRack) || 1, 1, MODULES_PER_RACK);
  const nivel = clamp(Number(cell?.physicalLevel) || 1, 1, LEVELS);
  const profundidad = clamp(Number(cell?.physicalDepth) || 1, 1, DEPTHS);
  const posicion = clamp(Number(cell?.physicalPosition) || 1, 1, FRONT_POSITIONS);
  return `${zoneCode}${pasillo}${modulo}${nivel}'${finalPositionFromSlot(profundidad, posicion, cell?.rack)}`;
}

function stockColor(cell, maxStock) {
  if (!cell || Number(cell.stock || 0) <= 0) return 0xff3347;
  return 0x00b894;
}

function createMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.55,
    metalness: options.metalness ?? 0.08,
    transparent: options.opacity !== undefined,
    opacity: options.opacity ?? 1,
  });
}

function createTextSprite(text, color = "#13213b", size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `800 ${size}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  roundRect(ctx, 18, 28, 476, 104, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(109,40,217,0.26)";
  ctx.lineWidth = 4;
  roundRect(ctx, 18, 28, 476, 104, 22);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 82);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  material.depthTest = false;
  material.depthWrite = false;
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 20;
  sprite.scale.set(5.8, 1.8, 1);
  return sprite;
}

function createPlainTextSprite(text, color = "#13213b", size = 44) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `900 ${size}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.strokeText(text, 192, 66);
  ctx.fillStyle = color;
  ctx.fillText(text, 192, 66);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  material.depthTest = false;
  material.depthWrite = false;
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 22;
  sprite.scale.set(1.3, 0.42, 1);
  return sprite;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function addBox(scene, size, position, material, name = "") {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  scene.add(mesh);
  return mesh;
}

function disposeObject(object) {
  object.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    }
  });
}

function hasFocusedLayoutFilter(filters, query) {
  return Boolean(normalize(query)) || Object.entries(filters).some(([key, value]) => {
    const neutral = key === "ocupacion" ? "todas" : "todos";
    return value && value !== neutral;
  });
}

function slotMatchesStructuralFilters(cell, filters, query) {
  if (normalize(query)) return false;
  return (
    matchAisleFilter(cell, filters.pasillo) &&
    matchFilter(cell.rack, filters.rack) &&
    matchFilter(cell.moduleInRack, filters.modulo) &&
    matchFilter(cell.physicalLevel, filters.nivel) &&
    matchFilter(cell.physicalPosition, filters.posicion) &&
    matchFilter(cell.physicalDepth, filters.profundidad)
  );
}

function hasStructuralLayoutFilter(filters, query) {
  return Boolean(normalize(query)) || Object.entries(filters).some(([key, value]) => {
    if (key === "pasillo" || key === "ocupacion") return false;
    const neutral = key === "ocupacion" ? "todas" : "todos";
    return value && value !== neutral;
  });
}

function shouldShowFullStructure(filters, query, showAllStructure) {
  if (filters.rack && filters.rack !== "todos") return false;

  const onlyOccupancyFilter =
    !normalize(query) &&
    filters.ocupacion !== "todas" &&
    Object.entries(filters).every(([key, value]) => {
      const neutral = key === "ocupacion" ? "todas" : "todos";
      return key === "ocupacion" || !value || value === neutral;
    });

  if (onlyOccupancyFilter) return true;
  if (hasStructuralLayoutFilter(filters, query)) return Boolean(showAllStructure);
  return true;
}

function buildStructureScopeCells(filteredCells, filters, query) {
  if (normalize(query)) return filteredCells;

  const rackValues = filters.rack && filters.rack !== "todos"
    ? [Number(filters.rack)]
    : uniqueSorted(filteredCells.map((cell) => String(cell.rack))).map(Number);
  const moduleValues = filters.modulo && filters.modulo !== "todos"
    ? [Number(filters.modulo)]
    : Array.from({ length: MODULES_PER_RACK }, (_, index) => index + 1);
  const levelValues = filters.nivel && filters.nivel !== "todos"
    ? [Number(filters.nivel)]
    : Array.from({ length: LEVELS }, (_, index) => index + 1);

  if (!rackValues.length) return filteredCells;

  return rackValues.flatMap((rack) =>
    moduleValues.flatMap((moduleInRack) =>
      levelValues.flatMap((physicalLevel) =>
        Array.from({ length: DEPTHS }, (_, depthIndex) =>
          Array.from({ length: FRONT_POSITIONS }, (_, positionIndex) => ({
            rack,
            moduleInRack,
            physicalLevel,
            physicalDepth: depthIndex + 1,
            physicalPosition: positionIndex + 1,
          }))
        ).flat()
      )
    )
  );
}

function getLayoutBounds(targetCells) {
  const target = (targetCells || []).length ? targetCells : [];
  if (!target.length) {
    return { center: [0, 2.8, 0], size: [TOTAL_X, BASE_Y + LEVELS * LEVEL_HEIGHT, TOTAL_Z] };
  }
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  target.forEach((cell) => {
    const point = new THREE.Vector3(...slotCenter(cell.rack, cell.moduleInRack, cell.physicalLevel, cell.physicalPosition, cell.physicalDepth));
    min.min(point);
    max.max(point);
  });
  min.add(new THREE.Vector3(-1.4, -0.8, -1.4));
  max.add(new THREE.Vector3(1.4, 1.4, 1.4));
  const center = min.clone().add(max).multiplyScalar(0.5);
  const size = max.clone().sub(min);
  return { center: [center.x, Math.max(1.8, center.y), center.z], size: [size.x, size.y, size.z] };
}

function getFitDistance(size, view = "front") {
  const [sx, sy, sz] = size;
  const widthFit = sx * 0.62;
  const heightFit = sy * 1.25;
  const depthFit = sz * (view === "depth" ? 5.1 : 4.8);
  return Math.max(3.4, widthFit, heightFit, depthFit);
}

function getRackLevelFrameCells(filters, fallbackCells = []) {
  if (filters.rack === "todos" || filters.nivel === "todos" || filters.modulo !== "todos") return fallbackCells;
  const rack = Number(filters.rack);
  const level = Number(filters.nivel);
  return Array.from({ length: MODULES_PER_RACK }, (_, moduleIndex) =>
    Array.from({ length: DEPTHS }, (_, depthIndex) =>
      Array.from({ length: FRONT_POSITIONS }, (_, positionIndex) => ({
        rack,
        pasillo: Number(aisleForRack(rack)),
        moduleInRack: moduleIndex + 1,
        physicalLevel: level,
        physicalDepth: depthIndex + 1,
        physicalPosition: positionIndex + 1,
      }))
    ).flat()
  ).flat();
}

function getOperatorPose(pasillo, step = 4, operatorTarget = "pasillo") {
  const activeAisle = pasillo === "2" ? "2" : "1";
  const aisleZ = activeAisle === "2" ? AISLE_Z[1] : AISLE_Z[0];
  const rackPair = activeAisle === "2" ? [3, 4] : [1, 2];
  const x = moduleXStart(clamp(step + 1, 1, MODULES_PER_RACK)) + MODULE_WIDTH / 2;
  const rack = operatorTarget === "rackB" ? rackPair[1] : rackPair[0];
  const rackCenterZ = rackZStart(rack) + RACK_DEPTH / 2;
  const rackDirection = rackCenterZ >= aisleZ ? 1 : -1;
  const aisleCameraSide = activeAisle === "2" ? 1 : -1;
  return {
    aisle: activeAisle,
    rack,
    x,
    z: aisleZ,
    rackCenterZ,
    rackDirection,
    aisleCameraSide,
    rotation: operatorTarget === "rackB" ? -Math.PI / 2 : Math.PI / 2,
  };
}

function rackTargetForAisle(pasillo, rack) {
  const rackNumber = Number(rack);
  if (!rackNumber) return null;
  const [rackA, rackB] = pasillo === "2" ? [3, 4] : [1, 2];
  if (rackNumber === rackA) return "rackA";
  if (rackNumber === rackB) return "rackB";
  return null;
}

function getLayoutDemoParams() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") !== "walk") return null;
  return {
    pasillo: params.get("pasillo") || "1",
    rack: params.get("rack") || "1",
  };
}

export default function LayoutZona() {
  const demoParams = getLayoutDemoParams();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const meshMapRef = useRef(new Map());
  const [ubicaciones, setUbicaciones] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [zone, setZone] = useState("300");
  const [showZoneDirectory, setShowZoneDirectory] = useState(!demoParams);
  const [zoneSearch, setZoneSearch] = useState("");
  const [zoneDisplay, setZoneDisplay] = useState("grid");
  const [zoneNames, setZoneNames] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem("inova-layout-zone-names") || "{}") || {};
    } catch {
      return {};
    }
  });
  const [zoneNameEditor, setZoneNameEditor] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(demoParams ? "close" : "iso");
  const [filters, setFilters] = useState({
    ocupacion: "todas",
    pasillo: demoParams?.pasillo || "todos",
    rack: demoParams?.rack || "todos",
    modulo: "todos",
    nivel: "todos",
    posicion: "todos",
    profundidad: "todos",
  });
  const [showAllStructure, setShowAllStructure] = useState(!demoParams);
  const [operatorTarget, setOperatorTarget] = useState("pasillo");
  const [operatorStep, setOperatorStep] = useState(0);
  const [rackFace, setRackFace] = useState("front");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterToolboxOpen, setFilterToolboxOpen] = useState(true);
  const [renderExpanded, setRenderExpanded] = useState(false);
  const [layoutLayers, setLayoutLayers] = useState({
    ocupadas: true,
    vacias: true,
    seleccionada: true,
    racks: true,
    niveles: true,
    etiquetas: true,
    resumen: true,
  });
  const canEditZoneNames = useMemo(() => {
    if (typeof window === "undefined") return false;
    const role = normalize(window.sessionStorage.getItem("rol"));
    const permisos = JSON.parse(window.sessionStorage.getItem("permisos") || "[]");
    return (
      window.sessionStorage.getItem("esPlatformAdmin") === "true" ||
      window.sessionStorage.getItem("esSuperAdmin") === "true" ||
      ["SUPER_ADMIN", "ADMIN_INOVA", "INOVA_ADMIN", "ADMIN_PLATAFORMA", "PLATFORM_ADMIN"].includes(role) ||
      role.includes("ADMIN") ||
      permisos.includes("admin.roles.gestionar")
    );
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    let ubicRows = [];
    let movRows = [];

    try {
      ubicRows = await getUbicaciones();
    } catch (err) {
      setError(err?.message || "No se pudieron cargar las ubicaciones del layout.");
    }

    try {
      movRows = await getMovimientosLayoutStock();
    } catch (err) {
      setError("No se pudo cargar la ocupacion del motor, pero el layout queda disponible.");
    }

    setUbicaciones(Array.isArray(ubicRows) ? ubicRows : []);
    setMovimientos(Array.isArray(movRows) ? movRows : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const stockMap = useMemo(() => buildStock(movimientos, ubicaciones), [movimientos, ubicaciones]);
  const zones = useMemo(() => {
    const values = ["300"];
    ubicaciones.forEach((row) => {
      const z = cleanZone(row.ubicacion_base || row.zona || locationCode(row).slice(0, 3));
      if (z) values.push(z);
    });
    return uniqueSorted(values);
  }, [ubicaciones]);
  const zoneCards = useMemo(() => {
    const map = new Map();
    zones.forEach((item) => {
      map.set(String(item), { zone: String(item), count: 0, bodegas: new Set() });
    });
    ubicaciones.forEach((row) => {
      const z = zoneKey(row);
      if (!z) return;
      if (!map.has(z)) map.set(z, { zone: z, count: 0, bodegas: new Set() });
      const current = map.get(z);
      current.count += 1;
      if (row.bodega || row.nombre_bodega || row.zona) current.bodegas.add(row.bodega || row.nombre_bodega || row.zona);
    });
    return Array.from(map.values())
      .sort((a, b) => Number(a.zone) - Number(b.zone))
      .map((item, index) => ({
        ...item,
        name: zoneName(item.zone),
        ready: item.zone === "300",
        palette: zonePalette(item.zone, index),
        Icon: zoneIcon(item.zone),
        displayName: zoneNames[item.zone]?.trim() || "Nombre de bodega pendiente",
        bodega: `Ubicacion base ${item.zone}`,
      }));
  }, [ubicaciones, zones, zoneNames]);
  const zoneDirectorySummary = useMemo(() => {
    const totalLocations = zoneCards.reduce((sum, item) => sum + Number(item.count || 0), 0);
    let occupiedLocations = 0;
    ubicaciones.forEach((row) => {
      const info = stockMap.get(normalize(locationCode(row)));
      if (Number(info?.qty || 0) > 0) occupiedLocations += 1;
    });
    const emptyLocations = Math.max(0, totalLocations - occupiedLocations);
    const occupancyPct = totalLocations ? Math.round((occupiedLocations / totalLocations) * 1000) / 10 : 0;
    return {
      zones: zoneCards.length,
      totalLocations,
      occupiedLocations,
      emptyLocations,
      occupancyPct,
    };
  }, [zoneCards, ubicaciones, stockMap]);

  const filteredZoneCards = useMemo(() => {
    const q = normalize(zoneSearch);
    if (!q) return zoneCards;
    return zoneCards.filter((item) => normalize(`${item.zone} ${item.name} ${item.bodega} ${item.displayName}`).includes(q));
  }, [zoneCards, zoneSearch]);

  const rawCells = useMemo(() => buildCells(ubicaciones, stockMap, zone), [ubicaciones, stockMap, zone]);
  const cells = useMemo(() => enhanceRackData(rawCells), [rawCells]);
  const maxStock = useMemo(() => Math.max(0, ...cells.map((cell) => cell.stock)), [cells]);
  const filterOptions = useMemo(() => ({
    pasillos: uniqueSorted(cells.map((cell) => String(cell.pasillo))),
    racks: uniqueSorted(cells.map((cell) => String(cell.rack))),
    modulos: uniqueSorted(cells.map((cell) => String(cell.moduleInRack))),
    niveles: uniqueSorted(cells.map((cell) => String(cell.physicalLevel))),
    posiciones: uniqueSorted(cells.map((cell) => String(cell.physicalPosition))),
    profundidades: uniqueSorted(cells.map((cell) => String(cell.physicalDepth))),
  }), [cells]);

  const filteredCells = useMemo(() => {
    const q = normalize(query);
    const textFiltered = !q ? cells : cells.filter((cell) =>
      [
        cell.code,
        cell.position,
        cell.zona,
        cell.bodega,
        cell.familia,
        cell.familias,
        cell.rackLabel,
        cell.aisleLabel,
        cell.material,
        cell.descripcion,
        cell.proveedor,
        cell.lote_almacen,
        cell.lote_proveedor,
        cell.fecha_vencimiento,
      ]
        .map(normalize)
        .some((value) => value.includes(q))
    );
    return applyLayoutFilters(textFiltered, filters);
  }, [cells, query, filters]);

  const visibleSummary = useMemo(() => {
    const occupiedVisible = filteredCells.filter((cell) => cell.stock > 0).length;
    return {
      total: filteredCells.length,
      occupied: occupiedVisible,
      empty: Math.max(0, filteredCells.length - occupiedVisible),
      pct: filteredCells.length ? Math.round((occupiedVisible / filteredCells.length) * 100) : 0,
    };
  }, [filteredCells]);

  const modules = useMemo(() => groupByModule(filteredCells), [filteredCells]);
  const occupied = cells.filter((cell) => cell.stock > 0).length;
  const available = Math.max(0, cells.length - occupied);
  const maxLevel = Math.max(1, ...cells.map((cell) => Number(cell.physicalLevel) || 1));
  const occupancy = cells.length ? Math.round((occupied / cells.length) * 100) : 0;
  const aisleRacks = filters.pasillo === "2" ? [3, 4] : [1, 2];

  function moveOperator(delta) {
    setSelected(null);
    setView("close");
    setShowAllStructure(false);
    setOperatorStep((value) => clamp(value + delta, 0, MODULES_PER_RACK - 1));
    requestAnimationFrame(() => wrapRef.current?.focus?.());
  }

  function updateFilter(name, value) {
    setSelected(null);
    if (name === "pasillo") {
      setOperatorTarget("pasillo");
      setOperatorStep(0);
      setFilters((current) => ({ ...current, pasillo: value, rack: "todos" }));
      if (value !== "todos") {
        setView("iso");
        setShowAllStructure(false);
      }
      return;
    }
    if (name === "rack") {
      setOperatorStep(0);
      setRackFace("front");
      if (value === "todos") {
        setView("iso");
        setShowAllStructure(false);
        setFilters((current) => ({ ...current, rack: value }));
        return;
      }
      setFilters((current) => ({ ...current, pasillo: aisleForRack(value), rack: value }));
      setView("close");
      setShowAllStructure(false);
      return;
    }
    setFilters((current) => ({ ...current, [name]: value }));
    if (["rack", "modulo", "nivel", "posicion", "profundidad"].includes(name) && value !== "todos") {
      setView(name === "nivel" ? "depth" : "close");
      setShowAllStructure(false);
    }
  }

  function guideOperator(target) {
    const pasillo = filters.pasillo === "2" ? "2" : "1";
    setOperatorTarget(target);
    setSelected(null);
    setView("close");
    setShowAllStructure(false);
    setFilters((current) => ({
      ...current,
      pasillo,
      rack: "todos",
    }));
  }

  function expandRender() {
    const node = wrapRef.current;
    setRenderExpanded(true);
    if (node?.requestFullscreen) node.requestFullscreen().catch(() => {});
  }

  useEffect(() => {
    const onFullscreenChange = () => {
      setRenderExpanded(document.fullscreenElement === wrapRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function clearFilters() {
    setQuery("");
    setSelected(null);
    setOperatorTarget("pasillo");
    setOperatorStep(4);
    setRackFace("front");
    setFilters({ ocupacion: "todas", pasillo: "todos", rack: "todos", modulo: "todos", nivel: "todos", posicion: "todos", profundidad: "todos" });
  }

  function toggleLayoutLayer(name) {
    setLayoutLayers((current) => ({ ...current, [name]: !current[name] }));
  }

  function openZoneLayout(nextZone) {
    setZone(String(nextZone));
    setQuery("");
    setSelected(null);
    setShowZoneDirectory(false);
    clearFilters();
  }

  function backToZones() {
    setSelected(null);
    setShowZoneDirectory(true);
  }

  function editZoneName(item, event) {
    event.stopPropagation();
    if (!canEditZoneNames) return;
    setZoneNameEditor({
      zone: item.zone,
      count: item.count,
      name: zoneNames[item.zone] || "",
    });
  }

  function closeZoneNameEditor() {
    setZoneNameEditor(null);
  }

  function saveZoneNameEditor() {
    if (!zoneNameEditor) return;
    const cleanName = zoneNameEditor.name.trim();
    setZoneNames((currentNames) => {
      const updated = { ...currentNames };
      if (cleanName) updated[zoneNameEditor.zone] = cleanName;
      else delete updated[zoneNameEditor.zone];
      if (typeof window !== "undefined") {
        window.localStorage.setItem("inova-layout-zone-names", JSON.stringify(updated));
      }
      return updated;
    });
    setZoneNameEditor(null);
  }
  useEffect(() => {
    if (filters.pasillo === "todos") return undefined;

    const onKeyDown = (event) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target?.tagName)) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      setView("close");
      setShowAllStructure(false);
    if (event.key === "ArrowLeft") {
        moveOperator(-1);
      }
      if (event.key === "ArrowRight") {
        moveOperator(1);
      }
      if (event.key === "ArrowUp") {
        guideOperator("rackA");
      }
      if (event.key === "ArrowDown") {
        guideOperator("rackB");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filters.pasillo, filters.rack, operatorTarget]);

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return undefined;

    const canvas = canvasRef.current;
    const container = wrapRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f7fc);
    scene.fog = new THREE.Fog(0xf4f7fc, 42, 92);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 18;
    controls.maxDistance = 90;
    controls.target.set(0, 2.8, 0);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x52617b, 2.6);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-18, 32, 28);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    scene.add(key);
    const purpleLight = new THREE.PointLight(0x7c3aed, 16, 54);
    purpleLight.position.set(15, 8, -12);
    scene.add(purpleLight);
    const cyanLight = new THREE.PointLight(0x22d3ee, 9, 42);
    cyanLight.position.set(-14, 7, 15);
    scene.add(cyanLight);

    const mats = {
      floor: createMaterial(0xe8edf7, { roughness: 0.8 }),
      dock: createMaterial(0xdbeafe, { roughness: 0.72 }),
      aisle: createMaterial(0x7dd3fc, { opacity: 0.34, roughness: 0.35 }),
      post: createMaterial(0x08112c, { roughness: 0.44, metalness: 0.22 }),
      beam: createMaterial(0xf59e0b, { roughness: 0.5, metalness: 0.12 }),
      pallet: createMaterial(0xf8fafc, { roughness: 0.62 }),
      selected: createMaterial(0xd946ef, { roughness: 0.35, metalness: 0.12 }),
      truck: createMaterial(0xcbd5e1, { roughness: 0.58 }),
      truckCab: createMaterial(0x0f172a, { roughness: 0.42 }),
      agv: createMaterial(0x111827, { roughness: 0.5 }),
      robot: createMaterial(0xf97316, { roughness: 0.38, metalness: 0.18 }),
      zoneBlue: createMaterial(0x38bdf8, { opacity: 0.24, roughness: 0.3 }),
      slot: new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.86, depthWrite: true }),
    };

    const focusMode = hasFocusedLayoutFilter(filters, query);
    const showFullStructure = shouldShowFullStructure(filters, query, showAllStructure);
    const structureScopeCells = buildStructureScopeCells(filteredCells, filters, query);
    const frameCells = focusMode ? (showFullStructure ? filteredCells : structureScopeCells) : cells;
    const frame = getLayoutBounds(frameCells);

    const floor = addBox(scene, [TOTAL_X + 20, 0.45, TOTAL_Z + 10], [0, -0.28, 0], mats.floor, "Piso operativo");
    floor.receiveShadow = true;

    if (!focusMode) {
      addBox(scene, [16, 0.08, 4.4], [-20, 0.01, 12], mats.dock, "Outbound Area");
      addBox(scene, [14, 0.08, 4.4], [-20, 0.02, -12], mats.dock, "Inbound Cache");
      addBox(scene, [2.2, 0.07, 28], [13, 0.08, 0], mats.aisle, "AGV Turned on the Ground Floor");
      addBox(scene, [9, 0.1, 10], [22, 0.1, 8], mats.zoneBlue, "Cold Storage Area");
      addText(scene, "OUTBOUND AREA", [-20, 1.1, 15.2], "#475569", 44);
      addText(scene, "INBOUND CACHE", [-20, 1.1, -15.2], "#475569", 44);
      addText(scene, `ZONA ${zone} - LAYOUT DIGITAL`, [6, 1.1, -17.2], WMS_PURPLE, 46);
      createTruck(scene, [-29, 0.55, 13], mats);
      createTruck(scene, [-29, 0.55, 9.5], mats);
      createTruck(scene, [-29, 0.55, -12], mats);
      createPalletBlock(scene, [-18, 0.35, 7], 5, 3, mats.pallet);
      createPalletBlock(scene, [-12, 0.35, -10], 4, 3, mats.pallet);
      createRobotArm(scene, [19, 0.45, 11.5], mats.robot);
      createRobotArm(scene, [20, 0.45, -8.5], mats.robot);
      createAgv(scene, [-6, 0.28, 0], mats.agv);
      createAgv(scene, [14, 0.28, -4], mats.agv);
    }

    if (!focusMode) {
      addBox(scene, [TOTAL_X + 1.2, 0.06, AISLE_WIDTH], [0, 0.05, AISLE_Z[0]], mats.aisle, "Pasillo operativo 1 - Rack 1 / Rack 2");
      addBox(scene, [TOTAL_X + 1.2, 0.06, AISLE_WIDTH], [0, 0.05, AISLE_Z[1]], mats.aisle, "Pasillo operativo 2 - Rack 3 / Rack 4");
      addText(scene, "PASILLO 1", [3, 1.05, AISLE_Z[0]], "#0891b2", 38);
      addText(scene, "PASILLO 2", [3, 1.05, AISLE_Z[1]], "#0891b2", 38);
    }
    if (filters.pasillo !== "todos" && filters.rack === "todos") {
      addOperatorMarker(
        scene,
        filters.pasillo,
        rackTargetForAisle(filters.pasillo, filters.rack) || operatorTarget,
        operatorStep,
        mats
      );
    }
    meshMapRef.current.clear();
    createRackCity(
      scene,
      cells,
      filteredCells,
      selected,
      setSelected,
      maxStock,
      meshMapRef.current,
      mats,
      showFullStructure,
      filters.ocupacion,
      filters,
      query,
      structureScopeCells,
      rackFace,
      zone,
      view
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Array.from(meshMapRef.current.keys()), false);
      if (hits.length) {
        const hit = hits[0];
        const instanceCells = hit.object.userData?.instanceCells;
        const cell = instanceCells && hit.instanceId !== undefined ? instanceCells[hit.instanceId] : meshMapRef.current.get(hit.object);
        if (cell) setSelected((current) => current?.code === cell.code ? null : cell);
      }
    }

    renderer.domElement.addEventListener("click", onClick);

    function setCamera(nextView) {
      const [baseCx, cy, baseCz] = frame.center;
      const [sx, sy, sz] = frame.size;
      const aisleFocus = filters.pasillo !== "todos" && filters.rack === "todos" && filters.modulo === "todos";
      const rackFocus = filters.rack !== "todos";
      const moduleFocus = filters.modulo !== "todos";
      const levelFocus = filters.nivel !== "todos" || filters.posicion !== "todos" || filters.profundidad !== "todos";
      const levelOnlyFocus = filters.nivel !== "todos" && filters.posicion === "todos" && filters.profundidad === "todos";
      const positionFocus = filters.posicion !== "todos" || filters.profundidad !== "todos";
      const levelOneCameraLift = levelOnlyFocus && Number(filters.nivel) === 1 ? -0.95 : 0;
      const selectedPoint = selected?.rack
        ? slotCenter(selected.rack, selected.moduleInRack, selected.physicalLevel, selected.physicalPosition, selected.physicalDepth)
        : null;
      const aisleZ = filters.pasillo === "1" ? AISLE_Z[0] : filters.pasillo === "2" ? AISLE_Z[1] : baseCz;
      const rackWalkTarget = rackFocus ? rackTargetForAisle(filters.pasillo, filters.rack) : null;
      const activeOperatorTarget = rackWalkTarget || operatorTarget;
      const operatorPose = filters.pasillo !== "todos" && nextView === "close"
        ? getOperatorPose(filters.pasillo, operatorStep, activeOperatorTarget)
        : null;
      const cx = operatorPose ? operatorPose.x : baseCx;
      const cz = operatorPose ? operatorPose.z : aisleFocus ? aisleZ : baseCz;
      const fitRadius = focusMode
        ? Math.max(
            positionFocus ? 1.2 : levelFocus ? 1.75 : moduleFocus ? 2.55 : rackFocus ? 4.2 : aisleFocus ? 6.2 : 7.2,
            sx * (positionFocus ? 0.62 : levelFocus ? 0.7 : 0.95),
            sy * (positionFocus ? 0.95 : levelFocus ? 1.05 : 1.38),
            sz * (aisleFocus ? 0.75 : 0.95)
          )
        : Math.max(8.5, sx * 0.95, sy * 1.45, sz * 1.08);
      const focusFront = focusMode && nextView !== "top";
      const targetDrop = nextView === "close" || focusFront ? (levelFocus ? 0.62 : moduleFocus ? 0.48 : aisleFocus ? 0.35 : 0.18) : 0;
      const targetY = Math.max(0.45, cy - targetDrop);

      controls.target.set(cx, operatorPose ? 1.55 : targetY, cz);
      controls.minDistance = 0.25;
      controls.maxDistance = 110;
      camera.near = 0.01;
      camera.far = 1000;
      camera.zoom = !rackFocus && nextView === "iso"
        ? 0.80
        : nextView === "close"
          ? (positionFocus ? 2.9 : levelFocus ? 2.4 : moduleFocus ? 1.95 : rackFocus ? 1.38 : aisleFocus ? 1.18 : 1.05)
          : focusMode
            ? (positionFocus ? 2.35 : levelFocus ? 2.0 : moduleFocus ? 1.45 : aisleFocus ? 1.05 : 1.08)
            : 1;
      camera.updateProjectionMatrix();

      if (selectedPoint && nextView !== "top") {
        const selectedRackCenterZ = rackZStart(Number(selected.rack)) + RACK_DEPTH / 2;
        const selectedAisleZ = aisleForRack(selected.rack) === "1" ? AISLE_Z[0] : AISLE_Z[1];
        const selectedRackDirection = selectedRackCenterZ >= selectedAisleZ ? 1 : -1;
        const selectedFrontSide = selectedRackDirection >= 0 ? -1 : 1;
        controls.target.set(selectedPoint[0], Math.max(1.05, selectedPoint[1]), selectedPoint[2]);
        camera.position.set(
          selectedPoint[0],
          Math.max(2.25, selectedPoint[1] + 1.35),
          selectedPoint[2] + selectedFrontSide * 4
        );
        camera.zoom = 0.90;
        camera.updateProjectionMatrix();
        controls.update();
        return;
      }

      if (nextView === "top") {
        camera.position.set(cx, targetY + fitRadius * 1.65, cz + 0.1);
      } else if (nextView === "iso" && aisleFocus && !rackFocus) {
        const aisleSide = filters.pasillo === "2" ? -1 : 1;
        const startX = -CENTER_X + 5.2;
        const lookX = Math.min(CENTER_X - 2.2, startX + 13.8);
        controls.target.set(lookX, 2.15, aisleZ + aisleSide * 0.08);
        camera.position.set(startX - 7.4, 4.75, aisleZ + aisleSide * 1.02);
        camera.zoom = 0.80;
        camera.updateProjectionMatrix();
      } else if (nextView === "close") {
        if (rackFocus) {
          const rackNumber = Number(filters.rack);
          const rackCenterZ = filters.modulo === "todos" && filters.nivel === "todos" && filters.posicion === "todos" && filters.profundidad === "todos"
            ? operatorPose?.rackCenterZ ?? rackZStart(rackNumber) + RACK_DEPTH / 2
            : baseCz;
          const rackAisleZ = aisleForRack(rackNumber) === "1" ? AISLE_Z[0] : AISLE_Z[1];
          const rackDirection = operatorPose?.rackDirection ?? (rackCenterZ >= rackAisleZ ? 1 : -1);
          const frontSide = rackDirection >= 0 ? -1 : 1;
          const faceSide = rackFace === "back" ? -frontSide : frontSide;
          const fitDistance = getFitDistance([sx, sy, sz], "close");
          const focusY = levelOnlyFocus ? cy + levelOneCameraLift : Math.max(1.15, cy);
          controls.target.set(baseCx, focusY, rackCenterZ);
          camera.position.set(baseCx, levelOnlyFocus ? focusY + 0.12 : Math.max(2.0, cy + 0.8), rackCenterZ + faceSide * fitDistance);
          camera.zoom = levelOnlyFocus ? 1.93 : moduleFocus ? 1.93 : 0.90;
          camera.updateProjectionMatrix();
        } else if (operatorPose) {
          const walkX = clamp(operatorPose.x, -CENTER_X + 1.1, CENTER_X - 1.1);
          const lookAheadX = clamp(walkX + 2.6, -CENTER_X, CENTER_X);
          if (activeOperatorTarget === "pasillo") {
            controls.target.set(lookAheadX, 1.45, operatorPose.z);
            camera.position.set(walkX - 3.4, 2.15, operatorPose.z + operatorPose.aisleCameraSide * 0.28);
          } else {
            controls.target.set(lookAheadX, 1.72, operatorPose.rackCenterZ);
            camera.position.set(walkX - 2.75, 1.82, operatorPose.z - operatorPose.rackDirection * 0.42);
          }
          camera.zoom = 1.34;
          camera.updateProjectionMatrix();
        } else {
          camera.position.set(cx, targetY + fitRadius * 0.03, cz + fitRadius * (aisleFocus ? 0.62 : 0.78));
        }
      } else if (nextView === "depth" && rackFocus) {
        const rackNumber = Number(filters.rack);
        const rackCenterZ = rackZStart(rackNumber) + RACK_DEPTH / 2;
        const rackAisleZ = aisleForRack(rackNumber) === "1" ? AISLE_Z[0] : AISLE_Z[1];
        const rackDirection = rackCenterZ >= rackAisleZ ? 1 : -1;
        const frontSide = rackDirection >= 0 ? -1 : 1;
        const targetZ = filters.modulo === "todos" && filters.nivel === "todos" && filters.posicion === "todos" && filters.profundidad === "todos"
          ? rackCenterZ
          : baseCz;
        const fitDistance = getFitDistance([sx, sy, sz], "depth");
        const focusY = levelOnlyFocus ? cy + levelOneCameraLift : Math.max(1.15, cy);
        controls.target.set(baseCx, focusY, targetZ);
        camera.position.set(
          baseCx,
          levelOnlyFocus ? focusY + 0.12 : Math.max(2.0, cy + 0.82),
          targetZ + frontSide * fitDistance
        );
        camera.zoom = levelOnlyFocus ? (moduleFocus ? 5.0 : 0.94) : moduleFocus ? 1.93 : 0.90;
        camera.updateProjectionMatrix();
      } else if (nextView === "front" || focusFront) {
        camera.position.set(cx, targetY + fitRadius * 0.05, cz + fitRadius * (aisleFocus ? 0.72 : 0.9));
      } else {
        camera.position.set(cx - fitRadius * 1.02, targetY + fitRadius * 0.52, cz + fitRadius * 0.98);
      }

      controls.update();
    }

    setCamera(view);

    const resize = () => {
      const width = container.clientWidth || 1200;
      const height = container.clientHeight || 660;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let raf = 0;
    function animate() {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
    };
  }, [cells, filteredCells, selected, view, maxStock, zone, showAllStructure, filters, query, operatorTarget, operatorStep, rackFace]);
  if (showZoneDirectory) {
    return (
      <main className="layout-zone-page">
        <style>{layoutStyles}</style>
        <section className="layout-zone-header">
          <div className="layout-zone-brand-mark"><PackageCheck size={26} /></div>
          <div>
            <span className="layout3d-kicker">Layout por zona</span>
            <h1>Bienvenido, Genesis</h1>
            <p>Selecciona una zona para visualizar su layout y gestionar la estanteria.</p>
          </div>
          <div className="layout-zone-actions">
            <label className="layout-zone-search">
              <Search size={18} />
              <input value={zoneSearch} onChange={(event) => setZoneSearch(event.target.value)} placeholder="Buscar zona o bodega..." />
            </label>
            <div className="layout-zone-toggle">
              <button type="button" className={zoneDisplay === "grid" ? "active" : ""} onClick={() => setZoneDisplay("grid")} title="Vista de tarjetas"><Grid3X3 size={18} /></button>
              <button type="button" className={zoneDisplay === "list" ? "active" : ""} onClick={() => setZoneDisplay("list")} title="Vista de lista"><List size={18} /></button>
            </div>
          </div>
        </section>

        <section className="layout-zone-kpis">
          <article><span className="green"><MapPinned size={18} /></span><strong>{zoneDirectorySummary.zones}</strong><small>Zonas activas</small></article>
          <article><span className="purple"><Boxes size={18} /></span><strong>{formatQty(zoneDirectorySummary.totalLocations)}</strong><small>Ubicaciones totales</small></article>
          <article><span className="orange"><Warehouse size={18} /></span><strong>{formatQty(zoneDirectorySummary.occupiedLocations)}</strong><small>Ubicaciones ocupadas</small></article>
          <article><span className="cyan"><Layers3 size={18} /></span><strong>{formatQty(zoneDirectorySummary.emptyLocations)}</strong><small>Ubicaciones vacias</small></article>
          <article><span className="violet"><Truck size={18} /></span><strong>{zoneDirectorySummary.occupancyPct}%</strong><small>Ocupacion promedio</small></article>
        </section>

        {error && <div className="layout3d-error">{error}</div>}

        <div className="layout-zone-section-title">
          <div>
            <Layers3 size={20} />
            <h2>Zonas disponibles</h2>
          </div>
          <span>{filteredZoneCards.length} resultados</span>
        </div>

        <section className={zoneDisplay === "grid" ? "layout-zone-grid" : "layout-zone-list"}>
          {filteredZoneCards.map((item) => {
            const Icon = item.Icon;
            return (
              <article key={item.zone} className="layout-zone-card" style={{ "--zone-accent": item.palette.accent, "--zone-soft": item.palette.soft, "--zone-text": item.palette.text }}>
                <span className="layout-zone-status">Activa</span>
                {canEditZoneNames && (
                  <button type="button" className="layout-zone-edit" onClick={(event) => editZoneName(item, event)} title="Asignar nombre de bodega"><PencilLine size={13} /></button>
                )}
                <div className="layout-zone-icon"><Icon size={24} /></div>
                <small>Zona {item.zone}</small>
                <h2>Base {item.zone}</h2>
                <p><Warehouse size={14} /> {item.count} ubicaciones</p>
                <em>{item.displayName}</em>
                <button type="button" onClick={() => openZoneLayout(item.zone)}>
                  Ver layout <ArrowRight size={16} />
                </button>
              </article>
            );
          })}
          {loading && <article className="layout-zone-empty-card"><h2>Cargando zonas...</h2><p>Consultando ubicaciones registradas.</p></article>}
          {!loading && !filteredZoneCards.length && (
            <article className="layout-zone-empty-card">
              <h2>Sin zonas encontradas</h2>
              <p>Ajusta la busqueda o actualiza la informacion de ubicaciones.</p>
            </article>
          )}
        </section>
        <footer className="layout-zone-footer">
          <span>Mostrando 1 a {filteredZoneCards.length} de {filteredZoneCards.length} zonas</span>
          <div className="layout-zone-pagination">
            <button type="button" disabled><ChevronLeft size={17} /></button>
            <strong>1</strong>
            <button type="button" disabled><ChevronRight size={17} /></button>
          </div>
        </footer>
        {zoneNameEditor && (
          <div className="layout-zone-modal-backdrop" role="presentation" onMouseDown={closeZoneNameEditor}>
            <section className="layout-zone-modal" role="dialog" aria-modal="true" aria-label="Asignar nombre de bodega" onMouseDown={(event) => event.stopPropagation()}>
              <div className="layout-zone-modal-head">
                <div>
                  <span className="layout3d-kicker">Toolbox administrador</span>
                  <h2>Asignar nombre de bodega</h2>
                  <p>Zona {zoneNameEditor.zone} · Base {zoneNameEditor.zone} · {formatQty(zoneNameEditor.count)} ubicaciones</p>
                </div>
                <button type="button" className="layout-zone-modal-close" onClick={closeZoneNameEditor}>×</button>
              </div>
              <label className="layout-zone-modal-field">
                <span>Nombre operativo</span>
                <input
                  autoFocus
                  value={zoneNameEditor.name}
                  onChange={(event) => setZoneNameEditor((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ej: Bodega general, Shuttle, Cuarentena..."
                  maxLength={48}
                />
              </label>
              <div className="layout-zone-modal-note">
                Este nombre solo organiza la visual del layout por zona. No modifica stock, ubicaciones ni movimientos.
              </div>
              <div className="layout-zone-modal-actions">
                <button type="button" className="secondary" onClick={closeZoneNameEditor}>Cancelar</button>
                <button type="button" onClick={saveZoneNameEditor}>Guardar nombre</button>
              </div>
            </section>
          </div>
        )}
      </main>
    );
  }

  if (String(zone) !== "300") {
    const currentZone = zoneCards.find((item) => item.zone === String(zone));
    return (
      <main className="layout-zone-page">
        <style>{layoutStyles}</style>
        <section className="layout-zone-config">
          <div className="layout-zone-config-top">
            <button type="button" onClick={backToZones}>Volver a zonas</button>
            <span>Zona {zone}</span>
          </div>
          <div className="layout-zone-config-body">
            <div className="layout-zone-icon"><Building2 size={30} /></div>
            <span className="layout3d-kicker">Layout pendiente de configuracion</span>
            <h1>Base {zone}</h1>
            <p>Esta base ya existe en ubicaciones. Queda creada para asignarle nombre de bodega y configurar su mapa operativo.</p>
            <strong>{currentZone?.count || 0} ubicaciones registradas</strong>
          </div>
        </section>
      </main>
    );
  }
  return (
    <main
      className={`layout3d-page ${filterToolboxOpen ? "" : "toolbox-collapsed"}`}
      style={{
        "--layout-toolbox-grid": filterToolboxOpen ? "minmax(300px, 340px) minmax(0, 1fr)" : "56px minmax(0, 1fr)",
        "--layout-toolbox-gap": filterToolboxOpen ? "14px" : "10px",
      }}
    >
      <style>{layoutStyles}</style>

      <section className="layout3d-hero">
        <div>
          <span className="layout3d-kicker">WMS DIGITAL TWIN</span>
          <h1>Layout 3D de bodega</h1>
          <p>Maqueta operacional por zona con racks, pasillos, recibo, despacho, AGV y ubicaciones reales desde el sistema.</p>
        </div>
        <div className="layout3d-hero-actions">
          <button type="button" onClick={backToZones} className="layout3d-secondary">Zonas</button>
          <button type="button" onClick={loadData} className="layout3d-primary">
            <RefreshCcw size={17} /> Actualizar
          </button>
        </div>
      </section>

      {error && <div className="layout3d-error">{error}</div>}

      <aside className={`layout3d-control-toolbox ${filterToolboxOpen ? "" : "collapsed"}`}>
        <div className="layout3d-toolbox-head">
          <div>
            <span className="layout3d-kicker">Filtros de visualizacion</span>
            <strong>Control operativo</strong>
          </div>
          <div className="layout3d-toolbox-head-actions">
            {filterToolboxOpen && (
              <button type="button" className="layout3d-back-zones" onClick={backToZones}>
                <ChevronLeft size={14} /> Zonas
              </button>
            )}
            <button type="button" onClick={() => setFilterToolboxOpen((value) => !value)}>
            {filterToolboxOpen ? "Ocultar" : "Mostrar"} <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {filterToolboxOpen && (
          <>
            <label className="layout3d-zone-pill">
              <span>Zona seleccionada</span>
              <select value={zone} onChange={(event) => { setZone(event.target.value); setSelected(null); }}>
                {zones.map((item) => <option key={item} value={item}>Zona {item}</option>)}
              </select>
              <em>Activa</em>
            </label>

            <label className="layout3d-toolbox-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ubicacion o material..." />
            </label>

            <div className="layout3d-toolbox-grid">
              <FilterSelect label="Ocupacion" value={filters.ocupacion} onChange={(value) => updateFilter("ocupacion", value)} options={["ocupadas", "libres"]} allValue="todas" allLabel="Todas" />
              <FilterSelect label="Pasillo" value={filters.pasillo} onChange={(value) => updateFilter("pasillo", value)} options={filterOptions.pasillos} prefix="Pasillo " />
              <FilterSelect label="Rack" value={filters.rack} onChange={(value) => updateFilter("rack", value)} options={filterOptions.racks} prefix="Rack " />
              <FilterSelect label="Modulo" value={filters.modulo} onChange={(value) => updateFilter("modulo", value)} options={filterOptions.modulos} prefix="M" />
              <FilterSelect label="Nivel" value={filters.nivel} onChange={(value) => updateFilter("nivel", value)} options={filterOptions.niveles} prefix="Nivel " />
              <FilterSelect label="Posicion" value={filters.posicion} onChange={(value) => updateFilter("posicion", value)} options={filterOptions.posiciones} prefix="P" />
              <FilterSelect label="Profundidad" value={filters.profundidad} onChange={(value) => updateFilter("profundidad", value)} options={filterOptions.profundidades} prefix="D" />
              <label>
                <span>Contexto</span>
                <select value={showAllStructure ? "toda" : "filtrada"} onChange={(event) => setShowAllStructure(event.target.value === "toda")}>
                  <option value="filtrada">Filtrado</option>
                  <option value="toda">Toda la estanteria</option>
                </select>
              </label>
            </div>

            <div className="layout3d-toolbox-section">
              <span>Opciones de vista</span>
              <div className="layout3d-view-grid">
                <button type="button" className={view === "iso" ? "active" : ""} onClick={() => setView("iso")}><Camera size={16} />3D</button>
                <button type="button" className={view === "top" ? "active" : ""} onClick={() => setView("top")}><Eye size={16} />Superior</button>
                <button type="button" className={view === "front" ? "active" : ""} onClick={() => setView("front")}><Maximize2 size={16} />Frontal</button>
                <button type="button" className={view === "close" && rackFace === "back" ? "active" : ""} onClick={() => { setRackFace("back"); setView("close"); }}><Layers3 size={16} />Lateral</button>
                <button type="button" className={view === "depth" ? "active" : ""} onClick={() => setView("depth")}><Layers3 size={16} />Profundidad</button>
                <button type="button" className={view === "close" && rackFace !== "back" ? "active" : ""} onClick={() => setView("close")}><Eye size={16} />Cerca</button>
                <button type="button" onClick={expandRender}><Maximize2 size={16} />Ampliar</button>
              </div>
            </div>

            <div className="layout3d-toolbox-section">
              <span>Capas a mostrar</span>
              <div className="layout3d-layer-list">
                {[
                  ["ocupadas", "Ubicaciones ocupadas", "#ef4444"],
                  ["vacias", "Ubicaciones vacias", "#16a34a"],
                  ["seleccionada", "Seleccionada", "#7c3aed"],
                  ["racks", "Racks", "#0f172a"],
                  ["niveles", "Niveles", "#2563eb"],
                  ["etiquetas", "Etiquetas", "#6d28d9"],
                  ["resumen", "Resumen de zona", "#8b5cf6"],
                ].map(([key, label, color]) => (
                  <label key={key}>
                    <i style={{ background: color }} />
                    <span>{label}</span>
                    <input type="checkbox" checked={layoutLayers[key]} onChange={() => toggleLayoutLayer(key)} />
                  </label>
                ))}
              </div>
            </div>

            <div className="layout3d-toolbox-actions">
              <button type="button" onClick={clearFilters}>Limpiar filtros</button>
              <button type="button" className="primary" onClick={() => wrapRef.current?.focus?.()}>Aplicar filtros</button>
            </div>
          </>
        )}
      </aside>

      <section className="layout3d-stage-card">
        <div className="layout3d-stage-head">
          <div>
            <span className="layout3d-kicker">Escenario de aplicacion</span>
            <h2>Pallet Shuttle + AGV + analisis real de estanteria</h2>
          </div>
          <div className="layout3d-legend">
            <span><small className="layout3d-dot empty" /> Vacia</span>
            <span><small className="layout3d-dot occupied" /> Ocupada</span>
            <span><small className="layout3d-dot selected" /> Seleccionada</span>
          </div>
        </div>
        <div ref={wrapRef} className={`layout3d-canvas-wrap ${renderExpanded ? "expanded" : ""}`} tabIndex={0}>
          {loading && <div className="layout3d-loading">Cargando ubicaciones desde el sistema...</div>}
          {!loading && !filteredCells.length && <div className="layout3d-loading">No hay ubicaciones para zona {zone}.</div>}
          <canvas ref={canvasRef} className="layout3d-canvas" />
          <div className="layout3d-floating-views">
            <button type="button" className={view === "iso" ? "active" : ""} onClick={() => setView("iso")}>3D</button>
            <button type="button" className={view === "top" ? "active" : ""} onClick={() => setView("top")}>Superior</button>
            <button type="button" className={view === "front" ? "active" : ""} onClick={() => setView("front")}>Frontal</button>
            <button type="button" className={view === "depth" ? "active" : ""} onClick={() => setView("depth")}>Profundidad</button>
            <button type="button" className={view === "close" ? "active" : ""} onClick={() => setView("close")}>Cerca</button>
            <button type="button" onClick={expandRender}>Ampliar</button>
          </div>
          <div className="layout3d-floating-filters">
            <label>
              <span>Ocupacion</span>
              <select value={filters.ocupacion} onChange={(event) => updateFilter("ocupacion", event.target.value)}>
                <option value="todas">Todas</option>
                <option value="ocupadas">Ocupadas</option>
                <option value="libres">Libres</option>
              </select>
            </label>
            <label>
              <span>Pasillo</span>
              <select value={filters.pasillo} onChange={(event) => updateFilter("pasillo", event.target.value)}>
                <option value="todos">Todos</option>
                {filterOptions.pasillos.map((item) => <option key={item} value={item}>P{item}</option>)}
              </select>
            </label>
            <label>
              <span>Rack</span>
              <select value={filters.rack} onChange={(event) => updateFilter("rack", event.target.value)}>
                <option value="todos">Todos</option>
                {filterOptions.racks.map((item) => <option key={item} value={item}>R{item}</option>)}
              </select>
            </label>
            <label>
              <span>Modulo</span>
              <select value={filters.modulo} onChange={(event) => updateFilter("modulo", event.target.value)}>
                <option value="todos">Todos</option>
                {filterOptions.modulos.map((item) => <option key={item} value={item}>M{item}</option>)}
              </select>
            </label>
            <label>
              <span>Nivel</span>
              <select value={filters.nivel} onChange={(event) => updateFilter("nivel", event.target.value)}>
                <option value="todos">Todos</option>
                {filterOptions.niveles.map((item) => <option key={item} value={item}>N{item}</option>)}
              </select>
            </label>
            <label>
              <span>Pos</span>
              <select value={filters.posicion} onChange={(event) => updateFilter("posicion", event.target.value)}>
                <option value="todos">Todas</option>
                {filterOptions.posiciones.map((item) => <option key={item} value={item}>P{item}</option>)}
              </select>
            </label>
            <label>
              <span>Prof</span>
              <select value={filters.profundidad} onChange={(event) => updateFilter("profundidad", event.target.value)}>
                <option value="todos">Todas</option>
                {filterOptions.profundidades.map((item) => <option key={item} value={item}>D{item}</option>)}
              </select>
            </label>
          </div>
          {filters.rack !== "todos" && (
            <div className="layout3d-rack-face-panel">
              <div>
                <span>Rack filtrado</span>
                <strong>R{filters.rack} - {view === "depth" ? "D1 + D2" : rackFace === "front" ? "Frente" : "Atras"}</strong>
              </div>
              <button type="button" className={rackFace === "front" ? "active" : ""} onClick={() => { setRackFace("front"); setView("close"); }}>Frente D1</button>
              <button type="button" className={rackFace === "back" ? "active" : ""} onClick={() => { setRackFace("back"); setView("close"); }}>Atras D2</button>
            </div>
          )}
          {filters.rack !== "todos" && (
            <div className="layout3d-orientation-cards">
              <article>
                <span>Ubicacion</span>
                <strong>Pasillo {filters.pasillo !== "todos" ? filters.pasillo : aisleForRack(filters.rack)}</strong>
                <small>Referencia de acceso al rack</small>
              </article>
              <article>
                <span>Lectura</span>
                <strong>{selected ? selected.code : view === "depth" ? "Profundidad completa" : rackFace === "front" ? "Cara frontal" : "Cara posterior"}</strong>
                <small>{selected ? `R${selected.rack} / M${selected.moduleInRack} / N${selected.physicalLevel} / D${selected.physicalDepth} / P${selected.physicalPosition}` : view === "depth" ? "Fondo con color mas intenso" : rackFace === "front" ? "Profundidad visible D1" : "Profundidad visible D2"}</small>
              </article>
            </div>
          )}
          {filters.pasillo !== "todos" && (
            <div className="layout3d-floating-operator">
              <div>
                <span>Recorrido</span>
                <strong>P{filters.pasillo}{filters.rack !== "todos" ? ` - R${filters.rack}` : ""} - M{operatorStep + 1}</strong>
              </div>
              <button type="button" onClick={() => moveOperator(-1)} title="Modulo anterior">&lt;</button>
              <button type="button" onClick={() => moveOperator(1)} title="Modulo siguiente">&gt;</button>
              {filters.rack === "todos" ? (
                <>
                  <button type="button" className={operatorTarget === "pasillo" ? "active" : ""} onClick={() => guideOperator("pasillo")}>Pasillo</button>
                  <button type="button" className={operatorTarget === "rackA" ? "active" : ""} onClick={() => guideOperator("rackA")}>Mirar R{aisleRacks[0]}</button>
                  <button type="button" className={operatorTarget === "rackB" ? "active" : ""} onClick={() => guideOperator("rackB")}>Mirar R{aisleRacks[1]}</button>
                </>
              ) : (
                <button type="button" className="active" onClick={() => setView("close")}>Frente completo R{filters.rack}</button>
              )}
            </div>
          )}
          {layoutLayers.resumen && !selected && (
            <aside className="layout3d-zone-summary-card">
              <span>Resumen de la zona</span>
              <p><Boxes size={14} /> Ubicaciones totales <strong>{formatQty(cells.length)}</strong></p>
              <p><Warehouse size={14} /> Ubicaciones ocupadas <strong className="green">{formatQty(occupied)}</strong></p>
              <p><MapPinned size={14} /> Ubicaciones vacias <strong className="red">{formatQty(available)}</strong></p>
              <p><Layers3 size={14} /> Ocupacion total <strong>{occupancy}%</strong></p>
              <div><i style={{ width: `${occupancy}%` }} /></div>
            </aside>
          )}
          {selected && (
            <div className={`layout3d-selection-card ${filters.rack !== "todos" ? "compact" : ""}`}>
              <div className="layout3d-selection-top">
                <div>
                  <span>Ubicacion</span>
                  <strong>{selected.code}</strong>
                </div>
                <em className={Number(selected.stock || 0) > 0 ? "occupied" : "empty"}>
                  {Number(selected.stock || 0) > 0 ? "Ocupada" : "Libre"}
                </em>
              </div>

              <div className="layout3d-selection-material">
                <small>Material</small>
                <b>{selected.material || "Sin codigo"}</b>
                <p>{selected.descripcion || "Sin descripcion registrada"}</p>
              </div>

              <div className="layout3d-selection-grid">
                <div><span>Familia</span><strong>{selected.familia || "Sin familia"}</strong></div>
                <div><span>Lote proveedor</span><strong>{selected.lote_proveedor || "Sin lote"}</strong></div>
                <div><span>Vencimiento</span><strong>{selected.fecha_vencimiento || "Sin fecha"}</strong></div>
                <div><span>Posicion</span><strong>R{selected.rack} / M{selected.moduleInRack} / N{selected.physicalLevel} / P{selected.physicalPosition}</strong></div>
              </div>

              <div className="layout3d-selection-total">
                <span>Cantidad en ubicacion</span>
                <strong>{formatQty(selected.stock)}</strong>
              </div>
            </div>
          )}        </div>
      </section>

      <section className="layout3d-detail-grid">
        <article className="layout3d-detail">
          <span className="layout3d-kicker">Ubicacion seleccionada</span>
          <h3>{selected ? selected.code : "Selecciona una celda del rack"}</h3>
          {selected ? (
            <div className="layout3d-detail-list">
              <Detail label="Base" value={selected.base} />
              <Detail label="Pasillo" value={selected.pasillo} />
              <Detail label="Rack" value={selected.rack} />
              <Detail label="Modulo" value={`M${String(selected.moduleInRack).padStart(2, "0")}`} />
              <Detail label="Nivel" value={selected.physicalLevel} />
              <Detail label="Posicion" value={selected.physicalPosition} />
              <Detail label="Profundidad" value={selected.physicalDepth} />
              <Detail label="Bodega" value={selected.bodega || selected.zona || "Sin bodega"} />
              <Detail label="Stock calculado" value={formatQty(selected.stock)} />
              <Detail label="SKU / material" value={selected.material || "Sin material"} />
              <Detail label="Lote almacen" value={selected.lote_almacen || "Sin lote"} />
              <Detail label="Lote proveedor" value={selected.lote_proveedor || "Sin lote"} />
              <Detail label="Vencimiento" value={selected.fecha_vencimiento || "Sin fecha"} />
              <Detail label="Proveedor" value={selected.proveedor || "Sin proveedor"} />
              <Detail label="Lineas motor" value={selected.stockItems?.length || 0} />
            </div>
          ) : (
            <p>Haz clic sobre cualquier pallet o celda del rack para ver su informacion operativa.</p>
          )}
        </article>
        <article className="layout3d-detail">
          <span className="layout3d-kicker">Motor en ubicacion</span>
          <h3>{selected ? `${selected.stockItems?.length || 0} lineas almacenadas` : `${available} libres / ${occupied} ocupadas`}</h3>
          {selected?.stockItems?.length ? (
            <div className="layout3d-stock-lines">
              <table>
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Lote proveedor</th>
                    <th>Vencimiento</th>
                    <th>Proveedor</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.stockItems.map((item) => (
                    <tr key={`${item.codigo_material}-${item.lote_proveedor}-${item.fecha_vencimiento}`}>
                      <td>{item.codigo_material || item.sku || "Sin codigo"}</td>
                      <td>{item.lote_proveedor || ""}</td>
                      <td>{item.fecha_vencimiento || ""}</td>
                      <td>{item.proveedor || ""}</td>
                      <td>{formatQty(item.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>{selected ? "Esta ubicacion no tiene stock positivo registrado en el motor." : "Selecciona una ubicacion para ver codigo, lote proveedor, fecha de vencimiento, proveedor y cantidad."}</p>
          )}
        </article>
      </section>
    </main>
  );
}

function addText(scene, text, position, color, size) {
  const label = createTextSprite(text, color, size);
  label.position.set(...position);
  scene.add(label);
  return label;
}

function createTruck(scene, position, mats) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.y = Math.PI / 2;
  group.add(new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.2, 1.9), mats.truck));
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.35, 1.9), mats.truckCab);
  cab.position.x = -3.45;
  group.add(cab);
  for (let x of [-2.2, 2.2]) {
    for (let z of [-1.05, 1.05]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 18), createMaterial(0x111827));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, -0.72, z);
      group.add(wheel);
    }
  }
  scene.add(group);
}

function createPalletBlock(scene, origin, cols, rows, material) {
  for (let x = 0; x < cols; x += 1) {
    for (let z = 0; z < rows; z += 1) {
      const stack = 1 + ((x + z) % 3);
      for (let y = 0; y < stack; y += 1) {
        addBox(scene, [0.72, 0.38, 0.72], [origin[0] + x * 0.86, origin[1] + y * 0.4, origin[2] + z * 0.86], material, "Pallet cache");
      }
    }
  }
}

function createAgv(scene, position, material) {
  const group = new THREE.Group();
  group.position.set(...position);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.34, 0.95), material);
  base.castShadow = true;
  group.add(base);
  const light = new THREE.PointLight(0x22d3ee, 3, 4);
  light.position.set(0, 0.35, 0);
  group.add(light);
  scene.add(group);
}

function createRobotArm(scene, position, material) {
  const group = new THREE.Group();
  group.position.set(...position);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 0.28, 20), material);
  group.add(base);
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.2, 0.32), material);
  arm1.position.set(0, 1.1, 0);
  arm1.rotation.z = -0.25;
  group.add(arm1);
  const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.7, 0.28), material);
  arm2.position.set(0.62, 2.08, 0);
  arm2.rotation.z = 0.85;
  group.add(arm2);
  scene.add(group);
}

function addOperatorMarker(scene, pasillo, operatorTarget, operatorStep, mats) {
  const aisles = pasillo === "1" ? [AISLE_Z[0]] : pasillo === "2" ? [AISLE_Z[1]] : AISLE_Z;
  aisles.forEach((z, index) => {
    const group = new THREE.Group();
    const pose = pasillo === "todos" ? null : getOperatorPose(pasillo, operatorStep, operatorTarget);
    const entryX = pasillo === "todos" ? -CENTER_X - 3.2 + index * 2.4 : pose.x;
    group.position.set(entryX, 0.08, z);
    group.rotation.y = pose ? pose.rotation : Math.PI / 2;
    group.scale.setScalar(pasillo === "todos" ? 0.78 : 0.62);

    const bodyMat = createMaterial(0x6d28d9, { roughness: 0.42, metalness: 0.08 });
    const vestMat = createMaterial(0x22d3ee, { roughness: 0.45 });
    const skinMat = createMaterial(0xf4c7a1, { roughness: 0.62 });
    const darkMat = createMaterial(0x111827, { roughness: 0.52 });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 18), skinMat);
    head.position.set(0, 1.12, 0);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), createMaterial(0xffea00, { roughness: 0.35 }));
    helmet.position.set(0, 1.17, 0);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.14), bodyMat);
    torso.position.set(0, 0.82, 0);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.15), vestMat);
    vest.position.set(0, 0.88, 0.01);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.34, 0.08), darkMat);
    legL.position.set(-0.06, 0.46, 0);
    const legR = legL.clone();
    legR.position.x = 0.06;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), darkMat);
    armL.position.set(-0.18, 0.82, 0);
    armL.rotation.z = -0.25;
    const armR = armL.clone();
    armR.position.x = 0.18;
    armR.rotation.z = 0.25;
    [head, helmet, torso, vest, legL, legR, armL, armR].forEach((part) => {
      part.castShadow = true;
      group.add(part);
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.035, 24), createMaterial(0xffffff, { opacity: 0.72 }));
    base.position.set(0, 0.02, 0);
    group.add(base);
    const label = createTextSprite(
      pasillo === "todos" ? `Entrada P${index + 1}` : operatorTarget === "pasillo" ? `Paso M${operatorStep + 1}` : `Mirando Rack ${pose.rack}`,
      "#6d28d9",
      30
    );
    label.scale.set(1.9, 0.5, 1);
    label.position.set(0, 1.72, 0);
    group.add(label);
    scene.add(group);
  });
}
function rackZStart(rack) {
  if (rack === 1) return -CENTER_Z;
  if (rack === 2) return -CENTER_Z + RACK_DEPTH + AISLE_WIDTH;
  if (rack === 3) return -CENTER_Z + RACK_DEPTH + AISLE_WIDTH + RACK_DEPTH + CENTRAL_RACK_GAP;
  return -CENTER_Z + RACK_DEPTH + AISLE_WIDTH + RACK_DEPTH + CENTRAL_RACK_GAP + RACK_DEPTH + AISLE_WIDTH;
}

function moduleXStart(moduleIndex) {
  return (moduleIndex - 1) * MODULE_WIDTH - CENTER_X;
}

function slotCenter(rack, moduleIndex, level, position, depth) {
  const x0 = moduleXStart(moduleIndex) + (position - 1) * POSITION_STEP;
  const z0 = rackZStart(rack) + (depth - 1) * DEPTH_WIDTH;
  return [
    x0 + POSITION_WIDTH / 2,
    BASE_Y + (level - 1) * LEVEL_HEIGHT + LEVEL_HEIGHT / 2,
    z0 + DEPTH_WIDTH / 2,
  ];
}

function createInstancedBoxMesh(scene, size, count, material, name) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), material, Math.max(1, count));
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  return mesh;
}

function setBoxInstance(mesh, index, position, scale = [1, 1, 1], color = null) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion(),
    new THREE.Vector3(...scale)
  );
  mesh.setMatrixAt(index, matrix);
  if (color) mesh.setColorAt(index, color instanceof THREE.Color ? color : new THREE.Color(color));
}

function createRackCity(
  scene,
  allCells,
  filteredCells,
  selected,
  _setSelected,
  maxStock,
  meshMap,
  mats,
  showAllStructure,
  occupancyMode = "todas",
  filters = {},
  query = "",
  structureScopeCells = filteredCells,
  rackFace = "front",
  zone = "300",
  currentView = "iso"
) {
  const filteredKeys = new Set(filteredCells.map((cell) => cell.code));
  const renderFilteredSlotsOnly = occupancyMode !== "todas";
  const cellBySlot = new Map(allCells.map((cell) => [`${cell.rack}-${cell.moduleInRack}-${cell.physicalLevel}-${cell.physicalDepth}-${cell.physicalPosition}`, cell]));
  const selectable = [];
  const visibleSlots = [];
  const visibleCount = showAllStructure ? allCells.length : filteredCells.length;
  const labelLimit = visibleCount <= 900 || filteredCells.length <= 240;
  const rackFocused = filters.rack && filters.rack !== "todos";
  const frontalDepthMode = rackFocused && currentView === "depth";
  const levelOnlyFocus = filters.nivel !== "todos" && filters.posicion === "todos" && filters.profundidad === "todos";

  createRackStructure(scene, mats, showAllStructure ? [] : structureScopeCells);

  const renderedRacks = showAllStructure
    ? new Set(Array.from({ length: RACKS }, (_, index) => index + 1))
    : filters.rack && filters.rack !== "todos"
      ? new Set([Number(filters.rack)])
      : new Set(filteredCells.map((cell) => cell.rack));
  renderedRacks.forEach((rack) => {
    const zCenter = rackZStart(rack) + RACK_DEPTH / 2;
    const rackLabel = createPlainTextSprite(`Rack ${rack}`, "#0b1f4d", 28);
    rackLabel.scale.set(0.72, 0.22, 1);
    rackLabel.position.set(-CENTER_X - 0.55, 0.24, zCenter);
    scene.add(rackLabel);
  });
  const renderedModules = showAllStructure
    ? new Set(
        Array.from({ length: RACKS }, (_, rackIndex) =>
          Array.from({ length: MODULES_PER_RACK }, (_, moduleIndex) => `${rackIndex + 1}-${moduleIndex + 1}`)
        ).flat()
      )
    : filters.rack && filters.rack !== "todos" && (!filters.modulo || filters.modulo === "todos")
      ? new Set(Array.from({ length: MODULES_PER_RACK }, (_, moduleIndex) => `${Number(filters.rack)}-${moduleIndex + 1}`))
      : filters.modulo && filters.modulo !== "todos"
        ? new Set(Array.from(renderedRacks).map((rack) => `${rack}-${Number(filters.modulo)}`))
        : new Set(filteredCells.map((cell) => `${cell.rack}-${cell.moduleInRack}`));

  for (let rack = 1; rack <= RACKS; rack += 1) {
    for (let moduleIndex = 1; moduleIndex <= MODULES_PER_RACK; moduleIndex += 1) {
      if (renderedModules.has(`${rack}-${moduleIndex}`) && (!showAllStructure || rack === 1)) {
        const rackFiltered = filters.rack && filters.rack !== "todos";
        const moduleLabel = rackFiltered
          ? createTextSprite(`M${moduleIndex}`, '#111827', 26)
          : createPlainTextSprite(`M${moduleIndex}`, '#111827', 26);
        moduleLabel.scale.set(rackFiltered ? 0.72 : 0.58, rackFiltered ? 0.22 : 0.18, 1);
        moduleLabel.position.set(
          moduleXStart(moduleIndex) + MODULE_WIDTH / 2,
          rackFiltered ? BASE_Y + LEVELS * LEVEL_HEIGHT + 0.58 : BASE_Y + LEVELS * LEVEL_HEIGHT + 0.42,
          rackFiltered
            ? rackZStart(rack) + (rackFace === "back" ? -0.2 : RACK_DEPTH + 0.2)
            : rackZStart(rack) + RACK_DEPTH / 2
        );
        scene.add(moduleLabel);
      }
      for (let level = 1; level <= LEVELS; level += 1) {
        for (let depth = 1; depth <= DEPTHS; depth += 1) {
          for (let position = 1; position <= FRONT_POSITIONS; position += 1) {
            const cell = cellBySlot.get(`${rack}-${moduleIndex}-${level}-${depth}-${position}`) || {
              rack,
              pasillo: Number(aisleForRack(rack)),
              moduleInRack: moduleIndex,
              physicalLevel: level,
              physicalDepth: depth,
              physicalPosition: position,
              stock: 0,
              placeholder: true,
            };
            if (!cell.code || String(cell.code).startsWith("R")) {
              cell.code = slotLocationCode(cell, zone);
            }
            const isFiltered = !cell.placeholder && filteredKeys.has(cell.code);
            const inStructuralScope = slotMatchesStructuralFilters(cell, filters, query);
            if (!showAllStructure && !isFiltered && !inStructuralScope) continue;
            const isSelected = selected?.code && selected.code === cell.code;
            const occupancyVisible = occupancyMode === "todas" || isFiltered;
            if (renderFilteredSlotsOnly && !occupancyVisible && !isSelected) continue;
            const position3d = slotCenter(rack, moduleIndex, level, position, depth);
            const activeFaceDepth = rackFace === "back" ? 2 : 1;
            const depthNumber = Number(cell.physicalDepth || 1);
            const rackCenterZ = rackZStart(rack) + RACK_DEPTH / 2;
            const rackAisleZ = aisleForRack(rack) === "1" ? AISLE_Z[0] : AISLE_Z[1];
            const rackDirection = rackCenterZ >= rackAisleZ ? 1 : -1;
            const backDepth = rackDirection >= 0 ? 2 : 1;
            const isBackDepth = depthNumber === backDepth;
            const depthSide = rackDirection >= 0 ? 1 : -1;
            const dimmed = rackFocused && !frontalDepthMode && depthNumber !== activeFaceDepth;
            const color = isSelected
              ? new THREE.Color(0xd946ef)
              : dimmed
                ? new THREE.Color(0xdbe3ee)
                : new THREE.Color(stockColor(cell, maxStock));
            const displayColor = frontalDepthMode && isBackDepth && !isSelected
              ? new THREE.Color(Number(cell.stock || 0) > 0 ? 0x007a46 : 0xc9001f)
              : color;
            const depthScale = frontalDepthMode
              ? isBackDepth
                ? [0.98, 1.02, 0.74]
                : [0.98, 0.64, 0.62]
              : [1, 1, 1];
            const isOccupied = Number(cell.stock || 0) > 0;
            const loadScale = isOccupied
              ? [depthScale[0] * 0.96, depthScale[1] * 0.84, depthScale[2] * 0.94]
              : depthScale;
            const depthOffset = frontalDepthMode
              ? isBackDepth
                ? [0, 0.06, depthSide * 0.12]
                : [0, -0.12, -depthSide * 0.18]
              : [0, 0, 0];
            const loadLift = isOccupied ? LEVEL_HEIGHT * 0.7 * depthScale[1] * 0.06 : 0;
            visibleSlots.push({
              cell,
              position: [
                position3d[0] + depthOffset[0],
                position3d[1] + depthOffset[1] + loadLift,
                position3d[2] + depthOffset[2],
              ],
              scale: loadScale,
              palletScale: depthScale,
              color: displayColor,
              isSelected,
              dimmed,
              isBackDepth,
            });
            selectable.push(cell);
          }
        }
      }
    }
  }

  const emptySlots = visibleSlots.filter((slot) => Number(slot.cell.stock || 0) <= 0 && !(frontalDepthMode && slot.isBackDepth));
  const occupiedSlots = visibleSlots.filter((slot) => Number(slot.cell.stock || 0) > 0 && !(frontalDepthMode && slot.isBackDepth));
  const backEmptySlots = frontalDepthMode ? visibleSlots.filter((slot) => Number(slot.cell.stock || 0) <= 0 && slot.isBackDepth) : [];
  const backOccupiedSlots = frontalDepthMode ? visibleSlots.filter((slot) => Number(slot.cell.stock || 0) > 0 && slot.isBackDepth) : [];
  const backDepthOutlineSlots = frontalDepthMode ? visibleSlots.filter((slot) => slot.isBackDepth && !slot.isSelected) : [];
  const slotSize = [POSITION_WIDTH * 0.84, LEVEL_HEIGHT * 0.7, DEPTH_WIDTH * 0.8];
  const occupiedPalletSlots = visibleSlots.filter((slot) => Number(slot.cell.stock || 0) > 0);
  const emptyMesh = createInstancedBoxMesh(scene, slotSize, emptySlots.length, new THREE.MeshBasicMaterial({ color: 0xff3347, transparent: true, opacity: 0.92 }), 'Ubicaciones vacias');
  const occupiedMesh = createInstancedBoxMesh(scene, slotSize, occupiedSlots.length, new THREE.MeshBasicMaterial({ color: 0x00b894, transparent: true, opacity: 0.94 }), 'Ubicaciones ocupadas');
  const backEmptyMesh = createInstancedBoxMesh(scene, slotSize, backEmptySlots.length, new THREE.MeshBasicMaterial({ color: 0xb8001d, transparent: true, opacity: 0.98 }), 'Ubicaciones vacias posteriores');
  const backOccupiedMesh = createInstancedBoxMesh(scene, slotSize, backOccupiedSlots.length, new THREE.MeshBasicMaterial({ color: 0x007a46, transparent: true, opacity: 0.98 }), 'Ubicaciones ocupadas posteriores');
  const palletBaseMesh = createInstancedBoxMesh(scene, [slotSize[0] * 0.92, 0.045, slotSize[2] * 0.72], occupiedPalletSlots.length, createMaterial(0x9a5a13, { roughness: 0.78 }), 'Estibas apoyadas en larguero');
  const palletSlatMesh = createInstancedBoxMesh(scene, [slotSize[0] * 0.16, 0.055, slotSize[2] * 0.74], occupiedPalletSlots.length * 4, createMaterial(0xd6a15d, { roughness: 0.8 }), 'Tablillas de estiba ocupada');
  const palletFrontMesh = createInstancedBoxMesh(scene, [slotSize[0] * 0.98, 0.055, 0.05], occupiedPalletSlots.length, createMaterial(0x6f3f0f, { roughness: 0.82 }), 'Frente de estiba apoyada');
  const backDepthOutlineMesh = frontalDepthMode
    ? createInstancedBoxMesh(
        scene,
        [slotSize[0] * 1.03, slotSize[1] * 1.07, slotSize[2] * 1.03],
        backDepthOutlineSlots.length,
        new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.5, wireframe: true }),
        'Borde profundidad posterior'
      )
    : null;

  [
    [emptyMesh, emptySlots],
    [occupiedMesh, occupiedSlots],
    [backEmptyMesh, backEmptySlots],
    [backOccupiedMesh, backOccupiedSlots],
  ].forEach(([mesh, slots]) => {
    mesh.userData.instanceCells = [];
    slots.forEach((slot, index) => {
      setBoxInstance(mesh, index, slot.position, slot.scale || [1, 1, 1]);
      mesh.userData.instanceCells[index] = slot.cell;
    });
    mesh.instanceMatrix.needsUpdate = true;
    meshMap.set(mesh, null);
  });
  if (backDepthOutlineMesh) {
    backDepthOutlineSlots.forEach((slot, index) => {
      setBoxInstance(backDepthOutlineMesh, index, slot.position, slot.scale || [1, 1, 1]);
    });
    backDepthOutlineMesh.instanceMatrix.needsUpdate = true;
    backDepthOutlineMesh.renderOrder = 12;
  }
  occupiedPalletSlots.forEach((slot, index) => {
    const rackCenterZ = rackZStart(Number(slot.cell.rack)) + RACK_DEPTH / 2;
    const aisleZ = aisleForRack(slot.cell.rack) === "1" ? AISLE_Z[0] : AISLE_Z[1];
    const faceDirection = rackCenterZ >= aisleZ ? -1 : 1;
    const scaledSlotHeight = slotSize[1] * (slot.scale?.[1] || 1);
    const slotBottomY = slot.position[1] - scaledSlotHeight / 2;
    const palletScale = slot.palletScale || slot.scale || [1, 1, 1];
    const palletY = slotBottomY - 0.035;
    const faceZ = slot.position[2] + faceDirection * slotSize[2] * 0.5 * (palletScale[2] || 1);
    setBoxInstance(palletBaseMesh, index, [slot.position[0], palletY - 0.012, slot.position[2]], palletScale);
    [-0.36, -0.12, 0.12, 0.36].forEach((offset, slatIndex) => {
      const slatX = slot.position[0] + offset * slotSize[0] * (palletScale[0] || 1);
      setBoxInstance(palletSlatMesh, index * 4 + slatIndex, [slatX, palletY + 0.025, slot.position[2]], palletScale);
    });
    setBoxInstance(palletFrontMesh, index, [slot.position[0], palletY + 0.02, faceZ], palletScale);
  });
  palletBaseMesh.instanceMatrix.needsUpdate = true;
  palletSlatMesh.instanceMatrix.needsUpdate = true;
  palletFrontMesh.instanceMatrix.needsUpdate = true;
  palletBaseMesh.renderOrder = 28;
  palletSlatMesh.renderOrder = 34;
  palletFrontMesh.renderOrder = 35;

  visibleSlots.forEach((slot) => {
    if (slot.isSelected) {
      addBox(scene, [POSITION_WIDTH * 0.96, LEVEL_HEIGHT * 0.82, DEPTH_WIDTH * 0.92], slot.position, mats.selected, 'Ubicacion seleccionada');
    }
    const activeFaceDepth = rackFace === "back" ? 2 : 1;
    const slotDepth = Number(slot.cell.physicalDepth || 1);
    const slotRackCenterZ = rackZStart(Number(slot.cell.rack)) + RACK_DEPTH / 2;
    const slotRackAisleZ = Number(slot.cell.rack) <= 2 ? AISLE_Z[0] : AISLE_Z[1];
    const slotRackDirection = slotRackCenterZ >= slotRackAisleZ ? 1 : -1;
    const slotBackDepth = slotRackDirection >= 0 ? 2 : 1;
    const slotIsBackDepth = slotDepth === slotBackDepth;
    const labelBelongsToFace = frontalDepthMode || !rackFocused || slotDepth === activeFaceDepth;
    const shouldLabel = selected
      ? slot.isSelected
      : rackFocused && labelBelongsToFace && (rackFocused || (labelLimit && !renderFilteredSlotsOnly) || (!showAllStructure && filteredCells.length <= 360) || (renderFilteredSlotsOnly && filteredCells.length <= 360));
    if (shouldLabel) {
      const label = createTextSprite(slot.cell.code, '#111827', rackFocused ? 28 : 34);
      const faceOffset = frontalDepthMode
        ? (slotIsBackDepth ? slotRackDirection * 0.16 : -slotRackDirection * 0.24)
        : rackFocused
          ? (rackFace === "back" ? -1.03 : 1.03)
          : 0.03;
      label.scale.set(
        slot.isSelected ? 0.62 : frontalDepthMode ? (slotIsBackDepth ? 0.44 : 0.36) : rackFocused ? 0.62 : 0.82,
        slot.isSelected ? 0.18 : frontalDepthMode ? (slotIsBackDepth ? 0.13 : 0.1) : rackFocused ? 0.18 : 0.24,
        1
      );
      label.position.set(
        slot.position[0],
        slot.isSelected
          ? slot.position[1] + 0.08
          : frontalDepthMode
            ? slot.position[1] + (slotIsBackDepth ? 0.08 : -0.12)
            : rackFocused
              ? slot.position[1]
              : slot.position[1] + 0.46,
        slot.position[2] + faceOffset
      );
      label.renderOrder = rackFocused ? 60 : label.renderOrder;
      scene.add(label);
    }
  });
}

function createRackStructure(scene, mats, structureCells = []) {
  const postPositions = [];
  const beamLong = [];
  const beamTrans = [];
  const protectorPositions = [];
  const rackHeight = BASE_Y + LEVELS * LEVEL_HEIGHT + 0.55;
  const allowedModules = new Set((structureCells || []).map((cell) => `${cell.rack}-${cell.moduleInRack}`));
  const allowedLevels = new Set((structureCells || []).map((cell) => cell.physicalLevel));
  const fullStructure = !allowedModules.size || allowedModules.size >= RACKS * MODULES_PER_RACK;
  const levelValues = [...allowedLevels].filter(Boolean).sort((a, b) => a - b);
  const clippedByLevel = !fullStructure && levelValues.length > 0 && levelValues.length < LEVELS;
  const levelMin = clippedByLevel ? levelValues[0] : 1;
  const levelMax = clippedByLevel ? levelValues[levelValues.length - 1] : LEVELS;
  const postBaseY = clippedByLevel ? Math.max(0.05, BASE_Y + (levelMin - 1) * LEVEL_HEIGHT - 0.14) : 0;
  const postTopY = clippedByLevel ? BASE_Y + levelMax * LEVEL_HEIGHT + 0.24 : rackHeight;
  const postHeight = Math.max(0.72, postTopY - postBaseY);
  const postCenterY = postBaseY + postHeight / 2;
  const height = postTopY;

  for (let rack = 1; rack <= RACKS; rack += 1) {
    for (let moduleIndex = 1; moduleIndex <= MODULES_PER_RACK; moduleIndex += 1) {
      if (!fullStructure && !allowedModules.has(`${rack}-${moduleIndex}`)) continue;
      const x0 = moduleXStart(moduleIndex);
      const x1 = x0 + MODULE_WIDTH;
      const xMid = x0 + POSITION_STEP;
      const zFront = rackZStart(rack);
      const zMid = zFront + DEPTH_WIDTH;
      const zBack = zFront + RACK_DEPTH;

      [x0, xMid, x1].forEach((x) => {
        [zFront, zMid, zBack].forEach((z) => postPositions.push([x, postCenterY, z]));
      });

      [x0, x1].forEach((x) => {
        [zFront, zBack].forEach((z) => protectorPositions.push([x, 0.04, z]));
      });

      for (let level = 1; level <= LEVELS; level += 1) {
        if (!fullStructure && allowedLevels.size && !allowedLevels.has(level)) continue;
        const y = BASE_Y + level * LEVEL_HEIGHT;
        [zFront, zMid, zBack].forEach((z) => beamLong.push([x0 + MODULE_WIDTH / 2, y, z]));
        [x0, xMid, x1].forEach((x) => beamTrans.push([x, y, zFront + RACK_DEPTH / 2]));
      }

      if (!clippedByLevel && moduleIndex % 2 === 1) {
        createRackDiagonal(scene, [x0, BASE_Y, zFront - 0.03], [x1, height - 0.3, zFront - 0.03], mats.post);
        createRackDiagonal(scene, [x1, BASE_Y, zBack + 0.03], [x0, height - 0.3, zBack + 0.03], mats.post);
      }
    }
  }

  const postMesh = createInstancedBoxMesh(scene, [0.09, postHeight, 0.09], postPositions.length, mats.post, 'Postes de racks');
  postPositions.forEach((position, index) => setBoxInstance(postMesh, index, position));
  postMesh.instanceMatrix.needsUpdate = true;

  const beamLongMesh = createInstancedBoxMesh(scene, [MODULE_WIDTH, 0.07, 0.08], beamLong.length, mats.beam, 'Vigas longitudinales');
  beamLong.forEach((position, index) => setBoxInstance(beamLongMesh, index, position));
  beamLongMesh.instanceMatrix.needsUpdate = true;

  const beamTransMesh = createInstancedBoxMesh(scene, [0.07, 0.065, RACK_DEPTH], beamTrans.length, mats.beam, 'Vigas transversales');
  beamTrans.forEach((position, index) => setBoxInstance(beamTransMesh, index, position));
  beamTransMesh.instanceMatrix.needsUpdate = true;

  const protectorMesh = createInstancedBoxMesh(scene, [0.26, 0.2, 0.26], protectorPositions.length, createMaterial(0xffea00, { roughness: 0.35 }), 'Protectores de rack');
  protectorPositions.forEach((position, index) => setBoxInstance(protectorMesh, index, position));
  protectorMesh.instanceMatrix.needsUpdate = true;
}

function createRackDiagonal(scene, start, end, material) {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const delta = new THREE.Vector3().subVectors(endVec, startVec);
  const length = delta.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, length, 8), material);
  mesh.position.copy(startVec).add(endVec).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  scene.add(mesh);
}
function addModuleLabel(group, text, position) {
  const sprite = createTextSprite(text, "#111827", 58);
  sprite.scale.set(1.6, 0.5, 1);
  sprite.position.set(...position);
  group.add(sprite);
}

function FilterSelect({ label, value, onChange, options, prefix = "", allValue = "todos", allLabel = "Todos" }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => { onChange(event.target.value); event.target.blur(); }}>
        <option value={allValue}>{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>{prefix}{option}</option>
        ))}
      </select>
    </label>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <article className="layout3d-kpi">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function Detail({ label, value }) {
  return (
    <div className="layout3d-detail-row">
      <span>{label}</span>
      <strong>{value || "Sin dato"}</strong>
    </div>
  );
}

const layoutStyles = `
.layout-zone-page {
  display: grid;
  gap: 22px;
  min-width: 0;
  color: #10172f;
  padding: 30px 38px 36px;
  overflow: hidden;
  background:
    radial-gradient(circle at 90% 0%, rgba(109, 40, 217, .06), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,251,255,.98));
  border: 1px solid #dfe8f5;
  border-radius: 18px;
}

.layout-zone-header {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) minmax(420px, 540px);
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 0 12px;
}

.layout-zone-brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  box-shadow: 0 18px 34px rgba(109, 40, 217, .25);
}

.layout-zone-header h1,
.layout-zone-config h1 {
  margin: 8px 0 6px;
  font-size: 34px;
  line-height: 1.05;
  letter-spacing: -.02em;
}

.layout-zone-header p,
.layout-zone-config p {
  margin: 0;
  color: #73819b;
  font-weight: 700;
}

.layout-zone-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(560px, 100%);
}

.layout-zone-search {
  flex: 1;
  min-height: 52px;
  border: 1px solid #dbe5f3;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  background: #fff;
  color: #64748b;
  box-shadow: 0 16px 36px rgba(15, 23, 42, .06);
}

.layout-zone-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #17213b;
  font-weight: 800;
}

.layout-zone-toggle {
  display: flex;
  gap: 5px;
  padding: 4px;
  border: 1px solid #dbe5f3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, .06);
}

.layout-zone-toggle button {
  width: 46px;
  height: 44px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.layout-zone-toggle button.active {
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  box-shadow: 0 10px 22px rgba(109, 40, 217, .22);
}

.layout-zone-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
}

.layout-zone-kpis article {
  min-height: 112px;
  border: 1px solid #dfe8f5;
  border-radius: 12px;
  display: grid;
  grid-template-columns: 60px 1fr;
  grid-template-areas: "icon value" "icon label";
  align-items: center;
  column-gap: 16px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, .07);
  border-bottom: 3px solid #dfe8f5;
}

.layout-zone-kpis article:nth-child(1) { border-bottom-color: #22c55e; }
.layout-zone-kpis article:nth-child(2) { border-bottom-color: #8b5cf6; }
.layout-zone-kpis article:nth-child(3) { border-bottom-color: #fb923c; }
.layout-zone-kpis article:nth-child(4) { border-bottom-color: #22d3ee; }
.layout-zone-kpis article:nth-child(5) { border-bottom-color: #8b5cf6; }

.layout-zone-kpis article span {
  grid-area: icon;
  width: 54px;
  height: 54px;
  border-radius: 15px;
  display: grid;
  place-items: center;
}

.layout-zone-kpis article span.green { color: #16a34a; background: #dcfce7; }
.layout-zone-kpis article span.purple { color: #6d28d9; background: #f3e8ff; }
.layout-zone-kpis article span.orange { color: #f97316; background: #ffedd5; }
.layout-zone-kpis article span.cyan { color: #0891b2; background: #cffafe; }
.layout-zone-kpis article span.violet { color: #7c3aed; background: #ede9fe; }

.layout-zone-kpis article strong {
  grid-area: value;
  color: #0f172a;
  font-size: 30px;
  line-height: 1;
  font-weight: 950;
}

.layout-zone-kpis article small {
  grid-area: label;
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.layout-zone-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 4px;
}

.layout-zone-section-title div {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #6d28d9;
}

.layout-zone-section-title h2 {
  margin: 0;
  color: #141b34;
  font-size: 21px;
  line-height: 1;
  font-weight: 950;
}

.layout-zone-section-title span {
  border-radius: 999px;
  padding: 6px 10px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

.layout-zone-edit {
  position: absolute;
  top: 43px;
  right: 12px;
  width: 24px;
  height: 24px;
  border: 1px solid #dbe5f3;
  border-radius: 8px;
  display: grid;
  place-items: center;
  padding: 0;
  background: #fff;
  color: #64748b;
  opacity: .78;
  cursor: pointer;
}

.layout-zone-edit:hover {
  opacity: 1;
  color: var(--zone-text, #1d4ed8);
  border-color: color-mix(in srgb, var(--zone-accent, #2563eb), #ffffff 55%);
  background: var(--zone-soft, #eff6ff);
}

.layout-zone-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(15, 23, 42, .42);
  backdrop-filter: blur(8px);
}

.layout-zone-modal {
  width: min(560px, 100%);
  border: 1px solid #dfe8f5;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 28px 80px rgba(15, 23, 42, .22);
  overflow: hidden;
}

.layout-zone-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid #e5edf7;
}

.layout-zone-modal-head h2 {
  margin: 5px 0 4px;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.05;
  font-weight: 950;
}

.layout-zone-modal-head p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}

.layout-zone-modal-close {
  width: 38px;
  height: 38px;
  border: 1px solid #dbe5f3;
  border-radius: 12px;
  background: #fff;
  color: #0f172a;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.layout-zone-modal-field {
  display: grid;
  gap: 7px;
  padding: 18px 22px 0;
}

.layout-zone-modal-field span {
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.layout-zone-modal-field input {
  width: 100%;
  height: 46px;
  border: 1px solid #d8e3f2;
  border-radius: 12px;
  outline: none;
  background: #fff;
  color: #10213a;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 850;
}

.layout-zone-modal-field input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(109, 40, 217, .10);
}

.layout-zone-modal-note {
  margin: 14px 22px 0;
  padding: 12px 14px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #eff6ff;
  color: #315a7d;
  font-size: 12px;
  font-weight: 800;
}

.layout-zone-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 22px 22px;
}

.layout-zone-modal-actions button {
  min-height: 38px;
  border: 1px solid #d8e3f2;
  border-radius: 11px;
  background: linear-gradient(135deg, #4c1d95, #6d28d9);
  color: #fff;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
}

.layout-zone-modal-actions button.secondary {
  background: #fff;
  color: #17213b;
}

.layout-zone-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  justify-content: center;
  align-items: start;
}

.layout-zone-list {
  display: grid;
  gap: 10px;
}

.layout-zone-list .layout-zone-card {
  position: relative;
  min-height: 180px;
  border: 1px solid #dfe8f5;
  border-radius: 12px;
  display: grid;
  justify-items: start;
  align-content: start;
  gap: 8px;
  padding: 18px 14px 14px;
  background: #fff;
  box-shadow: 0 14px 32px rgba(15, 23, 42, .065);
  text-align: left;
  overflow: hidden;
}

.layout-zone-card {
  position: relative;
  min-height: 174px;
  border: 1px solid #dfe8f5;
  border-radius: 12px;
  display: grid;
  justify-items: start;
  align-content: start;
  gap: 8px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, .075);
  text-align: left;
  overflow: hidden;
}

.layout-zone-status {
  position: absolute;
  top: 12px;
  right: 16px;
  border-radius: 999px;
  padding: 5px 9px;
  background: #dcfce7;
  color: #047857;
  font-size: 10px;
  font-weight: 950;
}

.layout-zone-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--zone-accent, #2563eb), color-mix(in srgb, var(--zone-accent, #2563eb), #ffffff 18%));
  box-shadow: 0 14px 28px color-mix(in srgb, var(--zone-accent, #2563eb), transparent 75%);
}

.layout-zone-card small {
  color: #334155;
  font-weight: 950;
  font-size: 13px;
}

.layout-zone-card h2 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  line-height: 1.12;
  font-weight: 950;
}

.layout-zone-card p {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-weight: 900;
}

.layout-zone-card em {
  max-width: 100%;
  color: #7b8798;
  font-size: 12px;
  font-style: normal;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-zone-card button,
.layout-zone-config button,
.layout3d-secondary {
  min-height: 34px;
  border: 1px solid color-mix(in srgb, var(--zone-accent, #2563eb), #ffffff 55%);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
  background: #fff;
  color: var(--zone-text, #1d4ed8);
  font-weight: 950;
  cursor: pointer;
}

.layout-zone-card > button:last-child {
  width: 100%;
  margin-top: 5px;
  border-color: color-mix(in srgb, var(--zone-accent, #6d28d9), #ffffff 62%);
  background: color-mix(in srgb, var(--zone-soft, #eff6ff), #ffffff 45%);
}

.layout-zone-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 10px 0;
  color: #65748c;
  font-size: 12px;
  font-weight: 800;
}

.layout-zone-pagination {
  display: flex;
  align-items: center;
  gap: 10px;
}

.layout-zone-pagination button,
.layout-zone-pagination strong {
  width: 40px;
  height: 40px;
  border: 1px solid #dfe8f5;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #fff;
  color: #64748b;
}

.layout-zone-pagination strong {
  color: #6d28d9;
  border-color: #c4b5fd;
  background: #f5f3ff;
  font-weight: 950;
}

.layout-zone-empty-card,
.layout-zone-config {
  border: 1px solid #dfe8f5;
  border-radius: 18px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 16px 42px rgba(15, 23, 42, .06);
}

.layout-zone-config {
  min-height: 520px;
  display: grid;
  align-content: start;
  gap: 70px;
}

.layout-zone-config-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layout-zone-config-top span {
  border-radius: 999px;
  padding: 8px 12px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 950;
}

.layout-zone-config-body {
  max-width: 680px;
  justify-self: center;
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;
}

.layout-zone-config-body strong {
  border-radius: 999px;
  padding: 8px 14px;
  background: #f8fafc;
  color: #0f172a;
}

.layout3d-hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.layout3d-secondary {
  --zone-accent: #2563eb;
  --zone-soft: #eff6ff;
  --zone-text: #1d4ed8;
  background: #fff;
}
.layout3d-page {
  display: grid;
  gap: 16px;
  color: #10172f;
  min-width: 0;
}

.layout3d-hero,
.layout3d-toolbar,
.layout3d-filter-panel,
.layout3d-kpis,
.layout3d-stage-card,
.layout3d-detail {
  border: 1px solid #dfe8f5;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 18px 44px rgba(17, 24, 39, .07);
}

.layout3d-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 20px 22px;
  border-radius: 20px;
}

.layout3d-kicker {
  color: ${WMS_PURPLE};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.layout3d-hero h1 {
  margin: 6px 0;
  font-size: 34px;
  line-height: 1;
}

.layout3d-hero p,
.layout3d-detail p {
  margin: 0;
  color: #5f6f8a;
  font-weight: 650;
}

.layout3d-primary,
.layout3d-views button {
  min-height: 42px;
  border: 1px solid #d8e3f2;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
  background: #fff;
  color: #17213b;
  font-weight: 900;
  cursor: pointer;
}

.layout3d-primary,
.layout3d-views button.active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #4c1d95, ${WMS_PURPLE});
  box-shadow: 0 18px 32px rgba(109, 40, 217, .22);
}

.layout3d-error {
  padding: 14px 16px;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fff1f2;
  color: #b91c1c;
  font-weight: 800;
}

.layout3d-toolbar {
  display: grid;
  grid-template-columns: 190px minmax(280px, 1fr) auto;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
}

.layout3d-toolbar label {
  min-height: 42px;
  border: 1px solid #d8e3f2;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  background: #fff;
}

.layout3d-toolbar label span {
  color: #697891;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.layout3d-toolbar select,
.layout3d-toolbar input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #17213b;
  font-weight: 850;
}

.layout3d-search {
  color: #64748b;
}

.layout3d-views {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.layout3d-filter-panel {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
}

.layout3d-filter-panel label {
  display: grid;
  gap: 6px;
}

.layout3d-filter-panel span {
  color: #697891;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.layout3d-filter-panel select,
.layout3d-filter-panel button {
  min-height: 34px;
  border: 1px solid #d8e3f2;
  border-radius: 12px;
  background: #fff;
  color: #17213b;
  padding: 0 10px;
  font-weight: 850;
}

.layout3d-filter-panel button {
  align-self: end;
  color: #fff;
  background: linear-gradient(135deg, #4c1d95, #6d28d9);
  cursor: pointer;
}


.layout3d-operator-strip {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #d9e4f4;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(109,40,217,.10), rgba(34,211,238,.08), #fff);
}

.layout3d-operator-strip div {
  min-width: 210px;
}

.layout3d-operator-strip span {
  display: block;
  color: #6b7890;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.layout3d-operator-strip strong {
  color: #111827;
  font-size: 14px;
}

.layout3d-operator-strip small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.layout3d-operator-strip button {
  border: 1px solid #d9e4f4;
  border-radius: 12px;
  padding: 10px 14px;
  background: #fff;
  color: #17213b;
  font-weight: 950;
  cursor: pointer;
}

.layout3d-operator-strip button.active {
  border-color: transparent;
  background: linear-gradient(135deg, #4c1d95, #7c3aed);
  color: #fff;
  box-shadow: 0 16px 30px rgba(109,40,217,.22);
}
.layout3d-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border-radius: 14px;
}

.layout3d-kpi {
  min-height: 42px;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: #fff;
}

.layout3d-kpi > span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  color: ${WMS_PURPLE};
  border-radius: 8px;
  background: #f1edff;
}

.layout3d-kpi small {
  color: #687792;
  font-size: 10px;
  font-weight: 850;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout3d-kpi strong {
  font-size: 16px;
  line-height: 1;
  text-align: right;
}

.layout3d-stage-card {
  overflow: hidden;
  border-radius: 22px;
}

.layout3d-stage-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px;
  border-bottom: 1px solid #dfe8f5;
}

.layout3d-stage-head h2 {
  margin: 5px 0 0;
  font-size: 24px;
}

.layout3d-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.layout3d-legend span {
  color: #66758e;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 850;
}

.layout3d-legend i {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  display: inline-block;
}

.layout3d-legend .layout3d-dot {
  width: 9px !important;
  height: 9px !important;
  min-width: 9px !important;
  min-height: 9px !important;
  max-width: 9px !important;
  max-height: 9px !important;
  border-radius: 999px !important;
  display: inline-block !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: 0 0 0 2px rgba(255,255,255,.92);
}

.layout3d-legend .empty { background: #ef4444; }
.layout3d-legend .occupied { background: #16a34a; }
.layout3d-legend .low { background: #ef4444; }
.layout3d-legend .mid { background: #f59e0b; }
.layout3d-legend .good { background: #22c55e; }
.layout3d-legend .full { background: #2563eb; }
.layout3d-legend .selected { background: #d946ef; }

.layout3d-canvas-wrap {
  position: relative;
  height: min(76vh, 820px);
  min-height: 680px;
  background: radial-gradient(circle at 80% 15%, rgba(109,40,217,.13), transparent 30%), linear-gradient(180deg, #f6f8fc, #edf3fb);
}

.layout3d-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.layout3d-loading {
  position: absolute;
  inset: 24px;
  z-index: 2;
  display: grid;
  place-items: center;
  border: 1px dashed rgba(109, 40, 217, .35);
  border-radius: 20px;
  background: rgba(255,255,255,.62);
  color: ${WMS_PURPLE};
  font-weight: 950;
  pointer-events: none;
}

.layout3d-analysis-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.layout3d-analysis-strip article {
  border: 1px solid #dfe8f5;
  border-radius: 16px;
  padding: 14px 16px;
  background: linear-gradient(180deg, #ffffff, #f6f2ff);
}

.layout3d-analysis-strip span {
  display: block;
  color: #697891;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.layout3d-analysis-strip strong {
  display: block;
  margin-top: 5px;
  font-size: 26px;
}

.layout3d-table-card {
  border: 1px solid #dfe8f5;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
}

.layout3d-table-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.layout3d-table-wrap {
  max-height: 320px;
  overflow: auto;
}

.layout3d-table-card table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.layout3d-table-card th,
.layout3d-table-card td {
  padding: 10px 12px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  white-space: nowrap;
}

.layout3d-table-card th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f3f6fb;
  color: #17213b;
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.layout3d-table-card tr {
  cursor: pointer;
}

.layout3d-table-card tr.active,
.layout3d-table-card tr:hover {
  background: #f4efff;
}

.layout3d-detail-grid {
  display: grid;
  grid-template-columns: 1.2fr .8fr;
  gap: 14px;
}

.layout3d-detail {
  min-height: 160px;
  padding: 20px;
  border-radius: 18px;
}

.layout3d-detail h3 {
  margin: 8px 0 14px;
  font-size: 24px;
}

.layout3d-detail-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.layout3d-detail-row {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.layout3d-detail-row span,
.layout3d-detail-row strong {
  display: block;
}

.layout3d-detail-row span {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.layout3d-detail-row strong {
  margin-top: 5px;
  color: #17213b;
  font-size: 16px;
}

.layout3d-stock-lines {
  max-height: 260px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.layout3d-stock-lines table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.layout3d-stock-lines th,
.layout3d-stock-lines td {
  padding: 9px 10px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  white-space: nowrap;
}

.layout3d-stock-lines th {
  position: sticky;
  top: 0;
  background: #f3f6fb;
  color: #17213b;
  font-size: 10px;
  text-transform: uppercase;
}

@media (max-width: 1200px) {
  .layout3d-filter-panel { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .layout3d-toolbar {
    grid-template-columns: 180px minmax(220px, 1fr);
  }
  .layout3d-views {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 820px) {
  .layout3d-hero,
  .layout3d-stage-head {
    flex-direction: column;
    align-items: stretch;
  }
  .layout3d-toolbar,
  .layout3d-filter-panel,
  .layout3d-kpis,
  .layout3d-analysis-strip,
  .layout3d-detail-grid,
  .layout3d-detail-list {
    grid-template-columns: 1fr;
  }
  .layout3d-canvas-wrap {
    min-height: 520px;
  }
}
.layout3d-selection-card {
  position: absolute;
  left: 18px;
  bottom: 18px;
  width: min(430px, calc(100% - 36px));
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(109, 40, 217, .18);
  background: rgba(255, 255, 255, .96);
  box-shadow: 0 20px 48px rgba(15, 23, 42, .14);
  backdrop-filter: blur(12px);
  z-index: 3;
}
.layout3d-selection-card.compact {
  top: auto;
  bottom: 58px;
  left: 18px;
  width: min(250px, calc(100% - 36px));
  padding: 9px;
  border-radius: 12px;
  z-index: 6;
}
.layout3d-selection-card.compact .layout3d-selection-top {
  padding-bottom: 8px;
}
.layout3d-selection-card.compact .layout3d-selection-top strong {
  font-size: 17px;
}
.layout3d-selection-card.compact .layout3d-selection-top em {
  min-width: 58px;
  padding: 5px 8px;
  font-size: 9px;
}
.layout3d-selection-card.compact .layout3d-selection-material {
  padding: 6px 0;
}
.layout3d-selection-card.compact .layout3d-selection-material b {
  font-size: 12px;
}
.layout3d-selection-card.compact .layout3d-selection-material p {
  font-size: 10px;
  line-height: 1.25;
}
.layout3d-selection-card.compact .layout3d-selection-grid {
  grid-template-columns: 1fr;
  gap: 4px;
  padding: 6px 0;
}
.layout3d-selection-card.compact .layout3d-selection-grid div {
  padding: 5px 7px;
}
.layout3d-selection-card.compact .layout3d-selection-grid span {
  font-size: 8px;
}
.layout3d-selection-card.compact .layout3d-selection-grid strong {
  font-size: 10px;
}
.layout3d-selection-card.compact .layout3d-selection-total {
  padding: 6px 8px;
}
.layout3d-selection-card.compact .layout3d-selection-total strong {
  font-size: 17px;
}

.layout3d-selection-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e6edf7;
}

.layout3d-selection-top span,
.layout3d-selection-material small,
.layout3d-selection-grid span,
.layout3d-selection-total span {
  display: block;
  color: #6d28d9;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.layout3d-selection-top strong {
  display: block;
  margin-top: 5px;
  font-size: 28px;
  line-height: 1;
  letter-spacing: .01em;
  color: #0f172a;
}

.layout3d-selection-top em {
  flex: 0 0 auto;
  min-width: 76px;
  text-align: center;
  padding: 7px 10px;
  border-radius: 999px;
  font-style: normal;
  font-size: 11px;
  font-weight: 950;
  color: #fff;
  background: #64748b;
}
.layout3d-selection-top em.occupied { background: #16a34a; }
.layout3d-selection-top em.empty { background: #64748b; }

.layout3d-selection-material {
  padding: 12px 0;
  border-bottom: 1px solid #e6edf7;
}

.layout3d-selection-material b {
  display: block;
  margin-top: 5px;
  color: #17213b;
  font-size: 16px;
  font-weight: 950;
}

.layout3d-selection-material p {
  margin: 4px 0 0;
  color: #52627a;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
}

.layout3d-selection-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 0;
}

.layout3d-selection-grid div {
  min-width: 0;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #e7ecf4;
  background: #f8fafc;
}

.layout3d-selection-grid strong {
  display: block;
  margin-top: 4px;
  color: #17213b;
  font-size: 12px;
  font-weight: 950;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.layout3d-selection-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #4c1d95, #6d28d9);
  box-shadow: 0 16px 30px rgba(109, 40, 217, .22);
}

.layout3d-selection-total span {
  color: rgba(255,255,255,.78);
}

.layout3d-selection-total strong {
  color: #fff;
  font-size: 26px;
  line-height: 1;
  font-weight: 950;
}

@media (max-width: 820px) {
  .layout3d-selection-grid {
    grid-template-columns: 1fr;
  }
  .layout3d-selection-card {
    left: 12px;
    right: 12px;
    bottom: 12px;
    width: auto;
  }
}
  font-size: 11px;
}

/* Modo render ampliado final: minimo panel, maximo 3D */
.layout3d-hero,
.layout3d-kpis,
.layout3d-detail-grid {
  display: none !important;
}
.layout3d-toolbar {
  display: grid !important;
  grid-template-columns: 160px minmax(260px, 1fr) auto !important;
  gap: 8px !important;
  padding: 8px !important;
  border-radius: 14px !important;
  box-shadow: none !important;
}
.layout3d-filter-panel {
  display: grid !important;
  grid-template-columns: repeat(8, minmax(92px, 1fr)) !important;
  gap: 6px !important;
  padding: 8px !important;
  border-radius: 14px !important;
  box-shadow: none !important;
}
.layout3d-toolbar label,
.layout3d-filter-panel label {
  min-height: 34px !important;
  gap: 3px !important;
}
.layout3d-toolbar label {
  min-height: 36px !important;
  padding: 0 8px !important;
}
.layout3d-toolbar label span,
.layout3d-filter-panel span {
  font-size: 8px !important;
  letter-spacing: .08em !important;
}
.layout3d-toolbar select,
.layout3d-toolbar input,
.layout3d-filter-panel select,
.layout3d-filter-panel button,
.layout3d-views button {
  min-height: 28px !important;
  height: 28px !important;
  padding: 0 8px !important;
  border-radius: 8px !important;
  font-size: 11px !important;
}
.layout3d-views {
  gap: 6px !important;
}
.layout3d-stage-head {
  min-height: 34px !important;
  padding: 6px 10px !important;
}
.layout3d-stage-head h2 {
  font-size: 15px !important;
  margin: 0 !important;
}
.layout3d-stage-head p,
.layout3d-stage-head .layout3d-kicker {
  display: none !important;
}
.layout3d-legend {
  gap: 8px !important;
}
.layout3d-legend span {
  font-size: 9px !important;
}
.layout3d-legend i {
  width: 10px !important;
  height: 10px !important;
}
.layout3d-page {
  max-height: calc(100vh - 92px) !important;
  overflow-y: auto !important;
  padding-bottom: 18px !important;
}
.layout3d-canvas-wrap {
  height: calc(100vh - 178px) !important;
  min-height: 860px !important;
  overflow: auto !important;
  scrollbar-width: thin;
}
@media (max-width: 1200px) {
  .layout3d-toolbar { grid-template-columns: 140px minmax(180px, 1fr) auto !important; }
  .layout3d-filter-panel { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
}
@media (max-width: 820px) {
  .layout3d-toolbar,
  .layout3d-filter-panel { grid-template-columns: 1fr 1fr !important; }
  .layout3d-views { grid-column: 1 / -1 !important; }
  .layout3d-canvas-wrap { height: 72vh !important; min-height: 560px !important; }
}
/* Controles flotantes dentro del render para pantalla completa */
.layout3d-floating-views {
  position: absolute;
  right: 14px;
  top: 12px;
  z-index: 6;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px;
  border: 1px solid rgba(109, 40, 217, .18);
  border-radius: 14px;
  background: rgba(255,255,255,.88);
  box-shadow: 0 14px 34px rgba(15, 23, 42, .14);
  backdrop-filter: blur(12px);
}
.layout3d-floating-views button {
  min-height: 26px;
  border: 1px solid #d8e3f2;
  border-radius: 10px;
  background: #fff;
  color: #18233c;
  font-size: 10px;
  font-weight: 900;
  padding: 0 9px;
  cursor: pointer;
}
.layout3d-floating-views button.active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #4c1d95, #6d28d9);
}
.layout3d-floating-filters {
  position: absolute;
  top: 12px;
  left: 430px;
  right: 370px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 3px 6px;
  overflow-x: auto;
  border: 1px solid rgba(109, 40, 217, .16);
  border-radius: 12px;
  background: rgba(255,255,255,.9);
  box-shadow: 0 10px 24px rgba(15, 23, 42, .1);
  backdrop-filter: blur(12px);
  scrollbar-width: thin;
}
.layout3d-floating-filters label {
  display: grid;
  flex: 0 0 78px;
  gap: 1px;
  min-width: 0;
}
.layout3d-floating-filters label:first-child {
  flex-basis: 96px;
}
.layout3d-floating-filters span {
  color: #6d28d9;
  font-size: 7px;
  font-weight: 950;
  letter-spacing: .08em;
  line-height: 1;
  text-transform: uppercase;
}
.layout3d-floating-filters select {
  width: 100%;
  height: 22px;
  border: 1px solid #d8e3f2;
  border-radius: 8px;
  outline: none;
  background: #fff;
  color: #18233c;
  font-size: 9px;
  font-weight: 900;
  padding: 0 6px;
}
.layout3d-floating-operator {
  position: absolute;
  left: 14px;
  top: 12px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: calc(100% - 360px);
  padding: 6px;
  border: 1px solid rgba(109, 40, 217, .18);
  border-radius: 14px;
  background: rgba(255,255,255,.9);
  box-shadow: 0 14px 34px rgba(15, 23, 42, .14);
  backdrop-filter: blur(12px);
}
.layout3d-floating-operator div {
  min-width: 98px;
  padding: 0 8px;
}
.layout3d-floating-operator span {
  display: block;
  color: #6d28d9;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.layout3d-floating-operator strong {
  display: block;
  margin-top: 2px;
  color: #111827;
  font-size: 12px;
  font-weight: 950;
}
.layout3d-floating-operator button {
  min-height: 26px;
  border: 1px solid #d8e3f2;
  border-radius: 10px;
  background: #fff;
  color: #18233c;
  font-size: 10px;
  font-weight: 900;
  padding: 0 9px;
  cursor: pointer;
}
.layout3d-floating-operator button.active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #4c1d95, #6d28d9);
}
.layout3d-rack-face-panel {
  position: absolute;
  left: 274px;
  bottom: 14px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px;
  border: 1px solid rgba(109, 40, 217, .2);
  border-radius: 14px;
  background: rgba(255,255,255,.92);
  box-shadow: 0 16px 38px rgba(15, 23, 42, .16);
  backdrop-filter: blur(12px);
}
.layout3d-rack-face-panel div {
  min-width: 120px;
  padding: 0 8px;
}
.layout3d-rack-face-panel span,
.layout3d-orientation-cards span {
  display: block;
  color: #6d28d9;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.layout3d-rack-face-panel strong,
.layout3d-orientation-cards strong {
  display: block;
  margin-top: 2px;
  color: #111827;
  font-size: 12px;
  font-weight: 950;
}
.layout3d-rack-face-panel button {
  min-height: 30px;
  border: 1px solid #d8e3f2;
  border-radius: 10px;
  background: #fff;
  color: #18233c;
  font-size: 11px;
  font-weight: 950;
  padding: 0 11px;
  cursor: pointer;
}
.layout3d-rack-face-panel button.active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #4c1d95, #6d28d9);
}
.layout3d-orientation-cards {
  position: absolute;
  right: 14px;
  top: 64px;
  z-index: 4;
  width: 190px;
  display: grid;
  gap: 8px;
}
.layout3d-orientation-cards article {
  padding: 10px 12px;
  border: 1px solid rgba(109, 40, 217, .16);
  border-radius: 14px;
  background: rgba(255,255,255,.9);
  box-shadow: 0 14px 34px rgba(15, 23, 42, .12);
  backdrop-filter: blur(12px);
}
.layout3d-orientation-cards small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.25;
}
.layout3d-canvas-wrap:fullscreen {
  width: 100vw;
  height: 100vh !important;
  min-height: 100vh !important;
  border-radius: 0;
}
.layout3d-canvas-wrap:fullscreen .layout3d-floating-views {
  right: 22px;
  top: 18px;
}
.layout3d-canvas-wrap:fullscreen .layout3d-floating-filters {
  left: 438px;
  right: 378px;
  top: 18px;
}
.layout3d-canvas-wrap:fullscreen .layout3d-floating-operator {
  left: 22px;
  top: 18px;
}

/* Vista operativa principal: controles verticales, render amplio arriba */
.layout3d-page {
  height: calc(100vh - 112px) !important;
  max-height: calc(100vh - 112px) !important;
  overflow: hidden !important;
  display: grid !important;
  grid-template-columns: 270px minmax(0, 1fr) !important;
  grid-template-rows: auto minmax(0, 1fr) auto !important;
  gap: 8px !important;
  padding-bottom: 0 !important;
}
.layout3d-hero,
.layout3d-detail-grid {
  display: none !important;
}
.layout3d-toolbar {
  grid-column: 1 !important;
  grid-row: 1 !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 6px !important;
  align-self: start !important;
}
.layout3d-toolbar .layout3d-views {
  display: none !important;
}
.layout3d-filter-panel {
  grid-column: 1 !important;
  grid-row: 2 !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  align-content: start !important;
  gap: 6px !important;
  min-height: 0 !important;
  overflow: auto !important;
}
.layout3d-filter-panel label,
.layout3d-filter-panel button {
  min-width: 0 !important;
}
.layout3d-kpis {
  grid-column: 1 !important;
  grid-row: 3 !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  align-self: end !important;
}
.layout3d-kpi {
  min-height: 32px !important;
  grid-template-columns: 22px minmax(0, 1fr) auto !important;
  padding: 5px 8px !important;
}
.layout3d-kpi > span {
  width: 20px !important;
  height: 20px !important;
}
.layout3d-stage-card {
  grid-column: 2 !important;
  grid-row: 1 / span 3 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
}
  .layout3d-canvas-wrap {
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }
@media (max-width: 1380px) {
  .layout3d-floating-filters {
    left: 14px;
    right: 14px;
    top: 58px;
  }
  .layout3d-orientation-cards {
    top: 110px;
  }
}
@media (max-width: 980px) {
  .layout3d-page {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    grid-template-columns: 1fr !important;
  }
  .layout3d-toolbar,
  .layout3d-filter-panel,
  .layout3d-kpis,
  .layout3d-stage-card {
    grid-column: 1 !important;
    grid-row: auto !important;
  }
  .layout3d-filter-panel {
    grid-template-columns: 1fr 1fr !important;
    max-height: none !important;
  }
  .layout3d-canvas-wrap {
    height: 72vh !important;
    min-height: 560px !important;
  }
}

/* Toolbox profesional de filtros por zona */
.layout3d-page {
  grid-template-columns: var(--layout-toolbox-grid, minmax(300px, 340px) minmax(0, 1fr)) !important;
  grid-template-rows: minmax(0, 1fr) !important;
  gap: var(--layout-toolbox-gap, 14px) !important;
  position: relative;
  transition: grid-template-columns .22s ease;
}

.layout3d-page.toolbox-collapsed {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 10px !important;
  padding-left: 66px !important;
}

.layout3d-control-toolbox {
  grid-column: 1 !important;
  grid-row: 1 !important;
  align-self: stretch !important;
  min-height: 0 !important;
  overflow: visible !important;
  border: 1px solid #e3ebf6;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(250,252,255,.96));
  box-shadow: 0 22px 60px rgba(15, 23, 42, .10);
  padding: 18px;
}

.layout3d-control-toolbox.collapsed {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 56px !important;
  min-width: 56px !important;
  overflow: visible !important;
  padding: 10px 7px !important;
  border-radius: 16px;
}

.layout3d-page.toolbox-collapsed .layout3d-stage-card {
  grid-column: 1 / -1 !important;
  grid-row: 1 !important;
}

.layout3d-control-toolbox.collapsed .layout3d-toolbox-head {
  margin: 0;
  display: grid;
  place-items: center;
}

.layout3d-control-toolbox.collapsed .layout3d-toolbox-head > div {
  display: none;
}

.layout3d-control-toolbox.collapsed .layout3d-toolbox-head-actions {
  display: grid;
  place-items: center;
}

.layout3d-control-toolbox.collapsed .layout3d-toolbox-head-actions > button {
  width: 40px;
  min-height: 40px;
  justify-content: center;
  border: 1px solid #c4b5fd;
  border-radius: 12px;
  background: #fff;
  color: #6d28d9;
  box-shadow: 0 10px 24px rgba(109, 40, 217, .14);
  font-size: 0;
}

.layout3d-control-toolbox.collapsed .layout3d-toolbox-head-actions > button svg {
  transform: rotate(180deg);
}

.layout3d-toolbox-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}

.layout3d-toolbox-head strong {
  display: block;
  margin-top: 4px;
  color: #111827;
  font-size: 15px;
  font-weight: 950;
}

.layout3d-toolbox-head button {
  border: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  color: #64748b;
  padding: 0;
  font-size: 11px;
  font-weight: 950;
  cursor: pointer;
}

.layout3d-toolbox-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layout3d-toolbox-head-actions .layout3d-back-zones {
  min-height: 30px;
  border: 1px solid #d8e3f2;
  border-radius: 10px;
  background: #fff;
  color: #4c1d95;
  padding: 0 10px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .06);
}

.layout3d-zone-pill {
  position: relative;
  display: grid;
  gap: 7px;
  margin-bottom: 12px;
  color: #7b8798;
  font-size: 10px;
  font-weight: 900;
}

.layout3d-zone-pill select,
.layout3d-toolbox-search,
.layout3d-toolbox-grid select {
  width: 100%;
  min-height: 38px;
  border: 1px solid #dce6f3;
  border-radius: 10px;
  background: #fff;
  color: #14223a;
  font-size: 12px;
  font-weight: 850;
  outline: none;
  box-shadow: 0 8px 20px rgba(15, 23, 42, .035);
}

.layout3d-zone-pill select {
  padding: 0 76px 0 38px;
}

.layout3d-zone-pill::before {
  content: "⌘";
  position: absolute;
  left: 13px;
  bottom: 10px;
  color: #7c3aed;
  font-weight: 950;
}

.layout3d-zone-pill em {
  position: absolute;
  right: 10px;
  bottom: 9px;
  border-radius: 999px;
  padding: 4px 9px;
  background: #dcfce7;
  color: #059669;
  font-style: normal;
  font-size: 10px;
  font-weight: 950;
}

.layout3d-toolbox-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  margin-bottom: 14px;
  color: #64748b;
}

.layout3d-toolbox-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #14223a;
  font-size: 12px;
  font-weight: 800;
}

.layout3d-toolbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.layout3d-toolbox-grid label {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.layout3d-toolbox-grid span,
.layout3d-toolbox-section > span {
  color: #7b8798;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .04em;
}

.layout3d-toolbox-grid select {
  padding: 0 10px;
}

.layout3d-toolbox-section {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.layout3d-view-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.layout3d-view-grid button {
  min-height: 56px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  gap: 4px;
  background: #fff;
  color: #64748b;
  font-size: 10px;
  font-weight: 900;
  cursor: pointer;
}

.layout3d-view-grid button.active {
  border-color: #c4b5fd;
  background: #f5f3ff;
  color: #6d28d9;
  box-shadow: 0 10px 24px rgba(109, 40, 217, .10);
}

.layout3d-layer-list {
  display: grid;
  gap: 8px;
}

.layout3d-layer-list label {
  display: grid;
  grid-template-columns: 11px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.layout3d-layer-list i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.layout3d-layer-list input {
  accent-color: #6d28d9;
}

.layout3d-toolbox-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 18px;
}

.layout3d-toolbox-actions button {
  min-height: 38px;
  border: 1px solid #c4b5fd;
  border-radius: 10px;
  background: #fff;
  color: #6d28d9;
  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
}

.layout3d-toolbox-actions button.primary {
  border-color: transparent;
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  color: #fff;
  box-shadow: 0 14px 28px rgba(109, 40, 217, .22);
}

.layout3d-zone-summary-card {
  position: absolute;
  left: 18px;
  right: auto;
  top: auto;
  bottom: 14px;
  z-index: 7;
  width: 238px;
  border: 1px solid rgba(226, 232, 240, .92);
  border-radius: 16px;
  background: rgba(255,255,255,.94);
  box-shadow: 0 18px 48px rgba(15, 23, 42, .12);
  backdrop-filter: blur(12px);
  padding: 14px;
}

.layout3d-zone-summary-card > span {
  display: block;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
}

.layout3d-zone-summary-card p {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  margin: 8px 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.layout3d-zone-summary-card strong {
  color: #0f172a;
  font-size: 12px;
  font-weight: 950;
}

.layout3d-zone-summary-card strong.green { color: #059669; }
.layout3d-zone-summary-card strong.red { color: #e11d48; }

.layout3d-zone-summary-card div {
  height: 8px;
  margin-top: 10px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.layout3d-zone-summary-card div i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8b5cf6, #5b21b6);
}

.layout3d-stage-card {
  grid-column: 2 !important;
  grid-row: 1 !important;
}

.layout3d-floating-filters,
.layout3d-floating-views {
  display: none !important;
}

.layout3d-canvas-wrap:fullscreen .layout3d-floating-filters,
.layout3d-canvas-wrap:fullscreen .layout3d-floating-views,
.layout3d-canvas-wrap.expanded .layout3d-floating-filters,
.layout3d-canvas-wrap.expanded .layout3d-floating-views {
  display: flex !important;
}

.layout3d-canvas-wrap:fullscreen .layout3d-floating-filters,
.layout3d-canvas-wrap.expanded .layout3d-floating-filters {
  top: 98px !important;
  left: 28px !important;
  right: 28px !important;
  transform: none;
  max-width: none;
  min-height: 70px;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 12px 16px;
  overflow-x: auto;
  border-radius: 22px;
  background: rgba(255,255,255,.94);
  z-index: 7;
}

.layout3d-canvas-wrap:fullscreen .layout3d-floating-filters label,
.layout3d-canvas-wrap.expanded .layout3d-floating-filters label {
  flex: 0 0 128px;
  gap: 8px;
}

.layout3d-canvas-wrap:fullscreen .layout3d-floating-filters span,
.layout3d-canvas-wrap.expanded .layout3d-floating-filters span {
  font-size: 11px;
  letter-spacing: .08em;
}

.layout3d-canvas-wrap:fullscreen .layout3d-floating-filters select,
.layout3d-canvas-wrap.expanded .layout3d-floating-filters select {
  height: 42px;
  border-radius: 14px;
  font-size: 13px;
  padding: 0 14px;
}

.layout3d-canvas-wrap:fullscreen .layout3d-floating-views,
.layout3d-canvas-wrap.expanded .layout3d-floating-views {
  top: 22px !important;
  right: 28px !important;
  left: auto !important;
  max-width: calc(100% - 470px);
  gap: 10px;
  padding: 12px;
  overflow-x: auto;
  flex-wrap: nowrap;
  border-radius: 22px;
  background: rgba(255,255,255,.94);
  z-index: 8;
}

.layout3d-canvas-wrap:fullscreen .layout3d-floating-views button,
.layout3d-canvas-wrap.expanded .layout3d-floating-views button {
  min-height: 42px;
  min-width: 88px;
  border-radius: 14px;
  font-size: 12px;
  padding: 0 14px;
}

.layout3d-canvas-wrap:fullscreen .layout3d-floating-operator,
.layout3d-canvas-wrap.expanded .layout3d-floating-operator {
  top: 22px !important;
  left: 28px !important;
  max-width: 410px;
  z-index: 8;
}

.layout3d-canvas-wrap:fullscreen .layout3d-orientation-cards,
.layout3d-canvas-wrap.expanded .layout3d-orientation-cards {
  top: 186px;
  right: 28px;
  z-index: 6;
}

@media (max-width: 1180px) {
  .layout3d-page {
    grid-template-columns: 1fr !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
  .layout3d-control-toolbox,
  .layout3d-stage-card {
    grid-column: 1 !important;
    grid-row: auto !important;
  }
  .layout3d-zone-summary-card {
    position: static;
    width: auto;
    grid-column: 1;
  }
}

@media (max-width: 1280px) {
  .layout-zone-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .layout-zone-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 820px) {
  .layout-zone-header { display: grid; }
  .layout-zone-actions { width: 100%; }
  .layout-zone-grid,
  .layout-zone-kpis { grid-template-columns: 1fr; }
}`;



























