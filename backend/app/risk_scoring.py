"""
Investigative Priority Score.

This is explicitly NOT a guilt score. It is a triage aid: which entities
deserve an investigator's limited attention first, and why. Every score
ships with its component breakdown and a plain-English explanation, and
every UI surface must show it alongside the CONFIDENCE_LEVELS vocabulary
(Confirmed / Supported / Potential / Uncertain), never as a bare number
implying certainty.

Weights (sum to 1.0):
  0.30  normalized betweenness centrality  -- structural "broker" position
  0.25  case associations                  -- number of distinct FIRs touched
  0.20  degree / connectivity              -- how connected the entity is
  0.15  anomaly signal                     -- recent activity spike vs. baseline
  0.10  community size / relevance         -- membership in a large dense cluster
"""
from collections import defaultdict

import numpy as np

WEIGHTS = {
    "betweenness": 0.30,
    "case_associations": 0.25,
    "connectivity": 0.20,
    "anomaly": 0.15,
    "community": 0.10,
}


def _minmax_normalize(values: dict):
    if not values:
        return {}
    arr = np.array(list(values.values()), dtype=float)
    lo, hi = arr.min(), arr.max()
    if hi - lo < 1e-9:
        return {k: 0.0 for k in values}
    return {k: (v - lo) / (hi - lo) for k, v in values.items()}


def compute_case_association_counts(g):
    counts = defaultdict(int)
    for u, v, _k, d in g.edges(keys=True, data=True):
        if d.get("type") == "INVOLVED_IN" or (g.nodes.get(v, {}).get("label") == "FIR"):
            counts[u] += 1
    return dict(counts)


def compute_scores(graph_service, centrality: dict, communities: dict,
                    community_sizes: dict, anomalies: list):
    g = graph_service.get_networkx_view()
    person_ids = [n for n, d in g.nodes(data=True) if d.get("label") == "Person"]

    betweenness = {pid: centrality.get(pid, {}).get("betweenness_centrality", 0.0) for pid in person_ids}
    degree = {pid: centrality.get(pid, {}).get("degree_centrality", 0.0) for pid in person_ids}
    case_assoc = compute_case_association_counts(g)
    case_assoc = {pid: case_assoc.get(pid, 0) for pid in person_ids}

    anomaly_by_node = {a["node_id"]: a["z_score"] for a in anomalies}
    # propagate anomaly signal from a person's owned phone/account/social profile onto the person
    person_anomaly = defaultdict(float)
    for u, v, _k, d in g.edges(keys=True, data=True):
        if d.get("type") == "OWNS" and v in anomaly_by_node:
            person_anomaly[u] = max(person_anomaly[u], anomaly_by_node[v])
    for pid in person_ids:
        if pid in anomaly_by_node:
            person_anomaly[pid] = max(person_anomaly[pid], anomaly_by_node[pid])
    anomaly_scores = {pid: person_anomaly.get(pid, 0.0) for pid in person_ids}

    community_relevance = {pid: community_sizes.get(communities.get(pid), 0) for pid in person_ids}

    n_betweenness = _minmax_normalize(betweenness)
    n_case_assoc = _minmax_normalize(case_assoc)
    n_degree = _minmax_normalize(degree)
    n_anomaly = _minmax_normalize(anomaly_scores)
    n_community = _minmax_normalize(community_relevance)

    results = {}
    for pid in person_ids:
        components = {
            "betweenness": n_betweenness.get(pid, 0.0),
            "case_associations": n_case_assoc.get(pid, 0.0),
            "connectivity": n_degree.get(pid, 0.0),
            "anomaly": n_anomaly.get(pid, 0.0),
            "community": n_community.get(pid, 0.0),
        }
        total = sum(components[k] * WEIGHTS[k] for k in WEIGHTS) * 100
        raw = {
            "betweenness_centrality": round(betweenness.get(pid, 0.0), 4),
            "case_association_count": case_assoc.get(pid, 0),
            "degree_centrality": round(degree.get(pid, 0.0), 4),
            "anomaly_z_score": round(anomaly_scores.get(pid, 0.0), 2),
            "community_size": community_relevance.get(pid, 0),
        }
        results[pid] = {
            "score": round(total, 1),
            "components": {k: round(v * WEIGHTS[k] * 100, 1) for k, v in components.items()},
            "raw_signals": raw,
            "why_flagged": build_why_flagged(pid, components, raw),
        }
    return results


def build_why_flagged(pid, components, raw):
    reasons = []
    ranked = sorted(components.items(), key=lambda kv: kv[1], reverse=True)
    labels = {
        "betweenness": f"sits structurally between {('many' if raw['betweenness_centrality'] > 0.02 else 'several')} otherwise-unconnected parts of the network (betweenness {raw['betweenness_centrality']})",
        "case_associations": f"appears in {raw['case_association_count']} FIR record(s)",
        "connectivity": f"has an unusually high number of direct connections (degree centrality {raw['degree_centrality']})",
        "anomaly": f"shows a recent activity spike vs. their own historical baseline (z-score {raw['anomaly_z_score']})",
        "community": f"belongs to a densely connected cluster of {raw['community_size']} entities",
    }
    for key, val in ranked[:3]:
        if val > 0:
            reasons.append(labels[key])
    if not reasons:
        return "No significant contributing signals -- low priority by current data."
    return "Flagged because this entity " + "; and ".join(reasons) + \
        ". This reflects network position and activity patterns only, and is not a determination of wrongdoing."
