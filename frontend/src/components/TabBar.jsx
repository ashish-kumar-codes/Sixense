import { Share2, TrendingUp, ShieldAlert, Route, BarChart3 } from "lucide-react";

const TABS = [
  { id: "network", label: "Network", icon: Share2 },
  { id: "signals", label: "Financial & Call Signals", icon: TrendingUp },
  { id: "alerts", label: "Alerts", icon: ShieldAlert },
  { id: "path", label: "Path Finder", icon: Route },
  { id: "evaluation", label: "Evaluation", icon: BarChart3 },
];

export default function TabBar({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-ink-700 bg-ink-900 px-3">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              isActive
                ? "border-amber text-amber"
                : "border-transparent text-text-dim hover:text-text"
            }`}
          >
            <Icon size={13} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}
