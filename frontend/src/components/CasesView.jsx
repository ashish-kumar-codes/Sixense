import { useState } from "react";
import {
  FolderOpen, Plus, ChevronRight, Clock, Users, AlertCircle,
  CheckCircle2, XCircle, MoreHorizontal, Tag, Activity
} from "lucide-react";

const DEMO_CASES = [
  {
    id: "CASE-001",
    title: "Operation Midnight — Financial Network",
    description: "Investigation into circular money-laundering patterns involving 7 shell corporations and 3 network clusters.",
    status: "Under Investigation",
    priority: "High",
    entityCount: 34,
    incidentCount: 8,
    updatedAt: "2026-09-11",
    categories: ["Financial Fraud", "Money Laundering"],
  },
  {
    id: "CASE-002",
    title: "Cyber Extortion Ring — Northern Cluster",
    description: "Multiple complainants linked to a single organized group using encrypted messaging for coordination.",
    status: "Open",
    priority: "Critical",
    entityCount: 12,
    incidentCount: 3,
    updatedAt: "2026-09-10",
    categories: ["Cyber Fraud", "Extortion"],
  },
  {
    id: "CASE-003",
    title: "Cross-border Narcotics Supply Chain",
    description: "Transit route reconstruction from vehicle and phone movement data across 4 locations.",
    status: "High Priority",
    priority: "High",
    entityCount: 19,
    incidentCount: 5,
    updatedAt: "2026-09-08",
    categories: ["Narcotics", "Smuggling"],
  },
  {
    id: "CASE-004",
    title: "Social Media Recruitment Network",
    description: "Flagged social profiles coordinating through coded language. Linked to 2 FIRs.",
    status: "Cold",
    priority: "Medium",
    entityCount: 9,
    incidentCount: 2,
    updatedAt: "2026-08-30",
    categories: ["Human Trafficking", "Recruitment"],
  },
];

const STATUS_STYLE = {
  "Open": "badge-teal",
  "Under Investigation": "badge-amber",
  "High Priority": "badge-rust",
  "Cold": "badge-dim",
  "Closed": "badge-dim",
};

const PRIORITY_DOT = {
  "Critical": "bg-rust animate-pulse",
  "High": "bg-amber",
  "Medium": "bg-indigo",
  "Low": "bg-text-dim",
};

function CreateCaseModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "High", status: "Open" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg card p-6 animate-slide-up">
        <h2 className="font-display text-lg font-semibold mb-5">New Investigation Case</h2>
        <div className="space-y-4">
          <div>
            <label className="section-label block mb-1.5">Case Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Operation Phoenix — Wire Fraud"
              className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm focus:border-amber/50 outline-none placeholder:text-text-muted"
            />
          </div>
          <div>
            <label className="section-label block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Brief summary of the investigation scope…"
              className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm focus:border-amber/50 outline-none placeholder:text-text-muted resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm focus:border-amber/50 outline-none"
              >
                {["Critical", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm focus:border-amber/50 outline-none"
              >
                {["Open", "Under Investigation", "High Priority", "Closed"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onCreate({ ...form, id: `CASE-${Date.now()}`, entityCount: 0, incidentCount: 0, updatedAt: new Date().toISOString().slice(0, 10), categories: [] })}
            className="flex-1 bg-amber text-ink-950 rounded-lg py-2 text-sm font-semibold hover:bg-amber/90 transition-colors"
          >
            Create Case
          </button>
          <button onClick={onClose} className="flex-1 border border-ink-700 rounded-lg py-2 text-sm text-text-dim hover:bg-ink-800 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CaseDetail({ c, onClose }) {
  const [tab, setTab] = useState("overview");
  return (
    <div className="absolute inset-0 z-40 bg-ink-950/95 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={onClose} className="flex items-center gap-2 text-text-dim hover:text-text text-sm mb-6 transition-colors">
          ← Back to Cases
        </button>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-text-muted text-xs mono-data mb-1">{c.id}</div>
            <h1 className="font-display text-2xl font-semibold text-text">{c.title}</h1>
            <p className="text-text-dim text-sm mt-2 leading-relaxed max-w-2xl">{c.description}</p>
          </div>
          <span className={`${STATUS_STYLE[c.status] || "badge-dim"} shrink-0`}>{c.status}</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Entities", value: c.entityCount, icon: Users, color: "text-teal" },
            { label: "Incidents", value: c.incidentCount, icon: AlertCircle, color: "text-amber" },
            { label: "Last Updated", value: c.updatedAt, icon: Clock, color: "text-text-dim" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <Icon size={16} className={color} />
              <div>
                <div className="text-text-muted text-[10px] uppercase tracking-wide">{label}</div>
                <div className="text-text font-medium text-sm mono-data">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-ink-700 flex gap-0 mb-6">
          {["overview", "entities", "timeline"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? "border-amber text-amber font-medium" : "border-transparent text-text-dim hover:text-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-medium text-sm mb-3 text-text-dim">Case Categories</h3>
              <div className="flex flex-wrap gap-2">
                {c.categories.length > 0
                  ? c.categories.map((cat) => (
                      <span key={cat} className="badge-amber flex items-center gap-1.5">
                        <Tag size={10} />
                        {cat}
                      </span>
                    ))
                  : <span className="text-text-muted text-sm">No categories assigned</span>}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-medium text-sm mb-2 text-text-dim">Status History</h3>
              <div className="flex items-center gap-3 text-sm">
                <Activity size={13} className="text-teal" />
                <span className="text-text">Current: <span className={`${STATUS_STYLE[c.status]} ml-1`}>{c.status}</span></span>
              </div>
            </div>
          </div>
        )}

        {tab === "entities" && (
          <div className="card p-6 text-center text-text-dim text-sm">
            Entity timeline view — connect this case to graph nodes via the Network tab.
          </div>
        )}

        {tab === "timeline" && (
          <div className="card p-6 text-center text-text-dim text-sm">
            Timeline view — requires incident date stamps linked to entities.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CasesView() {
  const [cases, setCases] = useState(DEMO_CASES);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? cases : cases.filter((c) => c.status === filter);

  function handleCreate(c) {
    setCases((prev) => [c, ...prev]);
    setShowCreate(false);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-ink-950 p-6 relative">
      {selectedCase && (
        <CaseDetail c={selectedCase} onClose={() => setSelectedCase(null)} />
      )}
      {showCreate && (
        <CreateCaseModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="font-display text-2xl font-semibold">Cases</h1>
            <p className="text-text-dim text-sm mt-1">Manage investigation cases and track their progress.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-amber text-ink-950 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-amber/90 transition-colors"
          >
            <Plus size={15} />
            New Case
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5 border-b border-ink-700/60">
          {["all", "Open", "Under Investigation", "High Priority", "Closed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm capitalize -mb-px border-b-2 transition-colors ${
                filter === f ? "border-amber text-amber font-medium" : "border-transparent text-text-dim hover:text-text"
              }`}
            >
              {f === "all" ? "All Cases" : f}
            </button>
          ))}
        </div>

        {/* Case list */}
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className="card p-5 cursor-pointer group animate-slide-up"
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-ink-800 flex items-center justify-center shrink-0">
                  <FolderOpen size={16} className="text-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-text-muted text-[11px] mono-data">{c.id}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[c.priority] || "bg-text-dim"}`} />
                        <span className="text-text-muted text-[11px]">{c.priority} priority</span>
                      </div>
                      <h3 className="font-medium text-text text-sm leading-snug">{c.title}</h3>
                    </div>
                    <span className={`${STATUS_STYLE[c.status] || "badge-dim"} shrink-0`}>{c.status}</span>
                  </div>
                  <p className="text-text-dim text-xs mt-1.5 leading-relaxed line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-text-dim">
                      <Users size={11} />
                      {c.entityCount} entities
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-text-dim">
                      <AlertCircle size={11} />
                      {c.incidentCount} incidents
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-text-dim">
                      <Clock size={11} />
                      {c.updatedAt}
                    </div>
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {c.categories.slice(0, 2).map((cat) => (
                        <span key={cat} className="badge-dim">{cat}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <ChevronRight size={15} className="text-text-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
