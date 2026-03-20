import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileBarChart2,
  Search,
  RefreshCcw,
  BarChart3,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileText,
  GitCompare,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function InformeInventario() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedFromQuery = searchParams.get("tarea") || "";

  const [taskIdInput, setTaskIdInput] = useState(selectedFromQuery);
  const [report, setReport] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [taskList, setTaskList] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(selectedFromQuery);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");

  const loadTaskList = async () => {
    setLoadingList(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/inventarios/tareas`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "No se pudo cargar listado");
      setTaskList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error cargando tareas");
    } finally {
      setLoadingList(false);
    }
  };

  const loadReport = async (taskIdValue) => {
    if (!String(taskIdValue).trim()) {
      setReport(null);
      setTaskDetail(null);
      return;
    }

    setLoadingReport(true);
    setError("");

    try {
      const [reportRes, detailRes] = await Promise.all([
        fetch(`${API_URL}/inventarios/tareas/${taskIdValue}/informe`),
        fetch(`${API_URL}/inventarios/tareas/${taskIdValue}`),
      ]);

      const reportData = await reportRes.json();
      const detailData = await detailRes.json();

      if (!reportRes.ok) {
        throw new Error(reportData.detail || "No se pudo cargar el informe");
      }

      if (!detailRes.ok) {
        throw new Error(detailData.detail || "No se pudo cargar el detalle de la tarea");
      }

      setReport(reportData);
      setTaskDetail(detailData);
      setSelectedTaskId(String(taskIdValue));
    } catch (err) {
      setError(err.message || "Error cargando informe");
      setReport(null);
      setTaskDetail(null);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadTaskList();
  }, []);

  useEffect(() => {
    if (selectedFromQuery) {
      setTaskIdInput(selectedFromQuery);
      loadReport(selectedFromQuery);
    }
  }, [selectedFromQuery]);

  const selectedTask = useMemo(() => {
    return taskList.find((x) => String(x.id) === String(selectedTaskId)) || null;
  }, [taskList, selectedTaskId]);

  const dashboard = useMemo(() => {
    return {
      total: taskList.length,
      conciliadas: taskList.filter((x) => x.estado === "CONCILIADA").length,
      reconteo: taskList.filter((x) => x.es_reconteo).length,
      abiertas: taskList.filter(
        (x) => x.estado === "PENDIENTE" || x.estado === "EN_PROCESO"
      ).length,
    };
  }, [taskList]);

  const detalleResumen = useMemo(() => {
    const detalles = taskDetail?.detalles || [];

    return detalles.reduce(
      (acc, item) => {
        const sistema = Number(item.cantidad_sistema || 0);
        const contado = Number(item.cantidad_contada || 0);
        const diferencia = Number(item.diferencia || 0);

        acc.totalSistema += sistema;
        acc.totalContado += contado;

        if (item.coincide === true) acc.coinciden += 1;
        if (item.coincide === false) acc.noCoinciden += 1;
        if (item.contado) acc.contadas += 1;
        if (diferencia !== 0) acc.totalDiferencia += diferencia;

        return acc;
      },
      {
        totalSistema: 0,
        totalContado: 0,
        totalDiferencia: 0,
        coinciden: 0,
        noCoinciden: 0,
        contadas: 0,
      }
    );
  }, [taskDetail]);

  const diferencias = useMemo(() => {
    return (taskDetail?.detalles || []).filter((x) => x.coincide === false);
  }, [taskDetail]);

  const handleSearchReport = () => {
    if (!taskIdInput.trim()) {
      setError("Debe indicar un ID de tarea");
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("tarea", taskIdInput.trim());
    setSearchParams(next);
    loadReport(taskIdInput.trim());
  };

  const handlePrint = () => {
    if (!report || !taskDetail) return;
    window.print();
  };

  return (
    <div style={pageStyle}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #print-area, #print-area * {
            visibility: visible;
          }

          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 0;
            margin: 0;
          }

          .no-print {
            display: none !important;
          }

          .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-page-break {
            page-break-before: always;
          }

          table {
            font-size: 11px !important;
          }

          .print-title {
            font-size: 22px !important;
          }

          .print-subtitle {
            font-size: 12px !important;
          }
        }
      `}</style>

      <div className="no-print">
        <div style={pageTopStyle}>
          <div style={pageTopIconStyle}>
            <FileBarChart2 size={18} color="#355b7e" />
          </div>
          <div>
            <div style={pageTitleStyle}>Informe de inventario</div>
            <div style={pageSubtitleStyle}>
              Consulta el cierre por tarea y genera una impresión formal tipo software.
            </div>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatBox
            icon={<ClipboardList size={18} color="#355b7e" />}
            label="Total tareas"
            value={dashboard.total}
          />
          <StatBox
            icon={<CheckCircle2 size={18} color="#1f7a3d" />}
            label="Conciliadas"
            value={dashboard.conciliadas}
          />
          <StatBox
            icon={<AlertTriangle size={18} color="#b26a00" />}
            label="Reconteos"
            value={dashboard.reconteo}
          />
          <StatBox
            icon={<BarChart3 size={18} color="#0b57d0" />}
            label="Abiertas"
            value={dashboard.abiertas}
          />
        </div>

        <div style={layoutGridStyle}>
          <section style={cardStyle}>
            <CardHeader
              title="Listado de tareas"
              subtitle="Haz clic sobre una tarea y se carga el informe automáticamente."
            />

            <div style={{ padding: 18 }}>
              {error ? <MessageBox type="error" text={error} /> : null}

              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={{ background: "#fbfcfd" }}>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Tipo</th>
                      <th style={thStyle}>Criterio</th>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>Exactitud</th>
                      <th style={thStyle}>Reconteo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingList ? (
                      <tr>
                        <td colSpan={6} style={emptyCellStyle}>
                          Cargando tareas...
                        </td>
                      </tr>
                    ) : taskList.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={emptyCellStyle}>
                          No hay tareas para mostrar.
                        </td>
                      </tr>
                    ) : (
                      taskList.map((item) => {
                        const active = String(item.id) === String(selectedTaskId);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => {
                              setTaskIdInput(String(item.id));
                              setSelectedTaskId(String(item.id));
                              loadReport(item.id);
                            }}
                            style={{
                              cursor: "pointer",
                              background: active ? "#f3f8ff" : "#fff",
                            }}
                          >
                            <td style={tdCodeStyle}>{item.id}</td>
                            <td style={tdStyle}>{item.tipo_conteo}</td>
                            <td style={tdStyle}>{item.criterio}</td>
                            <td style={tdStyle}>
                              <span style={getStatusStyle(item.estado)}>
                                {item.estado}
                              </span>
                            </td>
                            <td style={tdStyle}>{item.porcentaje_exactitud ?? 0}%</td>
                            <td style={tdStyle}>{item.es_reconteo ? "Sí" : "No"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section style={cardStyle}>
            <CardHeader
              title="Consulta puntual"
              subtitle="Busca un informe por ID y luego imprímelo completo."
            />

            <div style={{ padding: 18 }}>
              <div style={searchRowStyle}>
                <div style={{ flex: 1 }}>
                  <div style={labelStyle}>ID tarea</div>
                  <input
                    value={taskIdInput}
                    onChange={(e) => setTaskIdInput(e.target.value)}
                    placeholder="Ej: 12"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <button style={primaryButtonStyle} onClick={handleSearchReport}>
                    <Search size={16} />
                    Consultar
                  </button>

                  <button
                    style={secondaryButtonStyle}
                    onClick={() => selectedTaskId && loadReport(selectedTaskId)}
                    disabled={!selectedTaskId || loadingReport}
                  >
                    <RefreshCcw size={16} />
                    Recargar
                  </button>

                  <button
                    style={printButtonStyle}
                    onClick={handlePrint}
                    disabled={!report || !taskDetail}
                  >
                    <Printer size={16} />
                    Imprimir tarea
                  </button>
                </div>
              </div>

              {!report ? (
                <div style={{ ...placeholderBoxStyle, marginTop: 16 }}>
                  Selecciona una tarea o consulta un ID para ver el informe imprimible.
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 16 }} />
                  <div style={detailGridStyle}>
                    <MiniInfo label="Tarea" value={report.tarea_id} />
                    <MiniInfo label="Estado" value={report.estado} />
                    <MiniInfo label="Total líneas" value={report.total_lineas} />
                    <MiniInfo label="Coinciden" value={report.total_coinciden} />
                    <MiniInfo label="No coinciden" value={report.total_no_coinciden} />
                    <MiniInfo label="Exactitud" value={`${report.porcentaje_exactitud}%`} />
                    <MiniInfo label="Genera reconteo" value={report.genera_reconteo ? "Sí" : "No"} />
                    <MiniInfo label="ID reconteo" value={report.reconteo_tarea_id || "-"} />
                  </div>

                  {selectedTask && (
                    <div style={selectedTaskBoxStyle}>
                      <div style={selectedTaskTitleStyle}>
                        Datos base de la tarea seleccionada
                      </div>
                      <div style={selectedTaskTextStyle}>
                        Tipo: <strong>{selectedTask.tipo_conteo}</strong> | Criterio:{" "}
                        <strong>{selectedTask.criterio}</strong> | Asignado a:{" "}
                        <strong>{selectedTask.asignado_a}</strong>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <div id="print-area">
        {!report || !taskDetail ? null : (
          <div style={printWrapperStyle}>
            {/* PORTADA / ENCABEZADO */}
            <section style={printSectionStyle} className="print-section">
              <div style={printHeaderStyle}>
                <div>
                  <div className="print-title" style={printMainTitleStyle}>
                    WMS INOVA - INFORME DE INVENTARIO
                  </div>
                  <div className="print-subtitle" style={printSubtitleStyle}>
                    Documento operativo de tarea de inventario
                  </div>
                </div>

                <div style={printBadgeStyle}>
                  TAREA #{taskDetail.id}
                </div>
              </div>

              <div style={printSummaryGridStyle}>
                <PrintBox label="Estado" value={taskDetail.estado} />
                <PrintBox label="Tipo de conteo" value={taskDetail.tipo_conteo} />
                <PrintBox label="Criterio" value={taskDetail.criterio} />
                <PrintBox label="Asignado a" value={taskDetail.asignado_a} />
                <PrintBox label="Creado por" value={taskDetail.creado_por} />
                <PrintBox
                  label="Reconteo"
                  value={taskDetail.es_reconteo ? "Sí" : "No"}
                />
                <PrintBox
                  label="Fecha creación"
                  value={formatDateTime(taskDetail.fecha_creacion)}
                />
                <PrintBox
                  label="Fecha inicio"
                  value={formatDateTime(taskDetail.fecha_inicio)}
                />
                <PrintBox
                  label="Fecha finalización"
                  value={formatDateTime(taskDetail.fecha_finalizacion)}
                />
                <PrintBox
                  label="Fecha conciliación"
                  value={formatDateTime(taskDetail.fecha_conciliacion)}
                />
                <PrintBox
                  label="Fecha cierre"
                  value={formatDateTime(taskDetail.fecha_cierre)}
                />
                <PrintBox
                  label="Tarea origen"
                  value={taskDetail.tarea_origen_id || "-"}
                />
              </div>

              <div style={printObservacionBoxStyle}>
                <div style={printSectionTitleStyle}>Observación general</div>
                <div style={printParagraphStyle}>
                  {taskDetail.observacion || "Sin observaciones registradas."}
                </div>
              </div>

              <div style={executiveGridStyle}>
                <PrintBox label="Total líneas" value={report.total_lineas} />
                <PrintBox label="Líneas contadas" value={detalleResumen.contadas} />
                <PrintBox label="Coinciden" value={report.total_coinciden} />
                <PrintBox label="No coinciden" value={report.total_no_coinciden} />
                <PrintBox label="Exactitud" value={`${report.porcentaje_exactitud}%`} />
                <PrintBox label="Total sistema" value={detalleResumen.totalSistema} />
                <PrintBox label="Total contado" value={detalleResumen.totalContado} />
                <PrintBox label="Desviación total" value={detalleResumen.totalDiferencia} />
              </div>
            </section>

            {/* HOJA DE CONTEO */}
            <section
              style={{ ...printSectionStyle, marginTop: 18 }}
              className="print-section print-page-break"
            >
              <div style={printBlockHeaderStyle}>
                <FileText size={16} />
                <span>Hoja de conteo</span>
              </div>

              <div style={{ overflow: "hidden" }}>
                <table style={printTableStyle}>
                  <thead>
                    <tr>
                      <th style={printThStyle}>Detalle</th>
                      <th style={printThStyle}>Ubicación</th>
                      <th style={printThStyle}>Ubicación base</th>
                      <th style={printThStyle}>Posición</th>
                      <th style={printThStyle}>Zona</th>
                      <th style={printThStyle}>Código material</th>
                      <th style={printThStyle}>Descripción</th>
                      <th style={printThStyle}>Familia</th>
                      <th style={printThStyle}>UM</th>
                      <th style={printThStyle}>Lote almacén</th>
                      <th style={printThStyle}>Lote proveedor</th>
                      <th style={printThStyle}>FV</th>
                      <th style={printThStyle}>Contado</th>
                      <th style={printThStyle}>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskDetail.detalles.map((item) => (
                      <tr key={`conteo-${item.id}`}>
                        <td style={printTdStyleStrong}>{item.id}</td>
                        <td style={printTdStyle}>{item.ubicacion || "-"}</td>
                        <td style={printTdStyle}>{item.ubicacion_base || "-"}</td>
                        <td style={printTdStyle}>{item.posicion || "-"}</td>
                        <td style={printTdStyle}>{item.zona || "-"}</td>
                        <td style={printTdStyle}>{item.codigo_material}</td>
                        <td style={printTdStyle}>{item.descripcion_material || "-"}</td>
                        <td style={printTdStyle}>{item.familia || "-"}</td>
                        <td style={printTdStyle}>{item.unidad_medida || "-"}</td>
                        <td style={printTdStyle}>{item.lote_almacen || "-"}</td>
                        <td style={printTdStyle}>{item.lote_proveedor || "-"}</td>
                        <td style={printTdStyle}>{formatDate(item.fecha_vencimiento)}</td>
                        <td style={printTdStyle}>{item.cantidad_contada ?? "-"}</td>
                        <td style={printTdStyle}>{item.observacion || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ANALISIS DE DIFERENCIAS */}
            <section
              style={{ ...printSectionStyle, marginTop: 18 }}
              className="print-section print-page-break"
            >
              <div style={printBlockHeaderStyle}>
                <GitCompare size={16} />
                <span>Análisis de diferencias</span>
              </div>

              <div style={{ overflow: "hidden" }}>
                <table style={printTableStyle}>
                  <thead>
                    <tr>
                      <th style={printThStyle}>Detalle</th>
                      <th style={printThStyle}>Ubicación</th>
                      <th style={printThStyle}>Código material</th>
                      <th style={printThStyle}>Descripción</th>
                      <th style={printThStyle}>Sistema</th>
                      <th style={printThStyle}>Contado</th>
                      <th style={printThStyle}>Diferencia</th>
                      <th style={printThStyle}>Coincide</th>
                      <th style={printThStyle}>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskDetail.detalles.map((item) => (
                      <tr key={`analisis-${item.id}`}>
                        <td style={printTdStyleStrong}>{item.id}</td>
                        <td style={printTdStyle}>{item.ubicacion || "-"}</td>
                        <td style={printTdStyle}>{item.codigo_material}</td>
                        <td style={printTdStyle}>{item.descripcion_material || "-"}</td>
                        <td style={printTdStyle}>{item.cantidad_sistema ?? 0}</td>
                        <td style={printTdStyle}>{item.cantidad_contada ?? 0}</td>
                        <td style={printTdStyle}>{item.diferencia ?? 0}</td>
                        <td style={printTdStyle}>
                          {item.coincide === true
                            ? "Sí"
                            : item.coincide === false
                            ? "No"
                            : "Pendiente"}
                        </td>
                        <td style={printTdStyle}>{item.observacion || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={printSectionTitleStyle}>Resumen de diferencias</div>

                {diferencias.length === 0 ? (
                  <div style={printOkBoxStyle}>
                    No se detectaron diferencias en la tarea. El conteo coincide con el
                    stock del sistema.
                  </div>
                ) : (
                  <div style={printWarnBoxStyle}>
                    Se detectaron <strong>{diferencias.length}</strong> líneas con
                    diferencia. Revisar detalle anterior para validar desviaciones,
                    causas y necesidad de reconteo.
                  </div>
                )}
              </div>
            </section>

            {/* CIERRE */}
            <section
              style={{ ...printSectionStyle, marginTop: 18 }}
              className="print-section print-page-break"
            >
              <div style={printBlockHeaderStyle}>
                <CheckCircle2 size={16} />
                <span>Cierre del informe</span>
              </div>

              <div style={closingGridStyle}>
                <PrintBox label="Estado final" value={report.estado} />
                <PrintBox label="Total líneas" value={report.total_lineas} />
                <PrintBox label="Coinciden" value={report.total_coinciden} />
                <PrintBox label="No coinciden" value={report.total_no_coinciden} />
                <PrintBox label="Exactitud" value={`${report.porcentaje_exactitud}%`} />
                <PrintBox
                  label="Generó reconteo"
                  value={report.genera_reconteo ? "Sí" : "No"}
                />
                <PrintBox
                  label="ID reconteo generado"
                  value={report.reconteo_tarea_id || "-"}
                />
              </div>

              <div style={signatureGridStyle}>
                <div style={signatureBoxStyle}>
                  <div style={signatureLineStyle} />
                  <div style={signatureLabelStyle}>Responsable conteo</div>
                </div>
                <div style={signatureBoxStyle}>
                  <div style={signatureLineStyle} />
                  <div style={signatureLabelStyle}>Supervisor / validación</div>
                </div>
                <div style={signatureBoxStyle}>
                  <div style={signatureLineStyle} />
                  <div style={signatureLabelStyle}>Aprobación final</div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <div style={statBoxStyle}>
      <div style={statHeaderStyle}>
        <div style={statIconStyle}>{icon}</div>
        <div style={statLabelStyle}>{label}</div>
      </div>
      <div style={statValueStyle}>{value}</div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div style={miniInfoStyle}>
      <div style={miniInfoLabelStyle}>{label}</div>
      <div style={miniInfoValueStyle}>{value || "-"}</div>
    </div>
  );
}

function PrintBox({ label, value }) {
  return (
    <div style={printBoxStyle}>
      <div style={printBoxLabelStyle}>{label}</div>
      <div style={printBoxValueStyle}>{value || "-"}</div>
    </div>
  );
}

function CardHeader({ title, subtitle }) {
  return (
    <div style={cardHeaderStyle}>
      <div style={cardTitleStyle}>{title}</div>
      <div style={cardSubtitleStyle}>{subtitle}</div>
    </div>
  );
}

function MessageBox({ type, text }) {
  const isError = type === "error";
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${isError ? "#f1c7c2" : "#cfe7d5"}`,
        background: isError ? "#fff5f4" : "#eef8f1",
        color: isError ? "#9f2f25" : "#1f7a3d",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

function getStatusStyle(status) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  if (status === "PENDIENTE") {
    return {
      ...base,
      background: "#fff4db",
      color: "#9a6700",
      borderColor: "#f1ddb0",
    };
  }

  if (status === "EN_PROCESO") {
    return {
      ...base,
      background: "#e8f1ff",
      color: "#0b5ed7",
      borderColor: "#cfe0ff",
    };
  }

  if (status === "RECONTEO_PENDIENTE") {
    return {
      ...base,
      background: "#fff0f0",
      color: "#b42318",
      borderColor: "#f2c7c2",
    };
  }

  return {
    ...base,
    background: "#eaf7ee",
    color: "#1f7a3d",
    borderColor: "#cfe7d5",
  };
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

const pageStyle = {
  padding: 24,
  background: "#f5f7fa",
  minHeight: "100%",
};

const pageTopStyle = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginBottom: 18,
};

const pageTopIconStyle = {
  width: 38,
  height: 38,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "#eaf1f8",
  border: "1px solid #d6e1ec",
};

const pageTitleStyle = {
  fontSize: 24,
  fontWeight: 800,
  color: "#17324d",
};

const pageSubtitleStyle = {
  fontSize: 13,
  color: "#66788a",
  marginTop: 4,
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const statBoxStyle = {
  background: "#fff",
  border: "1px solid #dde5ee",
  borderRadius: 12,
  padding: 14,
};

const statHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const statIconStyle = {
  width: 34,
  height: 34,
  borderRadius: 8,
  background: "#eef3f8",
  border: "1px solid #dbe5ee",
  display: "grid",
  placeItems: "center",
};

const statLabelStyle = {
  fontSize: 12,
  color: "#6a7b8d",
};

const statValueStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: "#17324d",
};

const layoutGridStyle = {
  display: "grid",
  gridTemplateColumns: "1.3fr 0.95fr",
  gap: 16,
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #dde5ee",
  borderRadius: 12,
  overflow: "hidden",
  minWidth: 0,
};

const cardHeaderStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #e6ebf1",
  background: "#f8fafc",
};

const cardTitleStyle = {
  fontSize: 15,
  fontWeight: 800,
  color: "#17324d",
};

const cardSubtitleStyle = {
  fontSize: 12,
  color: "#6e7f91",
  marginTop: 4,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  minWidth: 760,
};

const thStyle = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 12,
  color: "#607080",
  borderBottom: "1px solid #e6ebf1",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "nowrap",
};

const tdCodeStyle = {
  ...tdStyle,
  fontWeight: 800,
  color: "#17324d",
};

const emptyCellStyle = {
  padding: 26,
  textAlign: "center",
  color: "#6f8092",
  borderBottom: "1px solid #edf2f7",
};

const searchRowStyle = {
  display: "flex",
  gap: 12,
  alignItems: "end",
  flexWrap: "wrap",
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#536779",
  marginBottom: 7,
};

const inputStyle = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid #cfd8e3",
  background: "#fff",
  padding: "0 12px",
  fontSize: 14,
  color: "#1e3348",
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  height: 40,
  borderRadius: 9,
  border: "1px solid #0b57d0",
  background: "#0b57d0",
  color: "#fff",
  padding: "0 14px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const secondaryButtonStyle = {
  height: 40,
  borderRadius: 9,
  border: "1px solid #c6d2df",
  background: "#fff",
  color: "#213547",
  padding: "0 14px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const printButtonStyle = {
  height: 40,
  borderRadius: 9,
  border: "1px solid #0f766e",
  background: "#0f766e",
  color: "#fff",
  padding: "0 14px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const placeholderBoxStyle = {
  border: "1px dashed #c9d4df",
  background: "#fbfcfe",
  borderRadius: 12,
  padding: 20,
  color: "#6d7e90",
  fontSize: 14,
  lineHeight: 1.6,
};

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 12,
};

const miniInfoStyle = {
  background: "#fbfcfe",
  border: "1px solid #dfe7ef",
  borderRadius: 10,
  padding: 12,
};

const miniInfoLabelStyle = {
  fontSize: 11,
  color: "#6b7c8d",
  marginBottom: 6,
};

const miniInfoValueStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#17324d",
  wordBreak: "break-word",
};

const selectedTaskBoxStyle = {
  marginTop: 16,
  border: "1px solid #dbe7f4",
  background: "#f7fbff",
  borderRadius: 10,
  padding: 14,
};

const selectedTaskTitleStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: "#355b7e",
  marginBottom: 8,
};

const selectedTaskTextStyle = {
  fontSize: 13,
  color: "#587086",
  lineHeight: 1.55,
};

const printWrapperStyle = {
  marginTop: 24,
};

const printSectionStyle = {
  background: "#fff",
  border: "1px solid #d9e1ea",
  borderRadius: 12,
  padding: 22,
};

const printHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const printMainTitleStyle = {
  fontSize: 28,
  fontWeight: 900,
  color: "#17324d",
  lineHeight: 1.1,
};

const printSubtitleStyle = {
  fontSize: 13,
  color: "#66788a",
  marginTop: 6,
};

const printBadgeStyle = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid #cfe0ff",
  background: "#e8f1ff",
  color: "#0b5ed7",
  fontWeight: 800,
  fontSize: 13,
};

const printSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
  gap: 12,
};

const printBoxStyle = {
  border: "1px solid #dce5ee",
  borderRadius: 10,
  background: "#fbfcfe",
  padding: 12,
};

const printBoxLabelStyle = {
  fontSize: 11,
  color: "#627385",
  marginBottom: 6,
};

const printBoxValueStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#17324d",
  wordBreak: "break-word",
};

const printObservacionBoxStyle = {
  marginTop: 18,
  border: "1px solid #dce5ee",
  borderRadius: 10,
  background: "#fff",
  padding: 14,
};

const printSectionTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#17324d",
  marginBottom: 8,
};

const printParagraphStyle = {
  fontSize: 13,
  color: "#46596b",
  lineHeight: 1.6,
};

const executiveGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
  gap: 12,
  marginTop: 18,
};

const printBlockHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 16,
  fontWeight: 900,
  color: "#17324d",
  marginBottom: 14,
};

const printTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const printThStyle = {
  border: "1px solid #dbe4ec",
  background: "#f4f7fb",
  padding: "8px 10px",
  fontSize: 11,
  textAlign: "left",
  color: "#3f556b",
  fontWeight: 800,
};

const printTdStyle = {
  border: "1px solid #e3eaf1",
  padding: "8px 10px",
  fontSize: 11,
  color: "#23384e",
  verticalAlign: "top",
};

const printTdStyleStrong = {
  ...printTdStyle,
  fontWeight: 800,
};

const printOkBoxStyle = {
  border: "1px solid #cfe7d5",
  background: "#eef8f1",
  color: "#1f7a3d",
  borderRadius: 10,
  padding: 14,
  fontSize: 13,
  fontWeight: 700,
};

const printWarnBoxStyle = {
  border: "1px solid #ead9aa",
  background: "#fff9e8",
  color: "#7b651a",
  borderRadius: 10,
  padding: 14,
  fontSize: 13,
  lineHeight: 1.6,
};

const closingGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
  gap: 12,
};

const signatureGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 24,
  marginTop: 42,
};

const signatureBoxStyle = {
  textAlign: "center",
};

const signatureLineStyle = {
  borderTop: "1px solid #5c6c7c",
  marginBottom: 8,
  height: 1,
};

const signatureLabelStyle = {
  fontSize: 12,
  color: "#56697d",
  fontWeight: 700,
};