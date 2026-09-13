import React, { useState } from "react";

const API = "";

export default function Reports() {
  const [personId, setPersonId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = async () => {
    const id = personId.trim();
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/reports/${encodeURIComponent(id)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Unable to generate report");
      }

      setReport(data.report);
    } catch (err) {
      setReport(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    if (!report) return;

    const blob = new Blob(
      [JSON.stringify(report, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sixense-report-${report.entity.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="reports-page">
      <header className="reports-header">
        <div>
          <div className="reports-eyebrow">SIXENSE / REPORTING & INTELLIGENCE</div>
          <h1>Reports</h1>
          <p>Generate an evidence-grounded intelligence assessment from the active graph.</p>
        </div>

        <div className="reports-header-actions">
          <span className="reports-status">
            <i />
            REPORT ENGINE READY
          </span>

          <button
            className="reports-export"
            onClick={exportJSON}
            disabled={!report}
          >
            EXPORT JSON
          </button>
        </div>
      </header>

      <section className="reports-workspace">
        {/* LEFT — CONFIGURATION */}
        <aside className="reports-panel reports-config">
          <div className="reports-panel-head">
            <div>
              <span>01</span>
              <h2>Report Setup</h2>
            </div>
          </div>

          <div className="reports-config-body">
            <label>ENTITY / PERSON ID</label>

            <div className="reports-id-row">
              <input
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadReport();
                }}
                placeholder="P9399"
              />
            </div>

            <div className="reports-type">
              <span>REPORT TYPE</span>
              <strong>INTELLIGENCE ASSESSMENT</strong>
            </div>

            <div className="reports-sections">
              <span>INCLUDED SECTIONS</span>

              {[
                "Executive assessment",
                "Priority & risk factors",
                "Network intelligence",
                "Case associations",
                "Linked evidence",
              ].map((item) => (
                <div className="reports-check" key={item}>
                  <b>✓</b>
                  {item}
                </div>
              ))}
            </div>

            <button
              className="reports-generate"
              onClick={loadReport}
              disabled={loading || !personId.trim()}
            >
              {loading ? "GENERATING..." : "GENERATE REPORT"}
              <span>→</span>
            </button>

            {error && (
              <div className="reports-error">
                <span>ERROR</span>
                {error}
              </div>
            )}
          </div>

          <div className="reports-method">
            <span>DATA SOURCE</span>
            <strong>ACTIVE SIXENSE GRAPH</strong>
            <p>
              Report values are calculated from the current graph,
              scoring engine and linked records.
            </p>
          </div>
        </aside>

        {/* CENTER — REPORT */}
        <section className="reports-panel reports-document">
          <div className="reports-panel-head">
            <div>
              <span>02</span>
              <h2>Report Preview</h2>
            </div>

            {report && (
              <span className="reports-generated">
                GENERATED {new Date(report.generated_at).toLocaleTimeString()}
              </span>
            )}
          </div>

          {!report && !loading ? (
            <div className="reports-empty">
              <div className="reports-empty-mark">▱</div>
              <strong>NO REPORT GENERATED</strong>
              <p>
                Enter a Person ID and generate an assessment
                from the active intelligence graph.
              </p>
            </div>
          ) : loading ? (
            <div className="reports-empty">
              <div className="reports-loading-bars">
                <i />
                <i />
                <i />
              </div>
              <strong>BUILDING ASSESSMENT</strong>
              <p>
                Aggregating risk, network, case and evidence signals.
              </p>
            </div>
          ) : (
            <div className="reports-content">
              <div className="reports-title-block">
                <span>CONFIDENTIAL / ANALYTICAL</span>
                <h3>{report.title}</h3>
                <p>
                  Subject: <b>{report.entity.label}</b>
                  <em>{report.entity.id}</em>
                </p>
              </div>

              <div className="reports-executive">
                <div className="reports-section-title">
                  EXECUTIVE ASSESSMENT
                </div>

                <p>
                  {report.entity.label} is associated with an
                  Investigative Priority Score of{" "}
                  <b>{Number(report.priority.score).toFixed(1)}/100</b>{" "}
                  and a <b>{report.priority.confidence_tier}</b>{" "}
                  confidence tier. {report.priority.why_flagged}
                </p>

                <small>
                  This assessment is a prioritization signal for human
                  review and does not establish involvement in any offense.
                </small>
              </div>

              <div className="reports-risk-grid">
                <div>
                  <span>PRIORITY SCORE</span>
                  <strong>{Number(report.priority.score).toFixed(1)}</strong>
                  <small>/100</small>
                </div>

                <div>
                  <span>CONFIDENCE</span>
                  <strong>{report.priority.confidence_tier}</strong>
                </div>

                <div>
                  <span>COMMUNITY</span>
                  <strong>
                    {report.network.community_id ?? "—"}
                  </strong>
                </div>

                <div>
                  <span>CONNECTIONS</span>
                  <strong>{report.network.connection_count}</strong>
                </div>
              </div>

              <div className="reports-two-col">
                <section>
                  <div className="reports-section-title">
                    NETWORK INTELLIGENCE
                  </div>

                  <div className="reports-metrics">
                    <div>
                      <span>DEGREE CENTRALITY</span>
                      <b>{Number(report.network.degree_centrality).toFixed(4)}</b>
                    </div>
                    <div>
                      <span>BETWEENNESS</span>
                      <b>{Number(report.network.betweenness_centrality).toFixed(4)}</b>
                    </div>
                    <div>
                      <span>PAGERANK</span>
                      <b>{Number(report.network.pagerank).toFixed(4)}</b>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="reports-section-title">
                    CASE ASSOCIATIONS
                  </div>

                  {report.cases.length ? (
                    report.cases.slice(0, 4).map((item) => (
                      <div className="reports-case" key={item.id}>
                        <div>
                          <b>{item.case_number || item.id}</b>
                          <span>{item.status || "Unknown"}</span>
                        </div>
                        <small>{item.source || "Unknown source"}</small>
                      </div>
                    ))
                  ) : (
                    <div className="reports-muted">
                      No linked case records.
                    </div>
                  )}
                </section>
              </div>

              <section className="reports-evidence">
                <div className="reports-section-title">
                  LINKED EVIDENCE
                  <span>{report.evidence.length} RECORDS</span>
                </div>

                {report.evidence.length ? (
                  report.evidence.slice(0, 8).map((item, index) => (
                    <div className="reports-evidence-row" key={`${item.reference_id}-${index}`}>
                      <span>{item.kind || "RECORD"}</span>
                      <b>{item.reference_id || "—"}</b>
                      <p>{item.detail || "Linked graph record."}</p>
                      <small>{item.confidence || "Unknown"}</small>
                    </div>
                  ))
                ) : (
                  <div className="reports-muted">
                    No linked evidence records.
                  </div>
                )}
              </section>
            </div>
          )}
        </section>

        {/* RIGHT — SNAPSHOT */}
        <aside className="reports-panel reports-snapshot">
          <div className="reports-panel-head">
            <div>
              <span>03</span>
              <h2>Snapshot</h2>
            </div>
          </div>

          {!report ? (
            <div className="reports-snapshot-empty">
              <div>◎</div>
              <span>ENTITY CONTEXT</span>
              <p>
                Report metrics and network context will appear here
                after generation.
              </p>
            </div>
          ) : (
            <div className="reports-snapshot-body">
              <div className="reports-subject">
                <div className="reports-avatar">
                  {(report.entity.label || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{report.entity.label}</strong>
                  <span>{report.entity.id}</span>
                </div>
              </div>

              <div className="reports-score-ring">
                <div>
                  <strong>{Number(report.priority.score).toFixed(1)}</strong>
                  <span>PRIORITY</span>
                </div>
              </div>

              <div className="reports-snapshot-list">
                <div>
                  <span>ENTITY TYPE</span>
                  <b>{report.entity.type}</b>
                </div>
                <div>
                  <span>CONFIDENCE</span>
                  <b>{report.priority.confidence_tier}</b>
                </div>
                <div>
                  <span>LINKED CASES</span>
                  <b>{report.cases.length}</b>
                </div>
                <div>
                  <span>EVIDENCE RECORDS</span>
                  <b>{report.evidence.length}</b>
                </div>
                <div>
                  <span>GRAPH CONNECTIONS</span>
                  <b>{report.network.connection_count}</b>
                </div>
              </div>

              <div className="reports-connected">
                <div className="reports-section-title">
                  CONNECTED ENTITIES
                </div>

                {report.network.connected_entities.slice(0, 7).map((entity) => (
                  <div className="reports-connected-row" key={entity.id}>
                    <span>{entity.ntype}</span>
                    <div>
                      <b>{entity.label || entity.id}</b>
                      <small>{entity.id}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
