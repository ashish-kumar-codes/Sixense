import { useState } from "react";
import { Route, ArrowRight } from "lucide-react";
import api from "../api";
import ConfidenceBadge from "./ConfidenceBadge";

export default function PathFinderView({ onSelect }) {
  const [fromQ, setFromQ] = useState("");
  const [toQ, setToQ] = useState("");
  const [fromOpts, setFromOpts] = useState([]);
  const [toOpts, setToOpts] = useState([]);
  const [fromId, setFromId] = useState(null);
  const [toId, setToId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search(q, setOpts) {
    if (!q.trim()) return setOpts([]);
    const d = await api.search(q);
    setOpts(d.results);
  }

  async function findPath() {
    if (!fromId || !toId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.path(fromId, toId);
      setResult(r);
    } catch (e) {
      setError("No connecting path found between these two entities in the current network.");
    }
    setLoading(false);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl">
        <h2 className="font-display text-lg mb-1">Shortest route between entities</h2>
        <p className="text-xs text-text-dim mb-5 leading-relaxed">
          Finds the quickest connecting chain between two suspects/entities through calls, transfers,
          shared FIRs, associations, or locations — useful for establishing how two people might be linked.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-text-dim">From</label>
            <input
              value={fromQ}
              onChange={(e) => { setFromQ(e.target.value); search(e.target.value, setFromOpts); setFromId(null); }}
              placeholder="Search a person or entity…"
              className="w-full mt-1 bg-ink-800 border border-ink-700 rounded-md px-3 py-2 text-sm outline-none focus:border-amber/50"
            />
            {fromOpts.length > 0 && !fromId && (
              <div className="mt-1 border border-ink-700 rounded-md bg-ink-900 max-h-40 overflow-y-auto">
                {fromOpts.map((o) => (
                  <button key={o.id} onClick={() => { setFromId(o.id); setFromQ(o.name); setFromOpts([]); }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-ink-800">
                    {o.name} <span className="text-text-dim mono-data">({o.id})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-text-dim">To</label>
            <input
              value={toQ}
              onChange={(e) => { setToQ(e.target.value); search(e.target.value, setToOpts); setToId(null); }}
              placeholder="Search a person or entity…"
              className="w-full mt-1 bg-ink-800 border border-ink-700 rounded-md px-3 py-2 text-sm outline-none focus:border-amber/50"
            />
            {toOpts.length > 0 && !toId && (
              <div className="mt-1 border border-ink-700 rounded-md bg-ink-900 max-h-40 overflow-y-auto">
                {toOpts.map((o) => (
                  <button key={o.id} onClick={() => { setToId(o.id); setToQ(o.name); setToOpts([]); }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-ink-800">
                    {o.name} <span className="text-text-dim mono-data">({o.id})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={findPath}
          disabled={!fromId || !toId || loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber/15 border border-amber/40 text-amber text-sm font-medium hover:bg-amber/25 disabled:opacity-40 mb-6"
        >
          <Route size={14} /> {loading ? "Searching…" : "Find shortest route"}
        </button>

        {error && <p className="text-sm text-rust">{error}</p>}

        {result && (
          <div>
            <p className="text-xs text-text-dim mb-3">{result.length} hop(s) connecting the two entities.</p>
            <div className="flex flex-wrap items-center gap-2">
              {result.nodes.map((n, i) => (
                <div key={n.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onSelect(n.id)}
                    className="border border-ink-700 rounded-md px-3 py-2 bg-ink-900 hover:border-amber/40 text-left"
                  >
                    <div className="text-xs font-medium">{n.name || n.id}</div>
                    <div className="text-[10px] text-text-dim mono-data">{n.label}</div>
                  </button>
                  {i < result.edges.length && (
                    <div className="flex flex-col items-center">
                      <ArrowRight size={14} className="text-text-dim" />
                      <span className="text-[9px] text-text-dim">{result.edges[i]?.type}</span>
                      {result.edges[i]?.confidence && <ConfidenceBadge level={result.edges[i].confidence} className="mt-0.5" />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
