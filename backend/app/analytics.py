"""
Graph analytics for Sixense.

All algorithms run against a NetworkX view of the graph (see
graph_service.get_networkx_view()), regardless of whether the system of
record is Neo4j or the in-memory fallback. This is a deliberate choice:
centrality/community/link-prediction algorithms need the Neo4j Graph
Data Science (GDS) plugin to run as Cypher procedures, and we don't
assume that's installed. If it is, the Cypher equivalents are noted
in comments below as a drop-in upgrade path.

Every function returns confidence-labelled results per config.CONFIDENCE_LEVELS.
Nothing here is a guilt determination -- see risk_scoring.py for how these
signals are combined into an explainable, human-verifiable score.
"""
from collections import defaultdict
from datetime import datetime, timedelta

import networkx as nx
import numpy as np

try:
    import community as community_louvain  # python-louvain
except ImportError:  # pragma: no cover
    community_louvain = None


def _flatten_undirected_weighted(g: nx.MultiDiGraph) -> nx.Graph:
    """Collapse the multigraph into a simple weighted undirected graph.
    Weight = number of relationships between the pair (parallel edges of
    any type count). This is what centrality/community/link-prediction
    run against."""
    flat = nx.Graph()
    flat.add_nodes_from(g.nodes(data=True))
    for u, v, _k, _d in g.edges(keys=True, data=True):
        if flat.has_edge(u, v):
            flat[u][v]["weight"] += 1
        else:
            flat.add_edge(u, v, weight=1)
    return flat


def compute_centrality(g: nx.MultiDiGraph):
    """Degree centrality, betweenness centrality, and PageRank.

    GDS equivalent (if the plugin is installed):
      CALL gds.betweenness.stream('sixenseGraph') YIELD nodeId, score
      CALL gds.pageRank.stream('sixenseGraph') YIELD nodeId, score
    """
    flat = _flatten_undirected_weighted(g)
    if flat.number_of_nodes() == 0:
        return {}
    degree = nx.degree_centrality(flat)
    betweenness = nx.betweenness_centrality(flat, weight="weight", normalized=True)
    pagerank = nx.pagerank(g.to_directed() if not g.is_directed() else g, alpha=0.85)

    out = {}
    for n in flat.nodes():
        out[n] = {
            "degree_centrality": round(degree.get(n, 0.0), 4),
            "betweenness_centrality": round(betweenness.get(n, 0.0), 4),
            "pagerank": round(pagerank.get(n, 0.0), 4),
        }
    return out


def compute_communities(g: nx.MultiDiGraph):
    """Louvain community detection.

    GDS equivalent:
      CALL gds.louvain.stream('sixenseGraph') YIELD nodeId, communityId
    """
    flat = _flatten_undirected_weighted(g)
    if flat.number_of_nodes() == 0:
        return {}, {}
    if community_louvain is not None:
        partition = community_louvain.best_partition(flat, weight="weight", random_state=42)
    else:  # fallback if python-louvain isn't installed: connected components
        partition = {}
        for i, comp in enumerate(nx.connected_components(flat)):
            for n in comp:
                partition[n] = i

    community_sizes = defaultdict(int)
    for comm_id in partition.values():
        community_sizes[comm_id] += 1
    return partition, dict(community_sizes)


def predict_links(g: nx.MultiDiGraph, node_label_filter="Person", top_n=15):
    """Common-neighbors + Jaccard link prediction, restricted to pairs of
    the same entity type that are not already directly connected.
    Predicted links are always labelled 'Potential' -- never upgraded to
    Confirmed/Supported by this function."""
    flat = _flatten_undirected_weighted(g)
    candidates = [n for n, d in flat.nodes(data=True) if d.get("label") == node_label_filter]
    if len(candidates) < 2:
        return []
    sub = flat.subgraph(candidates)
    pairs = nx.non_edges(sub)
    scored = []
    for u, v in pairs:
        cn = list(nx.common_neighbors(flat, u, v))
        if not cn:
            continue
        union_size = len(set(flat.neighbors(u)) | set(flat.neighbors(v)))
        jaccard = len(cn) / union_size if union_size else 0
        scored.append({
            "source": u, "target": v,
            "common_neighbors": len(cn),
            "jaccard": round(jaccard, 4),
            "confidence": "Potential",
        })
    scored.sort(key=lambda r: (r["common_neighbors"], r["jaccard"]), reverse=True)
    return scored[:top_n]


def _parse_ts(ts):
    try:
        return datetime.fromisoformat(ts)
    except Exception:
        return None


def detect_anomalies(g: nx.MultiDiGraph, recent_days=30, z_threshold=1.8):
    """Flags nodes whose recent (last `recent_days`) activity count is an
    outlier vs. their own historical weekly average. Applies to any node
    that is an endpoint of timestamped edges (CALLED, TRANSFERRED_TO,
    LOCATED_AT, POSTED). Purely a statistical signal -- surfaced in the UI
    as 'Potential' anomalies, never as evidence of wrongdoing on its own.
    """
    now = datetime.now()
    recent_cutoff = now - timedelta(days=recent_days)
    activity_timestamps = defaultdict(list)

    for u, v, _k, d in g.edges(keys=True, data=True):
        ts = _parse_ts(d.get("timestamp")) if d.get("timestamp") else None
        if ts is None:
            continue
        activity_timestamps[u].append(ts)
        activity_timestamps[v].append(ts)

    anomalies = []
    for node, timestamps in activity_timestamps.items():
        if len(timestamps) < 4:
            continue
        timestamps.sort()
        span_days = max((now - timestamps[0]).days, 1)
        n_weeks = max(span_days / 7.0, 1.0)
        historical_weekly_avg = len(timestamps) / n_weeks
        recent_count = sum(1 for t in timestamps if t >= recent_cutoff)
        recent_weeks = max(recent_days / 7.0, 1.0)
        recent_weekly_rate = recent_count / recent_weeks

        if historical_weekly_avg <= 0:
            continue
        ratio = recent_weekly_rate / historical_weekly_avg
        # simple z-like score using poisson-ish std approx
        std = max(historical_weekly_avg ** 0.5, 0.5)
        z = (recent_weekly_rate - historical_weekly_avg) / std

        if z >= z_threshold and recent_count >= 3:
            anomalies.append({
                "node_id": node,
                "recent_activity_count": recent_count,
                "historical_weekly_avg": round(historical_weekly_avg, 2),
                "recent_weekly_rate": round(recent_weekly_rate, 2),
                "spike_ratio": round(ratio, 2),
                "z_score": round(z, 2),
                "confidence": "Potential",
            })
    anomalies.sort(key=lambda a: a["z_score"], reverse=True)
    return anomalies


def shortest_route(store, from_id, to_id):
    """Thin wrapper kept here so callers can `from analytics import
    shortest_route` alongside the rest of the analytics API; the actual
    traversal happens in whichever graph store is active (Cypher
    shortestPath() for Neo4j, nx.shortest_path for the fallback)."""
    return store.shortest_path(from_id, to_id)


def run_all(graph_service):
    g = graph_service.get_networkx_view()
    centrality = compute_centrality(g)
    partition, community_sizes = compute_communities(g)
    anomalies = detect_anomalies(g)
    predicted_links = predict_links(g)
    return {
        "centrality": centrality,
        "communities": partition,
        "community_sizes": community_sizes,
        "anomalies": anomalies,
        "predicted_links": predicted_links,
    }
