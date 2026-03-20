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
        (x) => x.estado === "PENDIENTE" || x.estado === "EN_PROCESO" || x.estado === "RECONTEO_PENDIENTE"
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
        * {
          box-sizing: border-box;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 6mm 6mm 6mm;
          }

          html, body {
            width: 100%;
            height: auto;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #1b2d40;
          }

          body * {
            visibility: hidden !important;
          }

          #print-area, #print-area * {
            visibility: visible !important;
          }

          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: #ffffff;
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

          .print-title {
            font-size: 16px !important;
            font-weight: 800 !important;
            line-height: 1.08 !important;
            letter-spacing: 0.15px !important;
          }

          .print-subtitle {
            font-size: 9px !important;
            line-height: 1.1 !important;
          }

          .print-grid-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }

          .print-grid-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .print-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          .print-table th,
          .print-table td {
            word-break: break-word !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
          }

          .print-table th {
            font-size: 7px !important;
            padding: 3px 4px !important;
            line-height: 1.02 !important;
          }

          .print-table td {
            font-size: 7px !important;
            padding: 3px 4px !important;
            line-height: 1.02 !important;
          }

          .print-table-conteo th {
            font-size: 6px !important;
            padding: 2px 2px !important;
            line-height: 0.98 !important;
          }

          .print-table-conteo td {
            font-size: 6px !important;
            padding: 2px 2px !important;
            line-height: 0.98 !important;
          }

          .print-table-conteo th,
          .print-table-conteo td {
            word-break: break-word !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
          }

          .print-table-conteo tr {
            height: auto !important;
          }

          .print-compact-box {
            padding: 7px !important;
          }

          .print-compact-box-label {
            font-size: 8.3px !important;
            margin-bottom: 3px !important;
          }

          .print-compact-box-value {
            font-size: 10px !important;
            line-height: 1.08 !important;
          }

          .print-signatures {
            margin-top: 18px !important;
          }

          .print-section-tight {
            padding: 10px !important;
          }

          .print-block-tight {
            margin-top: 8px !important;
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
            icon={<AlertTriangle size={18} color="#8f5c00" />}
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
                    <tr style={{ background: "#f8fafc" }}>
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
                              background: active ? "#edf4fb" : "#fff",
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
            {/* PORTADA / RESUMEN */}
            <section
              style={printSectionStyle}
              className="print-section print-section-tight"
            >
              <div style={printHeaderStyle}>
                <div style={printBrandWrapStyle}>
                  <div style={printLogoBoxStyle}>
                    <div style={printLogoCircleStyle}>W</div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={printBrandNameStyle}>WMS INOVA</div>
                    <div style={printBrandSubStyle}>Control logístico</div>
                    <div className="print-title" style={printMainTitleStyle}>
                      INFORME DE INVENTARIO
                    </div>
                    <div className="print-subtitle" style={printSubtitleStyle}>
                      Documento operativo de tarea de inventario
                    </div>
                  </div>
                </div>

                <div style={printBadgeStyle}>TAREA #{taskDetail.id}</div>
              </div>

              <div style={printSummaryGridStyle} className="print-grid-4">
                <PrintBox label="Estado" value={taskDetail.estado} />
                <PrintBox label="Tipo de conteo" value={taskDetail.tipo_conteo} />
                <PrintBox label="Criterio" value={taskDetail.criterio} />
                <PrintBox label="Asignado a" value={taskDetail.asignado_a} />
                <PrintBox label="Creado por" value={taskDetail.creado_por} />
                <PrintBox label="Reconteo" value={taskDetail.es_reconteo ? "Sí" : "No"} />
                <PrintBox label="Fecha creación" value={formatDateTime(taskDetail.fecha_creacion)} />
                <PrintBox label="Fecha inicio" value={formatDateTime(taskDetail.fecha_inicio)} />
                <PrintBox label="Fecha finalización" value={formatDateTime(taskDetail.fecha_finalizacion)} />
                <PrintBox label="Fecha conciliación" value={formatDateTime(taskDetail.fecha_conciliacion)} />
                <PrintBox label="Fecha cierre" value={formatDateTime(taskDetail.fecha_cierre)} />
                <PrintBox label="Tarea origen" value={taskDetail.tarea_origen_id || "-"} />
              </div>

              <div style={printObservacionBoxStyle} className="print-block-tight">
                <div style={printSectionTitleStyle}>Observación general</div>
                <div style={printParagraphStyle}>
                  {taskDetail.observacion || "Sin observaciones registradas."}
                </div>
              </div>

              <div style={executiveGridStyle} className="print-grid-4 print-block-tight">
                <PrintBox label="Total líneas" value={report.total_lineas} />
                <PrintBox label="Líneas contadas" value={detalleResumen.contadas} />
                <PrintBox label="Coinciden" value={report.total_coinciden} />
                <PrintBox label="No coinciden" value={report.total_no_coinciden} />
                <PrintBox label="Exactitud" value={`${report.porcentajeExactitud ?? report.porcentaje_exactitud}%`} />
                <PrintBox label="Total sistema" value={detalleResumen.totalSistema} />
                <PrintBox label="Total contado" value={detalleResumen.totalContado} />
                <PrintBox label="Desviación total" value={detalleResumen.totalDiferencia} />
              </div>
            </section>

            {/* HOJA DE CONTEO */}
            <section
              style={{ ...printSectionStyle, marginTop: 10 }}
              className="print-section print-page-break print-section-tight"
            >
              <div style={printBlockHeaderStyle}>
                <FileText size={13} />
                <span>Hoja de conteo</span>
              </div>

              <table style={printTableConteoStyle} className="print-table print-table-conteo">
                <colgroup>
                  <col style={{ width: "4.5%" }} />
                  <col style={{ width: "7.5%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "4.5%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "6.5%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "8.5%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "5.5%" }} />
                  <col style={{ width: "4.5%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={printThConteoStyle}>Det.</th>
                    <th style={printThConteoStyle}>Ubic.</th>
                    <th style={printThConteoStyle}>Base</th>
                    <th style={printThConteoStyle}>Pos.</th>
                    <th style={printThConteoStyle}>Zona</th>
                    <th style={printThConteoStyle}>Cod.</th>
                    <th style={printThConteoStyle}>Desc.</th>
                    <th style={printThConteoStyle}>Fam.</th>
                    <th style={printThConteoStyle}>UM</th>
                    <th style={printThConteoStyle}>Lote alm.</th>
                    <th style={printThConteoStyle}>Lote prov.</th>
                    <th style={printThConteoStyle}>FV</th>
                    <th style={printThConteoStyle}>Cant.</th>
                    <th style={printThConteoStyle}>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {taskDetail.detalles.map((item) => (
                    <tr key={`conteo-${item.id}`}>
                      <td style={printTdConteoStrongStyle}>{item.id}</td>
                      <td style={printTdConteoStyle}>{item.ubicacion || "-"}</td>
                      <td style={printTdConteoStyle}>{item.ubicacion_base || "-"}</td>
                      <td style={printTdConteoStyle}>{item.posicion || "-"}</td>
                      <td style={printTdConteoStyle}>{item.zona || "-"}</td>
                      <td style={printTdConteoStyle}>{item.codigo_material}</td>
                      <td style={printTdConteoStyle}>{item.descripcion_material || "-"}</td>
                      <td style={printTdConteoStyle}>{item.familia || "-"}</td>
                      <td style={printTdConteoStyle}>{item.unidad_medida || "-"}</td>
                      <td style={printTdConteoStyle}>{item.lote_almacen || "-"}</td>
                      <td style={printTdConteoStyle}>{item.lote_proveedor || "-"}</td>
                      <td style={printTdConteoStyle}>{formatDate(item.fecha_vencimiento)}</td>
                      <td style={printTdConteoStyle}>{item.cantidad_contada ?? "-"}</td>
                      <td style={printTdConteoStyle}>{item.observacion || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ANALISIS DE DIFERENCIAS */}
            <section
              style={{ ...printSectionStyle, marginTop: 10 }}
              className="print-section print-page-break print-section-tight"
            >
              <div style={printBlockHeaderStyle}>
                <GitCompare size={13} />
                <span>Análisis de diferencias</span>
              </div>

              <table style={printTableStyle} className="print-table">
                <colgroup>
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "11%" }} />
                </colgroup>
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

              <div style={{ marginTop: 10 }}>
                <div style={printSectionTitleStyle}>Resumen de diferencias</div>

                {diferencias.length === 0 ? (
                  <div style={printOkBoxStyle}>
                    No se detectaron diferencias en la tarea. El conteo coincide con el stock del sistema.
                  </div>
                ) : (
                  <div style={printWarnBoxStyle}>
                    Se detectaron <strong>{diferencias.length}</strong> líneas con diferencia. Revisar el detalle anterior para validar desviaciones, causas y necesidad de reconteo.
                  </div>
                )}
              </div>
            </section>

            {/* CIERRE */}
            <section
              style={{ ...printSectionStyle, marginTop: 10 }}
              className="print-section print-page-break print-section-tight"
            >
              <div style={printBlockHeaderStyle}>
                <CheckCircle2 size={13} />
                <span>Cierre del informe</span>
              </div>

              <div style={closingGridStyle} className="print-grid-4">
                <PrintBox label="Estado final" value={report.estado} />
                <PrintBox label="Total líneas" value={report.total_lineas} />
                <PrintBox label="Coinciden" value={report.total_coinciden} />
                <PrintBox label="No coinciden" value={report.total_no_coinciden} />
                <PrintBox label="Exactitud" value={`${report.porcentaje_exactitud}%`} />
                <PrintBox label="Generó reconteo" value={report.genera_reconteo ? "Sí" : "No"} />
                <PrintBox label="ID reconteo generado" value={report.reconteo_tarea_id || "-"} />
              </div>

              <div style={signatureGridStyle} className="print-signatures">
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
    <div style={printBoxStyle} className="print-compact-box">
      <div style={printBoxLabelStyle} className="print-compact-box-label">
        {label}
      </div>
      <div style={printBoxValueStyle} className="print-compact-box-value">
        {value || "-"}
      </div>
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
      background: "#fff1ef",
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
  background: "#f2f4f7",
  minHeight: "100%",
  fontFamily: '"Segoe UI", Arial, sans-serif',
  color: "#1f2d3d",
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
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  background: "#eef3f8",
  border: "1px solid #d8e1ea",
};

const pageTitleStyle = {
  fontSize: 24,
  fontWeight: 800,
  color: "#17324d",
  letterSpacing: "0.1px",
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
  borderRadius: 8,
  padding: 14,
  boxShadow: "0 1px 1px rgba(15,23,42,0.02)",
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
  background: "#f3f6f9",
  border: "1px solid #dbe5ee",
  display: "grid",
  placeItems: "center",
};

const statLabelStyle = {
  fontSize: 12,
  color: "#66788a",
  fontWeight: 600,
};

const statValueStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: "#17324d",
  lineHeight: 1,
};

const layoutGridStyle = {
  display: "grid",
  gridTemplateColumns: "1.3fr 0.95fr",
  gap: 16,
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #dde5ee",
  borderRadius: 8,
  overflow: "hidden",
  minWidth: 0,
  boxShadow: "0 1px 1px rgba(15,23,42,0.02)",
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
  padding: "11px 12px",
  fontSize: 12,
  color: "#5f7285",
  borderBottom: "1px solid #e6ebf1",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "11px 12px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "nowrap",
  fontSize: 13,
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
  borderRadius: 8,
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
  borderRadius: 8,
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
  borderRadius: 8,
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
  borderRadius: 8,
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
  borderRadius: 8,
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
  borderRadius: 8,
  padding: 12,
};

const miniInfoLabelStyle = {
  fontSize: 11,
  color: "#6b7c8d",
  marginBottom: 6,
  fontWeight: 600,
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
  borderRadius: 8,
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
  marginTop: 0,
  fontFamily: '"Segoe UI", Arial, sans-serif',
  color: "#203246",
};

const printSectionStyle = {
  background: "#fff",
  border: "1px solid #d3dde7",
  borderRadius: 6,
  padding: 10,
};

const printHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 10,
  paddingBottom: 8,
  borderBottom: "2px solid #d9e2ec",
};

const printBrandWrapStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  minWidth: 0,
};

const printLogoBoxStyle = {
  width: 36,
  height: 36,
  borderRadius: 6,
  border: "1px solid #cfd8e3",
  background: "#f4f7fa",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const printLogoCircleStyle = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "#17324d",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
};

const printBrandNameStyle = {
  fontSize: 17,
  fontWeight: 900,
  color: "#16324a",
  letterSpacing: "0.2px",
  lineHeight: 1.02,
};

const printBrandSubStyle = {
  fontSize: 8.5,
  color: "#6a7b8d",
  marginTop: 1,
  marginBottom: 4,
  fontWeight: 500,
};

const printMainTitleStyle = {
  fontSize: 16,
  fontWeight: 800,
  color: "#17324d",
  lineHeight: 1.08,
  letterSpacing: "0.12px",
  marginTop: 1,
};

const printSubtitleStyle = {
  fontSize: 9,
  color: "#617487",
  marginTop: 3,
  fontWeight: 500,
};

const printBadgeStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #c9d8ea",
  background: "#f4f8fd",
  color: "#184e9e",
  fontWeight: 800,
  fontSize: 10,
  letterSpacing: "0.15px",
  whiteSpace: "nowrap",
};

const printSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 7,
};

const printBoxStyle = {
  border: "1px solid #d7e0ea",
  borderRadius: 6,
  background: "#ffffff",
  padding: 7,
};

const printBoxLabelStyle = {
  fontSize: 8.5,
  color: "#6a7c8f",
  marginBottom: 4,
  fontWeight: 600,
};

const printBoxValueStyle = {
  fontSize: 10,
  fontWeight: 700,
  color: "#17324d",
  wordBreak: "break-word",
  lineHeight: 1.12,
};

const printObservacionBoxStyle = {
  marginTop: 8,
  border: "1px solid #d7e0ea",
  borderRadius: 6,
  background: "#ffffff",
  padding: 8,
};

const printSectionTitleStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#17324d",
  marginBottom: 5,
};

const printParagraphStyle = {
  fontSize: 9,
  color: "#4b6074",
  lineHeight: 1.35,
};

const executiveGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 7,
  marginTop: 8,
};

const printBlockHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11.5,
  fontWeight: 800,
  color: "#17324d",
  marginBottom: 7,
  paddingBottom: 5,
  borderBottom: "1px solid #dce4ec",
};

const printTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const printTableConteoStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const printThStyle = {
  border: "1px solid #d6dee8",
  background: "#edf2f7",
  padding: "4px 5px",
  fontSize: 7,
  textAlign: "left",
  color: "#3f556b",
  fontWeight: 800,
  lineHeight: 1.02,
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const printTdStyle = {
  border: "1px solid #e1e8ef",
  padding: "4px 5px",
  fontSize: 7,
  color: "#22384d",
  verticalAlign: "top",
  lineHeight: 1.02,
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const printTdStyleStrong = {
  ...printTdStyle,
  fontWeight: 700,
  color: "#17324d",
};

const printThConteoStyle = {
  border: "1px solid #d6dee8",
  background: "#edf2f7",
  padding: "2px 2px",
  fontSize: 6,
  textAlign: "left",
  color: "#3f556b",
  fontWeight: 800,
  lineHeight: 0.98,
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const printTdConteoStyle = {
  border: "1px solid #e1e8ef",
  padding: "2px 2px",
  fontSize: 6,
  color: "#22384d",
  verticalAlign: "top",
  lineHeight: 0.98,
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

const printTdConteoStrongStyle = {
  ...printTdConteoStyle,
  fontWeight: 700,
  color: "#17324d",
};

const printOkBoxStyle = {
  border: "1px solid #cfe2d6",
  background: "#f3faf5",
  color: "#245b37",
  borderRadius: 6,
  padding: 8,
  fontSize: 9,
  fontWeight: 600,
};

const printWarnBoxStyle = {
  border: "1px solid #e7d7ab",
  background: "#fffaf0",
  color: "#7a5b11",
  borderRadius: 6,
  padding: 8,
  fontSize: 9,
  lineHeight: 1.35,
};

const closingGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 7,
};

const signatureGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 18,
  marginTop: 18,
};

const signatureBoxStyle = {
  textAlign: "center",
};

const signatureLineStyle = {
  borderTop: "1px solid #5c6c7c",
  marginBottom: 6,
  height: 1,
};

const signatureLabelStyle = {
  fontSize: 8.8,
  color: "#56697d",
  fontWeight: 700,
};