import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import api from "../api";
import ConfidenceBadge from "./ConfidenceBadge";

export default function AlertsView({ onSelect }) {
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    api.patternAlerts().then(setAlerts);
  }, []);

  if (alerts === null) return <div className="p-6 text-sm text-text-dim">Scanning for suspicious patterns…</div>;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h2 className="font-display text-lg mb-1">Suspicious pattern alerts</h2>
        <p className="text-xs text-text-dim mb-5 leading-relaxed">
          Rule-based combinations of weak signals (structural position, financial cycles, flagged language,
          shared case touchpoints). Every alert is Potential confidence by construction — these are leads
          for an investigator to verify, not conclusions.
        </p>
        {alerts.length === 0 && <p className="text-sm text-text-dim">No pattern alerts on current data.</p>}
        <div className="space-y-2.5">
          {alerts.map((a, i) => (
            <div key={i} className="border border-ink-700 rounded-md p-3.5 bg-ink-900">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={15} className="text-amber shrink-0" />
                  <span className="text-sm font-medium">{a.pattern}</span>
                </div>
                <ConfidenceBadge level={a.confidence} />
              </div>
              <p className="text-xs text-text-dim leading-relaxed mb-2">{a.detail}</p>
              <div className="flex flex-wrap gap-1.5">
                {a.entities.slice(0, 8).map((eid) => (
                  <button
                    key={eid}
                    onClick={() => onSelect(eid)}
                    className="text-[11px] mono-data px-2 py-0.5 rounded border border-ink-700 text-text-dim hover:border-amber/40 hover:text-amber transition-colors"
                  >
                    {eid}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
