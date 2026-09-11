import { AlertTriangle, GitBranch, Radio } from "lucide-react";

export default function TopBar({ backend, showAnomalies, showPredicted, onToggleAnomalies, onTogglePredicted }) {
  return (
    <div className="border-b border-ink-700 bg-ink-900">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl tracking-tight text-text">Sixense</h1>
          <span className="text-xs text-text-dim font-body">investigative network analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAnomalies}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              showAnomalies
                ? "bg-rust/15 border-rust/40 text-rust"
                : "bg-transparent border-ink-700 text-text-dim hover:border-text-dim"
            }`}
          >
            <AlertTriangle size={13} /> Anomaly alerts
          </button>
          <button
            onClick={onTogglePredicted}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              showPredicted
                ? "bg-amber/15 border-amber/40 text-amber"
                : "bg-transparent border-ink-700 text-text-dim hover:border-text-dim"
            }`}
          >
            <GitBranch size={13} /> Predicted links
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-ink-700 text-xs text-text-dim">
            <Radio size={12} className={backend === "neo4j" ? "text-teal" : "text-amber"} />
            <span className="mono-data">{backend || "…"}</span>
          </div>
        </div>
      </div>
      <div className="bg-amber/10 border-t border-amber/20 px-5 py-1.5 text-[11px] text-amber/90 font-medium">
        Synthetic demo data — not for operational use. Sixense never declares guilt; it surfaces a priority
        score and patterns for human investigator review, verification, and confirm/reject action.
      </div>
    </div>
  );
}
