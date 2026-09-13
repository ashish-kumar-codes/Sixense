import { useEffect, useState } from "react";
import { Users, FileText, AlertTriangle, TrendingUp, Activity, Shield, ArrowRight, Eye } from "lucide-react";
import api from "../api";

function StatCard({ label, value, sub, accent, icon: Icon, loading }) {
  const accentClasses = {
    amber: "text-amber shadow-glow-amber",
    teal: "text-teal",
    rust: "text-rust",
    indigo: "text-indigo",
  };
  return (
    <div className="card p-5 flex items-start gap-4 animate-slide-up">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-ink-800 ${accentClasses[accent] || ""}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-text-dim text-xs mb-1">{label}</div>
        <div className={`font-display text-2xl font-bold ${accentClasses[accent] || "text-text"}`}>
          {loading ? <span className="inline-block w-10 h-6 bg-ink-700 rounded animate-pulse" /> : value}
        </div>
        {sub && <div className="text-text-dim text-[11px] mt-0.5 mono-data">{sub}</div>}
      </div>
    </div>
  );
}

function RiskRow({ rank, node, onSelect }) {
  const score = Math.round(node.score ?? 0);
  const barWidth = Math.min(score, 100);
  return (
    <div
      onClick={() => onSelect(node.id)}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800/40 cursor-pointer transition-colors rounded-lg group"
    >
      <div className="w-5 text-center text-[11px] mono-data text-text-muted">{rank}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text truncate">{node.name || node.id}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 bg-ink-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${barWidth}%`,
                background: score >= 70 ? "#C1503D" : score >= 45 ? "#D9A441" : "#4FB6A6",
              }}
            />
          </div>
          <span className="text-[11px] mono-data text-amber shrink-0">{score}</span>
        </div>
      </div>
      <ArrowRight size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function DashboardView({ topScores, onSelect }) {
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.anomalies(), api.patternAlerts(), api.communities()])
      .then(([anomalies, patternAlerts, communities]) => {
        setAnalytics({ anomalies, communities });
        setAlerts(patternAlerts.slice(0, 5));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const highRisk = topScores.filter((n) => (n.score ?? 0) >= 70).length;
  const communityCount = analytics?.communities
    ? new Set(Object.values(analytics.communities.partition || {})).size
    : 0;
  const anomalyCount = analytics?.anomalies?.length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto bg-ink-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="font-display text-2xl font-semibold text-text">Intelligence Dashboard</h1>
          <p className="text-text-dim text-sm mt-1">
            Live overview of network analysis, risk indicators, and active alerts.
          </p>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Entities in Graph"
            value={topScores.length > 0 ? "~2,800" : "—"}
            sub="nodes across all clusters"
            accent="teal"
            icon={Users}
            loading={loading && topScores.length === 0}
          />
          <StatCard
            label="High-Risk Entities"
            value={loading ? null : highRisk}
            sub="score ≥ 70/100"
            accent="rust"
            icon={Shield}
            loading={loading}
          />
          <StatCard
            label="Anomalies Detected"
            value={loading ? null : anomalyCount}
            sub="activity spikes flagged"
            accent="amber"
            icon={AlertTriangle}
            loading={loading}
          />
          <StatCard
            label="Network Clusters"
            value={loading ? null : communityCount}
            sub="Louvain communities"
            accent="indigo"
            icon={Activity}
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Risk Leaderboard */}
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700/60">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-amber" />
                <span className="text-sm font-medium">Top Priority Entities</span>
              </div>
              <span className="section-label">Score /100</span>
            </div>
            <div className="py-2">
              {topScores.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-dim text-sm">Loading scores…</div>
              ) : (
                topScores.slice(0, 8).map((node, i) => (
                  <RiskRow key={node.id} rank={i + 1} node={node} onSelect={onSelect} />
                ))
              )}
            </div>
          </div>

          {/* Pattern Alerts */}
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700/60">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rust" />
                <span className="text-sm font-medium">Active Pattern Alerts</span>
              </div>
              <span className={`badge-rust`}>{alerts.length} flagged</span>
            </div>
            <div className="py-2 space-y-0">
              {loading ? (
                <div className="px-4 py-8 text-center text-text-dim text-sm">Loading alerts…</div>
              ) : alerts.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-dim text-sm">No alerts detected.</div>
              ) : (
                alerts.map((alert, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 hover:bg-ink-800/40 cursor-pointer transition-colors border-b border-ink-700/30 last:border-0"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span
                        className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                          alert.confidence === "Confirmed"
                            ? "bg-rust"
                            : alert.confidence === "Supported"
                            ? "bg-amber"
                            : "bg-text-dim"
                        }`}
                      />
                      <div>
                        <div className="text-sm text-text leading-tight">{alert.pattern}</div>
                        <div className="text-[11px] text-text-dim mt-0.5 leading-relaxed line-clamp-2">{alert.detail}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 ml-3.5">
                      <span className={`badge-${alert.confidence === "Supported" ? "amber" : alert.confidence === "Confirmed" ? "rust" : "dim"}`}>
                        {alert.confidence}
                      </span>
                      {alert.entities?.length > 0 && (
                        <span className="text-[10px] text-text-dim mono-data">{alert.entities.length} entities</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Ethics Notice */}
        <div className="border border-amber/15 bg-amber/5 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <Eye size={15} className="text-amber shrink-0 mt-0.5" />
          <p className="text-xs text-amber/80 leading-relaxed">
            <span className="font-semibold text-amber">Investigator Notice:</span> All priority scores are aids for human review — not conclusions of wrongdoing. Every finding is labeled{" "}
            <span className="mono-data">Confirmed / Supported / Potential / Uncertain</span> based on evidence quality. Use Confirm/Reject to log your assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
