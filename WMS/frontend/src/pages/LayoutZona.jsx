import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  Camera,
  Eye,
  Layers3,
  MapPinned,
  Maximize2,
  RefreshCcw,
  Search,
  Truck,
  Warehouse,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getMovimientos, getUbicaciones } from "../api";

const WMS_PURPLE = "#6d28d9";
const WMS_DEEP = "#1f1148";
const WMS_CYAN = "#22d3ee";

const RACKS = 4;
const MODULES_PER_RACK = 9;
const LEVELS = 6;
const FRONT_POSITIONS = 2;
const DEPTHS = 2;
const SLOT_CAPACITY = RACKS * MODULES_PER_RACK * LEVELS * FRONT_POSITIONS * DEPTHS;
const RACK_ROW_Z = [-6.58, -1.3, 1.13, 6.41];
const AISLE_Z = [-3.94, 3.77];
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

function parseLocation(row) {
  const code = locationCode(row);
  const base = cleanZone(row.ubicacion_base || row.zona || code.slice(0, 3));
  const raw = String(row.posicion || code.replace(base, "") || "").replace(/\s/g, "");
  const compact = raw.replace(/[´`]/g, "'");
  const match = compact.match(/^(\d{2})(\d)['’]?(\d{1,2})?$/);

  if (match) {
    return {
      base,
      module: Number(match[1]),
      level: Number(match[2]),
      depth: Number(match[3] || 1),
      position: compact,
    };
  }

  const nums = compact.match(/\d+/g)?.join("") || "0";
  return {
    base,
    module: Number(nums.slice(0, 2) || 0),
    level: Number(nums.slice(2, 3) || 1),
    depth: Number(nums.slice(3, 5) || 1),
    position: compact || row.posicion || "",
  };
}

function buildStock(movimientos) {
  const map = new Map();
  (movimientos || []).forEach((row) => {
    const type = normalize(row.tipo);
    const qty = toNumber(row.cantidad);
    const ubicacion = normalize(row.ubicacion_final || row.ubicacion || row.ubicacion_codigo);
    if (!ubicacion) return;
    const sign = type.includes("SALIDA") || type.includes("DESPACHO") ? -1 : 1;
    map.set(ubicacion, (map.get(ubicacion) || 0) + qty * sign);
  });
  return map;
}

function buildCells(ubicaciones, stockMap, zone) {
  return (ubicaciones || [])
    .map((row) => {
      const parsed = parseLocation(row);
      const code = locationCode(row);
      return {
        ...row,
        ...parsed,
        code,
        stock: stockMap.get(normalize(code)) || 0,
      };
    })
    .filter((row) => cleanZone(row.base) === cleanZone(zone))
    .sort((a, b) => a.module - b.module || b.level - a.level || a.depth - b.depth || a.code.localeCompare(b.code));
}

function enhanceRackData(cells) {
  return cells.map((cell, index) => {
    const slot = index % SLOT_CAPACITY;
    const perRack = MODULES_PER_RACK * LEVELS * FRONT_POSITIONS * DEPTHS;
    const rack = Math.floor(slot / perRack) + 1;
    const rackSlot = slot % perRack;
    const moduleInRack = Math.floor(rackSlot / (LEVELS * FRONT_POSITIONS * DEPTHS)) + 1;
    const moduleSlot = rackSlot % (LEVELS * FRONT_POSITIONS * DEPTHS);
    const physicalLevel = Math.floor(moduleSlot / (FRONT_POSITIONS * DEPTHS)) + 1;
    const faceSlot = moduleSlot % (FRONT_POSITIONS * DEPTHS);
    const physicalPosition = (faceSlot % FRONT_POSITIONS) + 1;
    const physicalDepth = Math.floor(faceSlot / FRONT_POSITIONS) + 1;
    return {
      ...cell,
      rack,
      pasillo: rack <= 2 ? 1 : 2,
      moduleInRack,
      physicalLevel,
      physicalPosition,
      physicalDepth,
      rackLabel: `Rack ${rack}`,
      aisleLabel: rack <= 2 ? "Pasillo 1" : "Pasillo 2",
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

function applyLayoutFilters(cells, filters) {
  return cells.filter((cell) => {
    const occupied = Number(cell.stock || 0) > 0;
    const occupancyOk = filters.ocupacion === "todas" || (filters.ocupacion === "ocupadas" && occupied) || (filters.ocupacion === "libres" && !occupied);
    return (
      occupancyOk &&
      matchFilter(cell.pasillo, filters.pasillo) &&
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

function formatQty(value) {
  return Number(value || 0).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function stockColor(cell, maxStock) {
  if (!cell || cell.stock <= 0) return 0xe8eef8;
  const pct = maxStock > 0 ? cell.stock / maxStock : 0;
  if (pct <= 0.25) return 0xef4444;
  if (pct <= 0.55) return 0xf59e0b;
  if (pct <= 0.85) return 0x22c55e;
  return 0x2563eb;
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
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(5.8, 1.8, 1);
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

export default function LayoutZona() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const meshMapRef = useRef(new Map());
  const [ubicaciones, setUbicaciones] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [zone, setZone] = useState("300");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("iso");
  const [filters, setFilters] = useState({ ocupacion: "todas", pasillo: "todos", rack: "todos", modulo: "todos", nivel: "todos", posicion: "todos", profundidad: "todos" });
  const [showAllStructure, setShowAllStructure] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [ubicRows, movRows] = await Promise.all([getUbicaciones(), getMovimientos()]);
      setUbicaciones(Array.isArray(ubicRows) ? ubicRows : []);
      setMovimientos(Array.isArray(movRows) ? movRows : []);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el layout desde Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stockMap = useMemo(() => buildStock(movimientos), [movimientos]);
  const zones = useMemo(() => {
    const values = ["300"];
    ubicaciones.forEach((row) => {
      const z = cleanZone(row.ubicacion_base || row.zona || locationCode(row).slice(0, 3));
      if (z) values.push(z);
    });
    return uniqueSorted(values);
  }, [ubicaciones]);

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
      [cell.code, cell.position, cell.zona, cell.bodega, cell.familia, cell.familias, cell.rackLabel, cell.aisleLabel]
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

  function updateFilter(name, value) {
    setSelected(null);
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setQuery("");
    setSelected(null);
    setFilters({ ocupacion: "todas", pasillo: "todos", rack: "todos", modulo: "todos", nivel: "todos", posicion: "todos", profundidad: "todos" });
  }

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
    controls.target.set(8, 2.5, 0);

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
    };

    const floor = addBox(scene, [62, 0.45, 36], [4, -0.28, 0], mats.floor, "Piso operativo");
    floor.receiveShadow = true;

    addBox(scene, [16, 0.08, 4.4], [-20, 0.01, 12], mats.dock, "Outbound Area");
    addBox(scene, [14, 0.08, 4.4], [-20, 0.02, -12], mats.dock, "Inbound Cache");
    addBox(scene, [48, 0.06, 3.2], [7, 0.05, AISLE_Z[0]], mats.aisle, "Pasillo operativo 1 - Rack 1 / Rack 2");
    addBox(scene, [48, 0.06, 3.2], [7, 0.05, AISLE_Z[1]], mats.aisle, "Pasillo operativo 2 - Rack 3 / Rack 4");
    addBox(scene, [2.2, 0.07, 28], [13, 0.08, 0], mats.aisle, "AGV Turned on the Ground Floor");
    addBox(scene, [9, 0.1, 10], [22, 0.1, 8], mats.zoneBlue, "Cold Storage Area");

    addText(scene, "OUTBOUND AREA", [-20, 1.1, 15.2], "#475569", 44);
    addText(scene, "INBOUND CACHE", [-20, 1.1, -15.2], "#475569", 44);
    addText(scene, `ZONA ${zone} - LAYOUT DIGITAL`, [6, 1.1, -17.2], WMS_PURPLE, 46);
    addText(scene, "PASILLO 1", [3, 1.05, AISLE_Z[0]], "#0891b2", 38);
    addText(scene, "PASILLO 2", [3, 1.05, AISLE_Z[1]], "#0891b2", 38);

    createTruck(scene, [-29, 0.55, 13], mats);
    createTruck(scene, [-29, 0.55, 9.5], mats);
    createTruck(scene, [-29, 0.55, -12], mats);
    createPalletBlock(scene, [-18, 0.35, 7], 5, 3, mats.pallet);
    createPalletBlock(scene, [-12, 0.35, -10], 4, 3, mats.pallet);
    createRobotArm(scene, [19, 0.45, 11.5], mats.robot);
    createRobotArm(scene, [20, 0.45, -8.5], mats.robot);
    createAgv(scene, [-6, 0.28, 0], mats.agv);
    createAgv(scene, [14, 0.28, -4], mats.agv);

    meshMapRef.current.clear();
    createRackCity(scene, cells, filteredCells, selected, setSelected, maxStock, meshMapRef.current, mats, showAllStructure);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onClick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Array.from(meshMapRef.current.keys()), false);
      if (hits.length) {
        const cell = meshMapRef.current.get(hits[0].object);
        if (cell) setSelected(cell);
      }
    }

    renderer.domElement.addEventListener("click", onClick);

    function setCamera(nextView) {
      if (nextView === "top") {
        camera.position.set(1, 58, 0.5);
        controls.target.set(6, 0, 0);
      } else if (nextView === "front") {
        camera.position.set(4, 18, 42);
        controls.target.set(5, 3.4, 0);
      } else {
        camera.position.set(-28, 26, 32);
        controls.target.set(6, 3.2, 0);
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
  }, [cells, filteredCells, selected, view, maxStock, zone, showAllStructure]);

  return (
    <main className="layout3d-page">
      <style>{layoutStyles}</style>

      <section className="layout3d-hero">
        <div>
          <span className="layout3d-kicker">WMS DIGITAL TWIN</span>
          <h1>Layout 3D de bodega</h1>
          <p>Maqueta operacional por zona con racks, pasillos, recibo, despacho, AGV y ubicaciones reales desde Supabase.</p>
        </div>
        <button type="button" onClick={loadData} className="layout3d-primary">
          <RefreshCcw size={17} /> Actualizar
        </button>
      </section>

      {error && <div className="layout3d-error">{error}</div>}

      <section className="layout3d-toolbar">
        <label>
          <span>Zona</span>
          <select value={zone} onChange={(event) => { setZone(event.target.value); setSelected(null); }}>
            {zones.map((item) => <option key={item} value={item}>Zona {item}</option>)}
          </select>
        </label>
        <label className="layout3d-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ubicacion, modulo, rack, bodega, material..." />
        </label>
        <div className="layout3d-views">
          <button type="button" className={view === "iso" ? "active" : ""} onClick={() => setView("iso")}><Camera size={16} /> 3D</button>
          <button type="button" className={view === "top" ? "active" : ""} onClick={() => setView("top")}><Eye size={16} /> Superior</button>
          <button type="button" className={view === "front" ? "active" : ""} onClick={() => setView("front")}><Maximize2 size={16} /> Frontal</button>
        </div>
      </section>

      <section className="layout3d-filter-panel">
        <FilterSelect label="Ocupacion" value={filters.ocupacion} onChange={(value) => updateFilter("ocupacion", value)} options={["todas", "ocupadas", "libres"]} />
        <FilterSelect label="Pasillo" value={filters.pasillo} onChange={(value) => updateFilter("pasillo", value)} options={filterOptions.pasillos} prefix="Pasillo " />
        <FilterSelect label="Rack" value={filters.rack} onChange={(value) => updateFilter("rack", value)} options={filterOptions.racks} prefix="Rack " />
        <FilterSelect label="Modulo" value={filters.modulo} onChange={(value) => updateFilter("modulo", value)} options={filterOptions.modulos} prefix="M" />
        <FilterSelect label="Nivel" value={filters.nivel} onChange={(value) => updateFilter("nivel", value)} options={filterOptions.niveles} prefix="Nivel " />
        <FilterSelect label="Posicion" value={filters.posicion} onChange={(value) => updateFilter("posicion", value)} options={filterOptions.posiciones} prefix="P" />
        <FilterSelect label="Profundidad" value={filters.profundidad} onChange={(value) => updateFilter("profundidad", value)} options={filterOptions.profundidades} prefix="D" />
        <label className="layout3d-check"><span>Contexto</span><em><input type="checkbox" checked={showAllStructure} onChange={(event) => setShowAllStructure(event.target.checked)} /> Mostrar toda la estanteria</em></label>
        <button type="button" onClick={clearFilters}>Limpiar filtros</button>
      </section>

      <section className="layout3d-kpis">
        <Kpi icon={<MapPinned size={18} />} label="Zona activa" value={zone} />
        <Kpi icon={<Boxes size={18} />} label="Ubicaciones" value={cells.length} />
        <Kpi icon={<Warehouse size={18} />} label="Ocupadas" value={occupied} />
        <Kpi icon={<Layers3 size={18} />} label="Niveles" value={maxLevel} />
        <Kpi icon={<Truck size={18} />} label="Ocupacion global" value={`${occupancy}%`} />
      </section>

      <section className="layout3d-stage-card">
        <div className="layout3d-stage-head">
          <div>
            <span className="layout3d-kicker">Escenario de aplicacion</span>
            <h2>Pallet Shuttle + AGV + analisis real de estanteria</h2>
          </div>
          <div className="layout3d-legend">
            <span><i className="empty" /> Libre</span>
            <span><i className="low" /> Bajo</span>
            <span><i className="mid" /> Medio</span>
            <span><i className="good" /> Normal</span>
            <span><i className="full" /> Alto</span>
            <span><i className="selected" /> Seleccionada</span>
          </div>
        </div>
        <div ref={wrapRef} className="layout3d-canvas-wrap">
          {loading && <div className="layout3d-loading">Cargando ubicaciones desde Supabase...</div>}
          {!loading && !filteredCells.length && <div className="layout3d-loading">No hay ubicaciones para zona {zone}.</div>}
          <canvas ref={canvasRef} className="layout3d-canvas" />
        </div>
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
            </div>
          ) : (
            <p>Haz clic sobre cualquier pallet o celda del rack para ver su informacion operativa.</p>
          )}
        </article>
        <article className="layout3d-detail">
          <span className="layout3d-kicker">Capacidad visual</span>
          <h3>{available} libres / {occupied} ocupadas</h3>
          <p>Esta base ya permite evolucionar a rutas por reserva, calor por ocupacion, simulacion AGV y control por SKU.</p>
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

function createRackCity(scene, allCells, filteredCells, selected, setSelected, maxStock, meshMap, mats, showAllStructure) {
  const filteredKeys = new Set(filteredCells.map((cell) => cell.code));
  const visibleCells = showAllStructure ? allCells : filteredCells;
  const rows = [[], [], [], []];
  visibleCells.forEach((cell) => rows[Math.max(0, Math.min(3, (cell.rack || 1) - 1))].push(cell));
  const rowZ = RACK_ROW_Z;
  const rowNames = ["Rack 1", "Rack 2", "Rack 3", "Rack 4"];

  rows.forEach((rackCells, rowIndex) => {
    if (!rackCells.length) return;
    addText(scene, rowNames[rowIndex], [-8.2, 5.35, rowZ[rowIndex]], "#172554", 40);
    for (let moduleIndex = 1; moduleIndex <= MODULES_PER_RACK; moduleIndex += 1) {
      const moduleCells = rackCells.filter((cell) => Number(cell.moduleInRack) === moduleIndex);
      createRackModule(scene, moduleCells, moduleIndex, rowIndex, rowZ[rowIndex], selected, setSelected, maxStock, meshMap, mats, filteredKeys, showAllStructure);
    }
  });
}

function createRackModule(scene, moduleCells, moduleIndex, rowIndex, z, selected, setSelected, maxStock, meshMap, mats, filteredKeys, showAllStructure) {
  const x = -10.8 + (moduleIndex - 1) * 2.72;
  const width = 2.15;
  const height = LEVELS * 0.72 + 0.45;
  const depthSize = DEPTHS * 0.72 + 0.64;
  const moduleGroup = new THREE.Group();
  moduleGroup.position.set(x, 0, z);
  moduleGroup.rotation.y = rowIndex < 2 ? 0 : Math.PI;
  scene.add(moduleGroup);

  const postPositions = [
    [-width / 2, height / 2, -depthSize / 2],
    [width / 2, height / 2, -depthSize / 2],
    [-width / 2, height / 2, depthSize / 2],
    [width / 2, height / 2, depthSize / 2],
  ];
  postPositions.forEach((pos) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, height, 0.09), mats.post);
    post.position.set(...pos);
    post.castShadow = true;
    moduleGroup.add(post);
  });

  for (let level = 0; level <= LEVELS; level += 1) {
    const y = 0.2 + level * 0.72;
    [-depthSize / 2, 0, depthSize / 2].forEach((dz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 0.28, 0.075, 0.075), mats.beam);
      beam.position.set(0, y, dz);
      beam.castShadow = true;
      moduleGroup.add(beam);
    });
    [-width / 2, width / 2].forEach((dx) => {
      const sideBeam = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, depthSize + 0.18), mats.beam);
      sideBeam.position.set(dx, y, 0);
      sideBeam.castShadow = true;
      moduleGroup.add(sideBeam);
    });
  }

  [-width / 2, width / 2].forEach((dx) => {
    [-depthSize / 2, depthSize / 2].forEach((dz) => {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.34), createMaterial(0xffea00, { roughness: 0.35 }));
      foot.position.set(dx, -0.02, dz);
      foot.castShadow = true;
      moduleGroup.add(foot);
    });
  });

  addModuleLabel(moduleGroup, `M${moduleIndex}`, [0, -0.32, depthSize / 2 + 0.75]);

  const cellMap = new Map(moduleCells.map((cell) => [`${cell.physicalLevel}-${cell.physicalDepth}-${cell.physicalPosition}`, cell]));
  for (let level = 1; level <= LEVELS; level += 1) {
    for (let depth = 1; depth <= DEPTHS; depth += 1) {
      for (let position = 1; position <= FRONT_POSITIONS; position += 1) {
        const cell = cellMap.get(`${level}-${depth}-${position}`);
        const xPos = position === 1 ? -0.42 : 0.42;
        const y = 0.55 + (level - 1) * 0.72;
        const dz = -depthSize / 2 + 0.44 + (depth - 1) * 0.72;
        const isFiltered = cell ? filteredKeys.has(cell.code) : false;
        const isActive = selected?.code && cell?.code === selected.code;
        const hiddenByFilter = showAllStructure && cell && !isFiltered;
        const emptyMaterial = createMaterial(0xe5e7eb, { opacity: hiddenByFilter ? 0.12 : 0.22, roughness: 0.62 });
        const mat = isActive
          ? mats.selected
          : cell
            ? createMaterial(stockColor(cell, maxStock), { opacity: hiddenByFilter ? 0.16 : cell.stock > 0 ? 0.86 : 0.32, roughness: 0.5 })
            : emptyMaterial;
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.46, 0.56), mat);
        slot.position.set(xPos, y, dz);
        slot.castShadow = !hiddenByFilter;
        slot.receiveShadow = true;
        moduleGroup.add(slot);

        if (cell) {
          meshMap.set(slot, cell);
          if ((isFiltered || isActive) && level % 2 === 0) {
            const label = createTextSprite(cell.code, "#111827", 46);
            label.scale.set(1.12, 0.34, 1);
            label.position.set(xPos, y + 0.28, dz + 0.34);
            moduleGroup.add(label);
          }
        }
      }
    }
  }
}

function addModuleLabel(group, text, position) {
  const sprite = createTextSprite(text, "#111827", 58);
  sprite.scale.set(1.6, 0.5, 1);
  sprite.position.set(...position);
  group.add(sprite);
}

function FilterSelect({ label, value, onChange, options, prefix = "" }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="todos">Todos</option>
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
  padding: 0 14px;
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
  min-height: 48px;
  border: 1px solid #d8e3f2;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
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
  min-height: 40px;
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

.layout3d-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border-radius: 18px;
}

.layout3d-kpi {
  min-height: 92px;
  display: grid;
  align-content: center;
  gap: 4px;
  padding: 16px;
  background: #fff;
}

.layout3d-kpi > span {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: ${WMS_PURPLE};
  border-radius: 12px;
  background: #f1edff;
}

.layout3d-kpi small {
  color: #687792;
  font-size: 12px;
  font-weight: 850;
}

.layout3d-kpi strong {
  font-size: 27px;
  line-height: 1;
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

.layout3d-legend .empty { background: #e8eef8; }
.layout3d-legend .low { background: #ef4444; }
.layout3d-legend .mid { background: #f59e0b; }
.layout3d-legend .good { background: #22c55e; }
.layout3d-legend .full { background: #2563eb; }
.layout3d-legend .selected { background: #d946ef; }

.layout3d-canvas-wrap {
  position: relative;
  height: min(72vh, 760px);
  min-height: 620px;
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
  font-size: 15px;
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
`;











