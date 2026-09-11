import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../api";

function Metric({ label, value }) {
  return (
    <div className="border border-ink-700 rounded-md p-4 bg-ink-900">
      <div className="text-[11px] uppercase tracking-wide text-text-dim mb-1">{label}</div>
      <div className="font-display text-3xl text-amber">{value}</div>
    </div>
  );
}

export default function EvaluationView() {
  const [evalData, setEvalData] = useState(null);
  const [sweep, setSweep] = useState(null);

  useEffect(() => {
    api.evaluation().then(setEvalData);
    api.evaluationSweep().then(setSweep);
  }, []);

  if (!evalData) return <div className="p-6 text-sm text-text-dim">Computing evaluation metrics…</div>;
  if (evalData.error) return <div className="p-6 text-sm text-rust">{evalData.error}</div>;

  const cm = evalData.confusion_matrix;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h2 className="font-display text-lg mb-1">Scoring methodology evaluation</h2>
        <p className="text-xs text-text-dim mb-5 leading-relaxed">
          Precision/recall/F1 of the Investigative Priority Score against a{" "}
          <span className="text-amber">synthetic</span> ground-truth label set generated alongside the demo
          data (entities placed in dense synthetic clusters or with many synthetic FIR touches). This
          validates the scoring methodology only — a real deployment needs labelled outcomes from actual
          case dispositions, not a synthetic proxy.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Metric label="Precision" value={evalData.precision} />
          <Metric label="Recall" value={evalData.recall} />
          <Metric label="F1 score" value={evalData.f1_score} />
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8 text-center">
          <div className="border border-teal/30 rounded-md p-3 bg-teal/5">
            <div className="text-lg font-display text-teal">{cm.true_positive}</div>
            <div className="text-[10px] text-text-dim">True positive</div>
          </div>
          <div className="border border-rust/30 rounded-md p-3 bg-rust/5">
            <div className="text-lg font-display text-rust">{cm.false_positive}</div>
            <div className="text-[10px] text-text-dim">False positive</div>
          </div>
          <div className="border border-rust/30 rounded-md p-3 bg-rust/5">
            <div className="text-lg font-display text-rust">{cm.false_negative}</div>
            <div className="text-[10px] text-text-dim">False negative</div>
          </div>
          <div className="border border-ink-700 rounded-md p-3">
            <div className="text-lg font-display text-text-dim">{cm.true_negative}</div>
            <div className="text-[10px] text-text-dim">True negative</div>
          </div>
        </div>

        {sweep && sweep.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-dim mb-2">
              Precision / recall / F1 vs. top-K cutoff
            </div>
            <div className="h-64 border border-ink-700 rounded-md bg-ink-900 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sweep}>
                  <CartesianGrid stroke="#2B3340" strokeDasharray="3 3" />
                  <XAxis dataKey="top_k" tick={{ fill: "#7C8697", fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: "#7C8697", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1F2630", border: "1px solid #2B3340", borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="precision" stroke="#4FB6A6" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="recall" stroke="#D9A441" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="f1_score" stroke="#C1503D" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
