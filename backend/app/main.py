import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import ai_summary, config, evaluation
from .evidence import get_evidence_for_node, get_verification_store
from .state import get_state

app = FastAPI(
    title="Sixense",
    description="AI-assisted criminal network analysis dashboard (synthetic demo data). "
                 + config.DISCLAIMER,
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------ meta
@app.get("/api/health")
def health():
    state = get_state()
    gs = state.graph_service()
    return {
        "status": "ok",
        "backend": gs.backend_name,
        "disclaimer": config.DISCLAIMER,
    }


# ----------------------------------------------------------------- graph
@app.get("/api/graph")
def get_graph(limit_nodes: int = Query(default=None)):
    gs = get_state().graph_service()
    return gs.get_full_graph(limit_nodes=limit_nodes) if limit_nodes else gs.get_full_graph()


@app.get("/api/graph/subgraph/{node_id}")
def get_subgraph(node_id: str, depth: int = 1):
    gs = get_state().graph_service()
    result = gs.get_ego_graph(node_id, depth=depth)
    if not result["nodes"]:
        raise HTTPException(404, f"Node {node_id} not found")
    return result


@app.get("/api/search")
def search(q: str = Query(default="", min_length=0), limit: int = 25):
    gs = get_state().graph_service()
    return {"query": q, "results": gs.search(q, limit=limit)}


@app.get("/api/path")
def shortest_path(from_id: str = Query(alias="from"), to_id: str = Query(alias="to")):
    gs = get_state().graph_service()
    result = gs.shortest_path(from_id, to_id)
    if result is None:
        raise HTTPException(404, f"No path found between {from_id} and {to_id}")
    return result


# ------------------------------------------------------------- node view
@app.get("/api/node/{node_id}")
def get_node_detail(node_id: str):
    state = get_state()
    gs = state.graph_service()
    node = gs.get_node(node_id)
    if node is None:
        raise HTTPException(404, f"Node {node_id} not found")

    scores = state.get_scores()
    score_info = scores.get(node_id)
    evidence = get_evidence_for_node(gs, node_id)
    verifications = get_verification_store().get(node_id)

    a = state.get_analytics()
    node_anomalies = [x for x in a["anomalies"] if x["node_id"] == node_id]
    owned_ids = {e["counterpart"] for e in evidence if e["type"] == "OWNS" and e["direction"] == "outgoing"}
    node_anomalies += [x for x in a["anomalies"] if x["node_id"] in owned_ids]

    ego = gs.get_ego_graph(node_id, depth=1)
    community_id = a["communities"].get(node_id)

    return {
        "node": node,
        "priority_score": score_info,
        "evidence": evidence,
        "verifications": verifications,
        "anomalies": node_anomalies,
        "community_id": community_id,
        "community_size": a["community_sizes"].get(community_id),
        "ego_network_size": len(ego["nodes"]) - 1,
        "confidence_levels": config.CONFIDENCE_LEVELS,
    }


@app.get("/api/node/{node_id}/summary")
def get_node_summary(node_id: str):
    state = get_state()
    gs = state.graph_service()
    node = gs.get_node(node_id)
    if node is None:
        raise HTTPException(404, f"Node {node_id} not found")
    scores = state.get_scores()
    score_info = scores.get(node_id)
    evidence = get_evidence_for_node(gs, node_id)
    a = state.get_analytics()
    node_anomalies = [x for x in a["anomalies"] if x["node_id"] == node_id]
    ego = gs.get_ego_graph(node_id, depth=1)
    summary_text = ai_summary.generate_node_summary(node, score_info, evidence, node_anomalies, ego)
    return {"node_id": node_id, "summary": summary_text}


# --------------------------------------------------------------- verify
class VerifyRequest(BaseModel):
    node_id: str
    finding_ref: str
    status: str  # "Confirmed" | "Rejected"
    investigator: str | None = None
    note: str | None = None


@app.post("/api/verify")
def verify_finding(req: VerifyRequest):
    if req.status not in ("Confirmed", "Rejected"):
        raise HTTPException(400, "status must be 'Confirmed' or 'Rejected'")
    gs = get_state().graph_service()
    if gs.get_node(req.node_id) is None:
        raise HTTPException(404, f"Node {req.node_id} not found")
    record = get_verification_store().add(req.node_id, req.finding_ref, req.status,
                                           req.investigator, req.note)
    return {"ok": True, "record": record}


# ------------------------------------------------------------ analytics
@app.get("/api/analytics/centrality")
def analytics_centrality():
    return get_state().get_analytics()["centrality"]


@app.get("/api/analytics/communities")
def analytics_communities():
    a = get_state().get_analytics()
    return {"partition": a["communities"], "sizes": a["community_sizes"]}


@app.get("/api/analytics/anomalies")
def analytics_anomalies():
    return get_state().get_analytics()["anomalies"]


@app.get("/api/analytics/predicted-links")
def analytics_predicted_links():
    return get_state().get_analytics()["predicted_links"]


@app.get("/api/analytics/pattern-alerts")
def analytics_pattern_alerts():
    state = get_state()
    a = state.get_analytics()
    scores = state.get_scores()
    return ai_summary.generate_pattern_alerts(
        state.graph_service(), scores, a["anomalies"], a["predicted_links"],
        a["communities"], a["community_sizes"],
    )


@app.get("/api/analytics/scores")
def analytics_scores(top: int = 25):
    scores = get_state().get_scores()
    ranked = sorted(scores.items(), key=lambda kv: kv[1]["score"], reverse=True)[:top]
    gs = get_state().graph_service()
    out = []
    for pid, info in ranked:
        node = gs.get_node(pid)
        out.append({"id": pid, "name": node.get("name") if node else pid, **info})
    return out


@app.get("/api/analytics/evaluation")
def analytics_evaluation(threshold: float = None, top_k: int = None):
    scores = get_state().get_scores()
    return evaluation.evaluate_scores(scores, threshold=threshold, top_k=top_k)


@app.get("/api/analytics/evaluation/sweep")
def analytics_evaluation_sweep():
    scores = get_state().get_scores()
    return evaluation.threshold_sweep(scores)


@app.post("/api/analytics/recompute")
def analytics_recompute():
    state = get_state()
    state.get_analytics(force=True)
    state.get_scores(force=True)
    return {"ok": True}


# ------------------------------------------------------------- frontend
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
