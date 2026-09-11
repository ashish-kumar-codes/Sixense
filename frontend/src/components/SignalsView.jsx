import { useEffect, useState } from "react";
import { TrendingUp, Phone, Landmark, AtSign, MapPin } from "lucide-react";
import api from "../api";
import ConfidenceBadge from "./ConfidenceBadge";

const TYPE_ICON = { Phone: Phone, Account: Landmark, SocialProfile: AtSign, Person: MapPin };

export default function SignalsView({ onSelect }) {
  const [anomalies, setAnomalies] = useState(null);
  const [nodeMeta, setNodeMeta] = useState({});

  useEffect(() => {
    api.anomalies().then(async (rows) => {
      setAnomalies(rows);
      const metas = await Promise.all(rows.map((r) => api.node(r.node_id).catch(() => null)));
      const m = {};
      rows.forEach((r, i) => { if (metas[i]) m[r.node_id] = metas[i].node; });
      setNodeMeta(m);
    });
  }, []);

  if (anomalies === null) return <div className="p-6 text-sm text-text-dim">Loading signals…</div>;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h2 className="font-display text-lg mb-1">Financial &amp; call activity signals</h2>
        <p className="text-xs text-text-dim mb-5 leading-relaxed">
          Entities whose recent activity (calls, transfers, posts, movement) is a statistical outlier vs.
          their own historical baseline. A spike alone is not evidence of wrongdoing — it is a prompt for
          an investigator to look closer at the underlying call detail records or bank statement.
        </p>
        {anomalies.length === 0 && <p className="text-sm text-text-dim">No anomalies detected in current data.</p>}
        <div className="space-y-2.5">
          {anomalies.map((a) => {
            const meta = nodeMeta[a.node_id];
            const Icon = TYPE_ICON[meta?.label] || TrendingUp;
            return (
              <button
                key={a.node_id}
                onClick={() => onSelect(a.node_id)}
                className="w-full text-left border border-ink-700 rounded-md p-3.5 bg-ink-900 hover:border-amber/40 transition-colors flex items-start gap-3"
              >
                <Icon size={16} className="text-rust mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{meta?.name || a.node_id}</span>
                    <ConfidenceBadge level={a.confidence} />
                  </div>
                  <div className="text-xs text-text-dim mono-data mt-0.5">{a.node_id} · {meta?.label || "entity"}</div>
                  <div className="text-xs text-text-dim mt-1.5">
                    {a.recent_activity_count} recent events, {a.spike_ratio}x baseline weekly rate
                    (z-score {a.z_score}, baseline {a.historical_weekly_avg}/wk)
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
