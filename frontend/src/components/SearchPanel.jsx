import { useEffect, useState } from "react";
import { Search, User, FileText, Phone, Landmark, MapPin, AtSign } from "lucide-react";
import api from "../api";

const ICONS = {
  Person: User,
  FIR: FileText,
  Phone: Phone,
  Account: Landmark,
  Location: MapPin,
  SocialProfile: AtSign,
};

export default function SearchPanel({ selectedId, onSelect, topScores }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api.search(q).then((d) => setResults(d.results));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const listItems = results !== null
    ? results.map((r) => ({ id: r.id, label: r.label, name: r.name }))
    : (topScores || []).map((s) => ({ id: s.id, label: "Person", name: s.name, score: s.score }));

  return (
    <div className="w-72 shrink-0 border-r border-ink-700 bg-ink-900 flex flex-col h-full">
      <div className="p-3 border-b border-ink-700">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-text-dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search persons, FIRs, phones, accounts…"
            className="w-full bg-ink-800 border border-ink-700 rounded-md pl-8 pr-3 py-2 text-sm
                       placeholder:text-text-dim focus:border-amber/50 outline-none"
          />
        </div>
      </div>
      <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wide text-text-dim font-medium">
        {results !== null ? `${results.length} results` : "Top priority entities"}
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {listItems.length === 0 && (
          <div className="text-xs text-text-dim px-2 py-4">No matches.</div>
        )}
        {listItems.map((item) => {
          const Icon = ICONS[item.label] || User;
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors ${
                active ? "bg-amber/10 border border-amber/30" : "border border-transparent hover:bg-ink-800"
              }`}
            >
              <Icon size={14} className="text-text-dim shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{item.name || item.id}</div>
                <div className="text-[11px] text-text-dim mono-data truncate">{item.id}</div>
              </div>
              {item.score !== undefined && (
                <span className="text-xs font-display text-amber shrink-0">{Math.round(item.score)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
