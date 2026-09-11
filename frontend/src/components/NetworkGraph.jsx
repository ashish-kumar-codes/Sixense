import { useEffect, useRef, useState } from "react";
import { Network as VisNetwork } from "vis-network";
import { DataSet } from "vis-data";
import api from "../api";

const PALETTE = ["#4FB6A6", "#D9A441", "#7C93C9", "#C1503D", "#8FBF7F",
  "#B589C9", "#D97B65", "#5FA8D3", "#C9A45F", "#9CA3AF"];

const TYPE_SHAPE = {
  Person: "dot",
  FIR: "diamond",
  Phone: "triangle",
  Account: "square",
  Location: "star",
  SocialProfile: "hexagon",
  SocialPost: "dot",
};

function communityColor(commId) {
  if (commId === undefined || commId === null) return "#5B6472";
  return PALETTE[commId % PALETTE.length];
}

export default function NetworkGraph({ selectedId, onSelect, showAnomalies, showPredicted }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesDsRef = useRef(new DataSet());
  const edgesDsRef = useRef(new DataSet());
  const [depth, setDepth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState({});
  const [scores, setScores] = useState({});
  const [anomalyIds, setAnomalyIds] = useState(new Set());
  const [predicted, setPredicted] = useState([]);

  // one-time: init network instance
  useEffect(() => {
    if (!containerRef.current) return;
    const options = {
      autoResize: true,
      interaction: { hover: true, tooltipDelay: 120 },
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: { gravitationalConstant: -60, springLength: 90, springConstant: 0.06 },
        stabilization: { iterations: 120 },
      },
      nodes: {
        borderWidth: 2,
        font: { color: "#C9D1D9", size: 12, face: "IBM Plex Sans" },
      },
      edges: {
        color: { color: "#2B3340", highlight: "#D9A441" },
        smooth: { type: "continuous" },
        width: 1,
      },
    };
    const net = new VisNetwork(
      containerRef.current,
      { nodes: nodesDsRef.current, edges: edgesDsRef.current },
      options,
    );
    net.on("click", (params) => {
      if (params.nodes.length) onSelect(params.nodes[0]);
    });
    networkRef.current = net;
    return () => net.destroy();
  }, []);

  // load background data once
  useEffect(() => {
    api.communities().then((d) => setCommunities(d.partition || {}));
    api.scores(500).then((rows) => {
      const m = {};
      rows.forEach((r) => (m[r.id] = r.score));
      setScores(m);
    });
    api.anomalies().then((rows) => setAnomalyIds(new Set(rows.map((r) => r.node_id))));
    api.predictedLinks().then(setPredicted);
  }, []);

  // fetch + render graph whenever selection or depth changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fetcher = selectedId ? api.subgraph(selectedId, depth) : api.scores(1).then(async (rows) => {
      const top = rows[0];
      return top ? api.subgraph(top.id, depth) : { nodes: [], edges: [] };
    });
    fetcher.then((g) => {
      if (cancelled) return;
      renderGraph(g);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, depth]);

  // re-style when overlays / background data change (without refetch)
  useEffect(() => {
    restyle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnomalies, showPredicted, communities, scores, anomalyIds, predicted]);

  function nodeVisual(n) {
    const commId = communities[n.id];
    const color = communityColor(commId);
    const isAnomaly = showAnomalies && anomalyIds.has(n.id);
    const score = scores[n.id];
    const size = n.label === "Person" ? 14 + Math.min(score || 0, 100) * 0.22 : 10;
    return {
      id: n.id,
      label: n.name || n.handle || n.fir_number || n.account_number || n.id,
      shape: TYPE_SHAPE[n.label] || "dot",
      size,
      color: {
        background: color,
        border: isAnomaly ? "#C1503D" : "#0E1116",
        highlight: { background: color, border: "#D9A441" },
      },
      borderWidth: isAnomaly ? 3 : 1.5,
      title: `${n.label}: ${n.name || n.id}${score ? `\nPriority score: ${Math.round(score)}` : ""}${isAnomaly ? "\n⚠ Potential activity anomaly" : ""}`,
      font: { color: "#C9D1D9" },
    };
  }

  function edgeVisual(e) {
    return {
      id: e.id,
      from: e.source,
      to: e.target,
      label: e.type,
      font: { size: 9, color: "#5B6472", strokeWidth: 0, align: "middle" },
      dashes: false,
      color: { color: confColor(e.confidence) },
    };
  }

  function confColor(conf) {
    if (conf === "Confirmed") return "#4FB6A6";
    if (conf === "Supported") return "#D9A441";
    return "#3A4250";
  }

  function renderGraph(g) {
    const nodes = (g.nodes || []).map(nodeVisual);
    const edges = (g.edges || []).map(edgeVisual);
    nodesDsRef.current.clear();
    edgesDsRef.current.clear();
    nodesDsRef.current.add(nodes);
    edgesDsRef.current.add(edges);
    if (showPredicted) addPredictedOverlay(new Set(nodes.map((n) => n.id)));
  }

  function addPredictedOverlay(nodeIdSet) {
    const overlayEdges = predicted
      .filter((p) => nodeIdSet.has(p.source) && nodeIdSet.has(p.target))
      .map((p) => ({
        id: `pred-${p.source}-${p.target}`,
        from: p.source, to: p.target,
        dashes: true,
        color: { color: "#D9A441" },
        label: `Potential (jaccard ${p.jaccard})`,
        font: { size: 9, color: "#D9A441" },
      }));
    overlayEdges.forEach((e) => {
      if (!edgesDsRef.current.get(e.id)) edgesDsRef.current.add(e);
    });
  }

  function restyle() {
    const currentIds = nodesDsRef.current.getIds();
    const idSet = new Set(currentIds);
    // remove old predicted overlay edges first
    edgesDsRef.current.getIds().forEach((id) => {
      if (typeof id === "string" && id.startsWith("pred-")) edgesDsRef.current.remove(id);
    });
    currentIds.forEach((id) => {
      const n = nodesDsRef.current.get(id);
      const commId = communities[id];
      const color = communityColor(commId);
      const isAnomaly = showAnomalies && anomalyIds.has(id);
      nodesDsRef.current.update({
        id,
        color: { background: color, border: isAnomaly ? "#C1503D" : "#0E1116" },
        borderWidth: isAnomaly ? 3 : 1.5,
      });
    });
    if (showPredicted) addPredictedOverlay(idSet);
  }

  return (
    <div className="relative flex-1 h-full bg-ink-950">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-ink-900/90 border border-ink-700 rounded-md px-2.5 py-1.5">
        <span className="text-[11px] text-text-dim">Expand depth</span>
        {[1, 2].map((d) => (
          <button
            key={d}
            onClick={() => setDepth(d)}
            className={`text-[11px] w-6 h-6 rounded ${depth === d ? "bg-amber/20 text-amber" : "text-text-dim hover:bg-ink-800"}`}
          >
            {d}
          </button>
        ))}
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-text-dim text-sm z-10">
          Loading network…
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-ink-900/90 border border-ink-700 rounded-md px-3 py-1.5 text-[11px] text-text-dim">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal inline-block" /> Confirmed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber inline-block" /> Supported</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-text-dim inline-block" /> Potential</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border-2 border-rust inline-block" /> Anomaly</span>
      </div>
    </div>
  );
}
