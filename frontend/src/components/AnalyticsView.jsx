import { useEffect, useMemo, useState } from "react";

function MetricCard({ label, value, sub }) {
  return (
    <div className="analytics-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function BarList({ items, max }) {
  return (
    <div className="analytics-bars">
      {items.map((item) => (
        <div className="analytics-bar-row" key={item.label}>
          <div className="analytics-bar-label">
            <span>{item.label}</span>
            <b>{item.value}</b>
          </div>
          <div className="analytics-bar-track">
            <div
              className="analytics-bar-fill"
              style={{
                width: `${Math.max(
                  3,
                  (item.value / Math.max(max, 1)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, eyebrow, children, className = "" }) {
  return (
    <section className={`analytics-panel ${className}`}>
      <div className="analytics-panel-head">
        <span className="analytics-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      <div className="analytics-panel-body">{children}</div>
    </section>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/analytics")
      .then((r) => {
        if (!r.ok) throw new Error("Analytics API failed");
        return r.json();
      })
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError(true);
      });
  }, []);

  const riskItems = useMemo(() => {
    if (!data?.risk_distribution) return [];

    return [
      { label: "Critical", value: data.risk_distribution.critical || 0 },
      { label: "High", value: data.risk_distribution.high || 0 },
      { label: "Medium", value: data.risk_distribution.medium || 0 },
      { label: "Low", value: data.risk_distribution.low || 0 },
    ];
  }, [data]);

  const entityItems = useMemo(() => {
    if (!data?.entity_composition) return [];

    return Object.entries(data.entity_composition)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const anomalyItems = useMemo(() => {
    if (!data?.anomalies_data) return [];

    const counts = {};

    data.anomalies_data.forEach((item) => {
      const label = item.kind || "Unknown";
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const [bridges, setBridges] = useState([]);

  useEffect(() => {
    fetch("/analytics/bridges")
      .then((r) => (r.ok ? r.json() : { bridges: [] }))
      .then((d) => setBridges(d.bridges || []))
      .catch(() => setBridges([]));
  }, []);

  const relationshipItems = useMemo(() => {
    if (!data?.relationship_distribution) return [];
    return Object.entries(data.relationship_distribution)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const incidentTrend = data?.incident_trends || [];
  const maxIncidents = Math.max(...incidentTrend.map((x) => x.incidents || 0), 1);

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-error">
          <strong>Analytics unavailable</strong>
          <span>Unable to load intelligence analytics.</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          Loading intelligence analytics…
        </div>
      </div>
    );
  }

  const summary = data.summary || {};
  const topConnected = data.top_connected || [];
  const communities = data.communities_data || [];
  const anomalies = data.anomalies_data || [];
  const predictedLinks = data.predicted_links_data || [];

  const maxRisk = Math.max(...riskItems.map((x) => x.value), 1);
  const maxEntity = Math.max(...entityItems.map((x) => x.value), 1);
  const maxAnomaly = Math.max(...anomalyItems.map((x) => x.value), 1);

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <div className="analytics-title-row">
            <span className="analytics-mark">SIXENSE</span>
            <span>/</span>
            <span>ANALYTICS</span>
          </div>

          <h1>Intelligence Analytics</h1>

          <p>
            Network patterns, risk distribution and activity intelligence.
          </p>
        </div>

        <button
          className="analytics-refresh"
          onClick={() => window.location.reload()}
        >
          ↻ Refresh
        </button>
      </header>

      <div className="analytics-kpis">
        <MetricCard
          label="ENTITIES"
          value={summary.entities ?? 0}
          sub="graph nodes"
        />

        <MetricCard
          label="HIGH RISK"
          value={summary.high_risk ?? 0}
          sub="risk score ≥ 70"
        />

        <MetricCard
          label="CONNECTIONS"
          value={summary.connections ?? 0}
          sub="graph edges"
        />

        <MetricCard
          label="ANOMALIES"
          value={summary.anomalies ?? 0}
          sub="detected patterns"
        />

        <MetricCard
          label="COMMUNITIES"
          value={summary.communities ?? 0}
          sub="Louvain clusters"
        />

        <MetricCard
          label="PREDICTED LINKS"
          value={summary.predicted_links ?? 0}
          sub="Jaccard candidates"
        />
      </div>

      <div className="analytics-grid analytics-grid-top">
        <Panel title="Risk distribution" eyebrow="RISK">
          <BarList items={riskItems} max={maxRisk} />
        </Panel>

        <Panel title="Entity composition" eyebrow="NETWORK">
          <BarList items={entityItems} max={maxEntity} />
        </Panel>

        <Panel title="Top connected people" eyebrow="CENTRALITY">
          <div className="analytics-entity-list">
            {topConnected.slice(0, 5).map((p, i) => (
              <div className="analytics-entity" key={p.id}>
                <span className="analytics-rank">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="analytics-entity-main">
                  <strong>{p.id}</strong>
                  <small>
                    Betweenness{" "}
                    {Number(p.betweenness_centrality || 0).toFixed(3)}
                    {" · "}
                    PageRank{" "}
                    {Number(p.pagerank || 0).toFixed(4)}
                  </small>
                </div>

                <b>
                  {Number(p.degree_centrality || 0).toFixed(3)}
                </b>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-middle">
        <Panel title="Community detection" eyebrow="LOUVAIN">
          <div className="analytics-community-list">
            {communities.length ? (
              communities.slice(0, 5).map((community, i) => (
                <div
                  className="analytics-community"
                  key={community.community_id}
                >
                  <span>
                    C{String(i + 1).padStart(2, "0")}
                  </span>

                  <strong>{community.size}</strong>

                  <small>people</small>

                  <b>
                    {community.member_ids?.slice(0, 3).join(", ")}
                    {community.member_ids?.length > 3 ? " …" : ""}
                  </b>
                </div>
              ))
            ) : (
              <div className="analytics-empty">
                No communities detected.
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Anomaly detection" eyebrow="EVENTS">
          <div className="analytics-community-list">
            {anomalies.length ? (
              anomalies.slice(0, 4).map((item, i) => (
                <div className="analytics-community" key={`${item.kind}-${i}`}>
                  <span>{String(i + 1).padStart(2, "0")}</span>

                  <strong>{item.kind}</strong>

                  <small>{item.entity_id}</small>

                  <b>
                    {item.recent_count} recent events
                  </b>
                </div>
              ))
            ) : (
              <div className="analytics-empty">
                No anomalies detected.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-bottom">
        <Panel title="Relationship distribution" eyebrow="RELATIONSHIPS">
          <BarList
            items={relationshipItems}
            max={Math.max(...relationshipItems.map((x) => x.value), 1)}
          />
        </Panel>

        <Panel title="Incident trends" eyebrow="OVER TIME">
          <div className="analytics-trend">
            {incidentTrend.length ? (
              incidentTrend.map((point) => (
                <div className="analytics-trend-col" key={point.month}>
                  <div
                    className="analytics-trend-bar"
                    style={{ height: `${Math.max(6, (point.incidents / maxIncidents) * 100)}%` }}
                    title={`${point.month}: ${point.incidents}`}
                  />
                  <small>{point.month.slice(5)}</small>
                </div>
              ))
            ) : (
              <div className="analytics-empty">No incident history yet.</div>
            )}
          </div>
        </Panel>

        <Panel title="Bridge entities" eyebrow="NETWORK">
          <div className="analytics-entity-list">
            {bridges.length ? (
              bridges.slice(0, 5).map((b, i) => (
                <div className="analytics-entity" key={b.id}>
                  <span className="analytics-rank">{String(i + 1).padStart(2, "0")}</span>
                  <div className="analytics-entity-main">
                    <strong>{b.label}</strong>
                    <small>{b.id} · degree {b.degree}</small>
                  </div>
                  <b>{Number(b.betweenness_centrality || 0).toFixed(3)}</b>
                </div>
              ))
            ) : (
              <div className="analytics-empty">No bridge entities detected.</div>
            )}
          </div>
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-bottom">
        <Panel title="Predicted connections" eyebrow="LINK PREDICTION">
          <div className="analytics-community-list">
            {predictedLinks.length ? (
              predictedLinks.slice(0, 5).map((link, i) => (
                <div
                  className="analytics-community"
                  key={`${link.person_a}-${link.person_b}`}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>

                  <strong>
                    {link.person_a} ↔ {link.person_b}
                  </strong>

                  <small>
                    {link.common_neighbors} common neighbors
                  </small>

                  <b>
                    Jaccard {Number(link.jaccard || 0).toFixed(3)}
                  </b>
                </div>
              ))
            ) : (
              <div className="analytics-empty">
                No potential links detected.
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Analytics methodology" eyebrow="MODEL">
          <div className="analytics-method-list">
            <div>
              <span>01</span>
              <strong>Centrality</strong>
              <small>Degree · Betweenness · PageRank</small>
            </div>

            <div>
              <span>02</span>
              <strong>Communities</strong>
              <small>Louvain graph clustering</small>
            </div>

            <div>
              <span>03</span>
              <strong>Anomalies</strong>
              <small>Transaction & call-volume patterns</small>
            </div>

            <div>
              <span>04</span>
              <strong>Link prediction</strong>
              <small>Common neighbors + Jaccard</small>
            </div>
          </div>
        </Panel>
      </div>

      <footer className="analytics-footer">
        SYNTHETIC DEMO DATA · Decision-support visualization only · Not evidence of guilt
      </footer>
    </div>
  );
}
