import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle2, XCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import api from "../api";
import ConfidenceBadge from "./ConfidenceBadge";

const COMPONENT_LABELS = {
  betweenness: "Betweenness",
  case_associations: "Case ties",
  connectivity: "Connectivity",
  anomaly: "Anomaly",
  community: "Cluster size",
};

export default function Inspector({ nodeId, onNavigate }) {
  const [detail, setDetail] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [verifyBusy, setVerifyBusy] = useState(false);

  useEffect(() => {
    setDetail(null);
    setSummary(null);
    if (!nodeId) return;
    api.node(nodeId).then(setDetail);
  }, [nodeId]);

  function loadSummary() {
    setSummaryLoading(true);
    api.nodeSummary(nodeId).then((d) => {
      setSummary(d.summary);
      setSummaryLoading(false);
    });
  }

  async function submitVerification(status) {
    setVerifyBusy(true);
    await api.verify({
      node_id: nodeId,
      finding_ref: "priority_score",
      status,
      investigator: "demo-investigator",
    });
    const d = await api.node(nodeId);
    setDetail(d);
    setVerifyBusy(false);
  }

  if (!nodeId) {
    return (
      <div className="w-96 shrink-0 border-l border-ink-700 bg-ink-900 p-6 text-sm text-text-dim">
        Select an entity from the graph or search results to inspect its priority score and evidence.
      </div>
    );
  }
  if (!detail) {
    return <div className="w-96 shrink-0 border-l border-ink-700 bg-ink-900 p-6 text-sm text-text-dim">Loading…</div>;
  }

  const { node, priority_score: score, evidence, verifications, anomalies } = detail;
  const name = node.name || node.handle || node.fir_number || node.id;
  const chartData = score
    ? Object.entries(score.components).map(([k, v]) => ({ key: COMPONENT_LABELS[k] || k, value: v }))
    : [];

  return (
    <div className="w-96 shrink-0 border-l border-ink-700 bg-ink-900 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-ink-700">
        <div className="text-[11px] uppercase tracking-wide text-text-dim mb-1">{node.label}</div>
        <div className="font-display text-lg leading-tight">{name}</div>
        <div className="text-xs mono-data text-text-dim mt-0.5">{node.id}</div>
      </div>

      {score && (
        <div className="p-4 border-b border-ink-700">
          <div className="flex items-end justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wide text-text-dim">Investigative Priority Score</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-4xl text-amber">{score.score}</span>
            <span className="text-text-dim text-sm">/ 100</span>
          </div>
          <div className="h-32 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="key" type="category" width={78} tick={{ fill: "#7C8697", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1F2630", border: "1px solid #2B3340", borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: "#C9D1D9" }}
                />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="#D9A441" fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-text-dim mt-2 leading-relaxed">{score.why_flagged}</p>
        </div>
      )}

      {anomalies && anomalies.length > 0 && (
        <div className="p-4 border-b border-ink-700 bg-rust/5">
          <div className="text-[11px] uppercase tracking-wide text-rust mb-1.5">Potential anomaly</div>
          {anomalies.map((a, i) => (
            <p key={i} className="text-xs text-text-dim leading-relaxed mb-1">
              Recent activity {a.recent_activity_count}x, {a.spike_ratio}x baseline rate (z={a.z_score}).
            </p>
          ))}
        </div>
      )}

      <div className="p-4 border-b border-ink-700">
        <button
          onClick={loadSummary}
          disabled={summaryLoading}
          className="flex items-center gap-1.5 text-xs font-medium text-teal hover:text-teal/80 disabled:opacity-50"
        >
          <Sparkles size={13} /> {summaryLoading ? "Generating…" : "Generate AI investigation summary"}
        </button>
        {summary && <p className="text-xs text-text leading-relaxed mt-3 whitespace-pre-line">{summary}</p>}
      </div>

      <div className="p-4 border-b border-ink-700">
        <div className="text-[11px] uppercase tracking-wide text-text-dim mb-2">Human review</div>
        <div className="flex gap-2">
          <button
            onClick={() => submitVerification("Confirmed")}
            disabled={verifyBusy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-teal/10 border border-teal/40 text-teal text-xs font-medium hover:bg-teal/20 disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> Confirm
          </button>
          <button
            onClick={() => submitVerification("Rejected")}
            disabled={verifyBusy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-rust/10 border border-rust/40 text-rust text-xs font-medium hover:bg-rust/20 disabled:opacity-50"
          >
            <XCircle size={14} /> Reject
          </button>
        </div>
        {verifications && verifications.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {verifications.map((v, i) => (
              <div key={i} className="text-[11px] text-text-dim flex items-center justify-between">
                <span>{v.status} by {v.investigator}</span>
                <span className="mono-data">{new Date(v.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <button
          onClick={() => setEvidenceOpen((o) => !o)}
          className="flex items-center justify-between w-full text-[11px] uppercase tracking-wide text-text-dim mb-2"
        >
          <span>Evidence &amp; provenance ({evidence.length})</span>
          {evidenceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {evidenceOpen && (
          <div className="space-y-2">
            {evidence.slice(0, 40).map((e) => (
              <div key={e.edge_id} className="border border-ink-700 rounded-md p-2.5 bg-paper/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{e.type}</span>
                  <ConfidenceBadge level={e.confidence} />
                </div>
                <button
                  onClick={() => onNavigate(e.counterpart)}
                  className="text-[11px] mono-data text-text-dim hover:text-amber transition-colors"
                >
                  → {e.counterpart}
                </button>
                <div className="flex items-center justify-between mt-1 text-[10px] text-text-dim">
                  <span>{e.source}</span>
                  {e.timestamp && <span className="mono-data">{new Date(e.timestamp).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
