import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE || "/api";

const client = axios.create({ baseURL: BASE, timeout: 30000 });

export const api = {
  health: () => client.get("/health").then((r) => r.data),
  graph: () => client.get("/graph").then((r) => r.data),
  subgraph: (id, depth = 1) =>
    client.get(`/graph/subgraph/${id}`, { params: { depth } }).then((r) => r.data),
  search: (q) => client.get("/search", { params: { q } }).then((r) => r.data),
  path: (from, to) => client.get("/path", { params: { from, to } }).then((r) => r.data),
  node: (id) => client.get(`/node/${id}`).then((r) => r.data),
  nodeSummary: (id) => client.get(`/node/${id}/summary`).then((r) => r.data),
  verify: (payload) => client.post("/verify", payload).then((r) => r.data),
  centrality: () => client.get("/analytics/centrality").then((r) => r.data),
  communities: () => client.get("/analytics/communities").then((r) => r.data),
  anomalies: () => client.get("/analytics/anomalies").then((r) => r.data),
  predictedLinks: () => client.get("/analytics/predicted-links").then((r) => r.data),
  patternAlerts: () => client.get("/analytics/pattern-alerts").then((r) => r.data),
  scores: (top = 30) => client.get("/analytics/scores", { params: { top } }).then((r) => r.data),
  evaluation: (params = {}) => client.get("/analytics/evaluation", { params }).then((r) => r.data),
  evaluationSweep: () => client.get("/analytics/evaluation/sweep").then((r) => r.data),
  recompute: () => client.post("/analytics/recompute").then((r) => r.data),
};

export default api;
