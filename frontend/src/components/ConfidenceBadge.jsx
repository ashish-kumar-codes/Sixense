const STYLES = {
  Confirmed: "bg-teal/15 text-teal border-teal/40",
  Supported: "bg-amber/15 text-amber border-amber/40",
  Potential: "bg-text-dim/15 text-text-dim border-text-dim/40",
  Uncertain: "bg-rust/10 text-rust/80 border-rust/30",
};

export default function ConfidenceBadge({ level, className = "" }) {
  const style = STYLES[level] || STYLES.Uncertain;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium mono-data ${style} ${className}`}
    >
      {level || "Uncertain"}
    </span>
  );
}
