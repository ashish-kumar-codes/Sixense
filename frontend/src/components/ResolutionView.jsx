import { useState } from "react";
import { GitMerge, CheckCircle2, XCircle, Eye, User, Phone, MapPin, FileText } from "lucide-react";

// Demo resolution candidates generated from our NLP pipeline
const DEMO_CANDIDATES = [
  {
    id: "res-001",
    existing: {
      id: "P-0042",
      label: "Person",
      name: "Rahul Sharma",
      occupation: "Trader",
      age: 38,
      phone: "+91-9823100293",
      firs: ["FIR-003", "FIR-011"],
      location: "Mumbai Sector 14",
    },
    candidate: {
      id: "ext-abc123",
      label: "Person",
      name: "R. Sharma",
      source: "NLP Extraction",
      extractedFrom: "Intelligence Report — 2026-09-11",
    },
    confidence: 87,
    factors: [
      { label: "Name similarity", strength: "high", note: "R. Sharma → Rahul Sharma (initial match)" },
      { label: "Shared location", strength: "medium", note: "Both mentioned near Sector 14" },
      { label: "Co-occurrence in same narrative", strength: "high", note: "Both mentioned in 2 reports" },
    ],
  },
  {
    id: "res-002",
    existing: {
      id: "P-0117",
      label: "Person",
      name: "Deepak Verma",
      occupation: "Transport Operator",
      age: 45,
      phone: "+91-9012845678",
      firs: ["FIR-007"],
      location: "Delhi Zone 3",
    },
    candidate: {
      id: "ext-def456",
      label: "Person",
      name: "D. Verma",
      source: "NLP Extraction",
      extractedFrom: "Field Report — 2026-09-09",
    },
    confidence: 72,
    factors: [
      { label: "Name similarity", strength: "medium", note: "D. Verma → Deepak Verma (initial match)" },
      { label: "Shared phone area", strength: "low", note: "Same carrier region (Delhi)" },
    ],
  },
  {
    id: "res-003",
    existing: {
      id: "ORG-0005",
      label: "Organization",
      name: "Nova Cooperative Bank",
      org_type: "Bank",
    },
    candidate: {
      id: "ext-ghi789",
      label: "Organization",
      name: "Nova Bank",
      source: "NLP Extraction",
      extractedFrom: "Transaction Narrative — 2026-09-07",
    },
    confidence: 93,
    factors: [
      { label: "Name similarity", strength: "high", note: "Substring match: 'Nova' + 'Bank'" },
      { label: "Entity type match", strength: "high", note: "Both classified as Organization/Bank" },
    ],
  },
];

const STRENGTH_COLOR = {
  high: "text-teal",
  medium: "text-amber",
  low: "text-text-dim",
};

function ConfidenceMeter({ score }) {
  const color = score >= 85 ? "#4FB6A6" : score >= 65 ? "#D9A441" : "#C1503D";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-ink-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="font-display text-xl font-bold mono-data" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function ResolutionView() {
  const [candidates, setCandidates] = useState(DEMO_CANDIDATES);
  const [resolved, setResolved] = useState([]);
  const [expanded, setExpanded] = useState(candidates[0]?.id ?? null);

  function resolve(id, decision) {
    setResolved((r) => [...r, { id, decision }]);
    setCandidates((c) => c.filter((x) => x.id !== id));
    setExpanded(candidates.find((c) => c.id !== id)?.id ?? null);
  }

  const pending = candidates;
  const done = resolved;

  return (
    <div className="flex-1 overflow-y-auto bg-ink-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
              <GitMerge size={22} className="text-amber" />
              Entity Resolution
            </h1>
            <p className="text-text-dim text-sm mt-1">
              Review potential duplicate entities extracted by NLP. Confirm or reject each match.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="badge-amber">{pending.length} pending</span>
            <span className="badge-teal">{done.filter((d) => d.decision === "confirm").length} merged</span>
            <span className="badge-rust">{done.filter((d) => d.decision === "reject").length} rejected</span>
          </div>
        </div>

        {pending.length === 0 && (
          <div className="card p-12 text-center animate-fade-in">
            <CheckCircle2 size={40} className="text-teal mx-auto mb-4" />
            <div className="font-display text-xl font-semibold mb-2">All resolved</div>
            <div className="text-text-dim text-sm">No pending entity resolution candidates.</div>
            <div className="mt-4 flex justify-center gap-3">
              <span className="badge-teal">{done.filter((d) => d.decision === "confirm").length} confirmed</span>
              <span className="badge-rust">{done.filter((d) => d.decision === "reject").length} rejected</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {pending.map((item) => {
            const isOpen = expanded === item.id;
            return (
              <div
                key={item.id}
                className={`card overflow-hidden animate-slide-up transition-all ${isOpen ? "border-amber/30" : ""}`}
              >
                {/* Summary header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ink-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center">
                      <User size={14} className="text-amber" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text">{item.existing.name}</div>
                      <div className="text-[11px] text-text-dim mt-0.5">
                        vs. <span className="text-amber">{item.candidate.name}</span>
                        <span className="ml-2 text-text-muted">· {item.candidate.extractedFrom}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Confidence</div>
                      <div
                        className="font-display text-lg font-bold mono-data"
                        style={{ color: item.confidence >= 85 ? "#4FB6A6" : item.confidence >= 65 ? "#D9A441" : "#C1503D" }}
                      >
                        {item.confidence}%
                      </div>
                    </div>
                    <span className={isOpen ? "text-amber" : "text-text-dim"}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-ink-700/60 px-5 py-5 animate-fade-in">
                    {/* Confidence meter */}
                    <div className="mb-5">
                      <div className="text-[11px] text-text-dim mb-2 uppercase tracking-wide">Match Confidence</div>
                      <ConfidenceMeter score={item.confidence} />
                    </div>

                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      {/* Existing */}
                      <div className="bg-ink-800/50 rounded-xl p-4 border border-ink-700/40">
                        <div className="section-label mb-3">Existing Entity</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-text-dim shrink-0" />
                            <span className="text-sm font-medium text-text">{item.existing.name}</span>
                            <span className="badge-dim ml-auto">{item.existing.label}</span>
                          </div>
                          {item.existing.id && (
                            <div className="text-[11px] mono-data text-text-dim">{item.existing.id}</div>
                          )}
                          {item.existing.occupation && (
                            <div className="text-xs text-text-dim">{item.existing.occupation}, age {item.existing.age}</div>
                          )}
                          {item.existing.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-text-dim">
                              <Phone size={11} />
                              {item.existing.phone}
                            </div>
                          )}
                          {item.existing.location && (
                            <div className="flex items-center gap-1.5 text-xs text-text-dim">
                              <MapPin size={11} />
                              {item.existing.location}
                            </div>
                          )}
                          {item.existing.firs?.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-text-dim">
                              <FileText size={11} />
                              {item.existing.firs.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Candidate */}
                      <div className="bg-amber/5 rounded-xl p-4 border border-amber/15">
                        <div className="section-label mb-3 text-amber/70">Extracted Candidate</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-amber shrink-0" />
                            <span className="text-sm font-medium text-amber">{item.candidate.name}</span>
                            <span className="badge-amber ml-auto">{item.candidate.label}</span>
                          </div>
                          <div className="text-[11px] mono-data text-amber/60">{item.candidate.id}</div>
                          <div className="text-xs text-amber/60">Source: {item.candidate.source}</div>
                          <div className="text-xs text-amber/60">{item.candidate.extractedFrom}</div>
                        </div>
                      </div>
                    </div>

                    {/* Evidence factors */}
                    <div className="mb-5">
                      <div className="section-label mb-3">Supporting Evidence</div>
                      <div className="space-y-2">
                        {item.factors.map((f, i) => (
                          <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-ink-800/30 rounded-lg">
                            <Eye size={12} className={`${STRENGTH_COLOR[f.strength]} mt-0.5 shrink-0`} />
                            <div>
                              <div className={`text-xs font-medium ${STRENGTH_COLOR[f.strength]}`}>
                                {f.label}
                                <span className="text-text-muted font-normal ml-2">({f.strength} signal)</span>
                              </div>
                              <div className="text-[11px] text-text-dim mt-0.5">{f.note}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => resolve(item.id, "confirm")}
                        className="flex-1 flex items-center justify-center gap-2 bg-teal/15 border border-teal/40 text-teal rounded-lg py-2.5 text-sm font-medium hover:bg-teal/25 transition-colors"
                      >
                        <CheckCircle2 size={15} />
                        Confirm Match — Merge Entities
                      </button>
                      <button
                        onClick={() => resolve(item.id, "reject")}
                        className="flex-1 flex items-center justify-center gap-2 bg-rust/10 border border-rust/30 text-rust rounded-lg py-2.5 text-sm font-medium hover:bg-rust/20 transition-colors"
                      >
                        <XCircle size={15} />
                        Reject — Keep Separate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
