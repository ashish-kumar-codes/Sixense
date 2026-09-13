import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader, Network, User, MapPin, Car, Building2 } from "lucide-react";

const ENTITY_ICONS = {
  Person: User,
  Location: MapPin,
  Vehicle: Car,
  Organization: Building2,
};

const ENTITY_COLORS = {
  Person: "text-teal",
  Location: "text-amber",
  Vehicle: "text-indigo",
  Organization: "text-rust",
};

export default function UploadView() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleSubmit() {
    const payload = text.trim() || (file ? await file.text() : "");
    if (!payload) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/reports/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: payload }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "text/plain") setFile(f);
  }

  const entities = result?.resolution?.new_nodes || [];
  const edges = result?.resolution?.new_edges || [];
  const matches = result?.resolution?.matches || [];

  return (
    <div className="flex-1 overflow-y-auto bg-ink-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <Upload size={22} className="text-amber" />
            Upload Intelligence Report
          </h1>
          <p className="text-text-dim text-sm mt-1">
            Paste or upload a narrative report. The NLP pipeline will extract entities and inject them into the investigation graph.
          </p>
        </div>

        {/* Input */}
        <div className="card p-6 mb-5 animate-slide-up">
          <div className="section-label mb-3">Narrative Text</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste intelligence narrative here…&#10;&#10;e.g. 'Informant reported that Rahul Sharma was seen at Sector 14 interacting with an unknown person near a black Honda sedan (MH-02 AB 1234). The meeting lasted approximately 20 minutes before both parties left in separate vehicles toward Zone 3...'"
            className="w-full bg-ink-800/50 border border-ink-700 rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-amber/50 outline-none resize-none leading-relaxed font-body"
          />

          {/* OR drag-drop */}
          <div className="mt-4 flex items-center gap-3 text-text-muted text-xs">
            <div className="flex-1 h-px bg-ink-700" />
            <span>or drop a .txt file</span>
            <div className="flex-1 h-px bg-ink-700" />
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`mt-4 border-2 border-dashed rounded-xl py-6 text-center transition-colors ${
              dragOver ? "border-amber/60 bg-amber/5" : "border-ink-600 hover:border-ink-500"
            }`}
          >
            <FileText size={24} className="text-text-muted mx-auto mb-2" />
            <div className="text-sm text-text-dim">
              {file ? (
                <span className="text-teal font-medium">{file.name}</span>
              ) : (
                "Drag & drop a .txt file, or click to browse"
              )}
            </div>
            <input
              type="file"
              accept=".txt"
              className="sr-only"
              onChange={(e) => setFile(e.target.files[0])}
              id="file-upload"
            />
            {!file && (
              <label
                htmlFor="file-upload"
                className="mt-2 inline-block text-xs text-amber/80 cursor-pointer hover:text-amber"
              >
                Browse files
              </label>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || (!text.trim() && !file)}
            className="w-full mt-5 flex items-center justify-center gap-2 bg-amber text-ink-950 rounded-lg py-2.5 text-sm font-semibold hover:bg-amber/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader size={15} className="animate-spin" />
                Extracting entities…
              </>
            ) : (
              <>
                <Network size={15} />
                Extract & Push to Graph
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="card p-4 border-rust/30 bg-rust/5 flex items-center gap-3 mb-5 animate-fade-in">
            <AlertCircle size={16} className="text-rust shrink-0" />
            <span className="text-sm text-rust">{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5 animate-slide-up">
            {/* Summary bar */}
            <div className="card p-4 flex items-center gap-4">
              <CheckCircle2 size={18} className="text-teal" />
              <div className="flex-1">
                <div className="text-sm font-medium text-text">Extraction complete</div>
                <div className="text-xs text-text-dim mt-0.5">Report processed and pushed to investigation graph</div>
              </div>
              <div className="flex gap-2">
                <span className="badge-teal">{entities.length} new entities</span>
                <span className="badge-amber">{edges.length} new links</span>
                {matches.length > 0 && <span className="badge-dim">{matches.length} matches found</span>}
              </div>
            </div>

            {/* New entities grid */}
            {entities.length > 0 && (
              <div>
                <div className="section-label mb-3">New Entities Added to Graph</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {entities.map((ent) => {
                    const Icon = ENTITY_ICONS[ent.label] || User;
                    const color = ENTITY_COLORS[ent.label] || "text-text-dim";
                    return (
                      <div key={ent.id} className="card p-4 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-ink-800 flex items-center justify-center ${color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm text-text truncate">{ent.name}</div>
                          <div className={`text-[11px] ${color}`}>{ent.label}</div>
                          <div className="text-[10px] mono-data text-text-muted truncate">{ent.id}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Relationships */}
            {edges.length > 0 && (
              <div>
                <div className="section-label mb-3">Extracted Relationships</div>
                <div className="space-y-2">
                  {edges.map((e) => (
                    <div key={e.id} className="card px-4 py-3 flex items-center gap-3">
                      <div className="text-xs mono-data text-text-dim shrink-0">{e.source}</div>
                      <div className="flex-1 text-center">
                        <span className="px-3 py-0.5 bg-ink-700/60 rounded-full text-[11px] text-amber mono-data">
                          {e.type}
                        </span>
                      </div>
                      <div className="text-xs mono-data text-text-dim shrink-0">{e.target}</div>
                      <span className="badge-dim ml-auto">{e.confidence}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution queue */}
            {matches.length > 0 && (
              <div className="card p-4 border-amber/20 bg-amber/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={14} className="text-amber" />
                  <span className="text-sm font-medium text-amber">Resolution Review Required</span>
                </div>
                <p className="text-xs text-text-dim mb-3">
                  {matches.length} extracted entit{matches.length > 1 ? "ies are" : "y is"} potentially linked to existing graph nodes.
                  Review in the <span className="text-amber font-medium">Resolution</span> module.
                </p>
                {matches.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-text-dim mb-1">
                    <span className="badge-amber">{Math.round(m.confidence)}%</span>
                    <span>"{m.extracted?.name}"</span>
                    <span className="text-text-muted">→</span>
                    <span className="text-teal">{m.matched_node?.name}</span>
                    <span className="badge-dim ml-auto">{m.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
