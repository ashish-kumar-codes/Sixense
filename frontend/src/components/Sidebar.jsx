import {
  LayoutDashboard, Network, Search, FolderKanban, GitMerge,
  BarChart3, Bell, FileText, Upload, BrainCircuit, Map, Settings,
  Activity, Shield
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { id: "network",     label: "Network",      icon: Network },
  { id: "cases",       label: "Cases",        icon: FolderKanban },
  { id: "explorer",    label: "Explorer",     icon: Search },
  { id: "resolution",  label: "Resolution",   icon: GitMerge },
  { id: "analytics",   label: "Analytics",    icon: BarChart3 },
  { id: "alerts",      label: "Alerts",       icon: Bell },
  { id: "reports",     label: "Reports",      icon: FileText },
  { id: "upload",      label: "Upload Data",  icon: Upload },
  { id: "aiquery",     label: "AI Query",     icon: BrainCircuit },
  { id: "geomap",      label: "Geo Map",      icon: Map },
];

export default function Sidebar({ active, onChange, backend }) {
  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-full bg-ink-900/80 border-r border-ink-700/60 backdrop-blur-sm">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-ink-700/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber to-amber-dim flex items-center justify-center shadow-glow-amber">
            <Shield size={16} className="text-ink-950" />
          </div>
          <div>
            <div className="font-display text-base font-bold tracking-tight text-gradient-amber">Sixense</div>
            <div className="text-[10px] text-text-dim leading-none mt-0.5">Investigation Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left group ${
                  isActive
                    ? "nav-active text-amber font-medium"
                    : "text-text-dim hover:text-text hover:bg-ink-800/60"
                }`}
              >
                <Icon size={15} className={isActive ? "text-amber" : "text-text-dim group-hover:text-text transition-colors"} />
                <span>{label}</span>
                {id === "alerts" && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rust animate-pulse-slow" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-ink-700/40">
        <div className="flex items-center gap-2 text-[11px]">
          <Activity size={11} className={backend === "neo4j" ? "text-teal" : "text-amber"} />
          <span className="text-text-dim mono-data">{backend || "connecting…"}</span>
        </div>
        <div className="text-[10px] text-text-muted mt-1 leading-snug">Synthetic demo only</div>
      </div>
    </aside>
  );
}
