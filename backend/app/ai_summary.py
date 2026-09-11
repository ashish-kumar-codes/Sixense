"""
AI-assisted investigation summaries and suspicious-pattern alerts.

Default implementation is template/rule-based (zero external dependency,
deterministic for a demo). `generate_node_summary` and
`generate_pattern_alerts` are the two functions main.py calls; swap their
bodies for a real LLM call (Claude via the Anthropic API, see the
commented block at the bottom) without changing any caller.

Hard rule enforced throughout: never state guilt or a definitive
conclusion. Always use CONFIDENCE_LEVELS vocabulary and always point to
underlying evidence the investigator can independently check.
"""
from datetime import datetime, timedelta

FORBIDDEN_PHRASES_NOTE = (
    "Sixense-generated text must never assert that a person 'is' a criminal, "
    "'committed' an offence, or similar definitive claims. Use 'associated with', "
    "'flagged for', 'shows a pattern consistent with', qualified by confidence level."
)


def generate_node_summary(node, score_info, evidence, anomalies_for_node, ego_graph):
    name = node.get("name") or node.get("id")
    score = score_info["score"] if score_info else None
    lines = []

    if score is not None:
        lines.append(
            f"{name} has an Investigative Priority Score of {score}/100, "
            f"placing them {_score_band(score)} relative to other entities in this network. "
            f"This score reflects network position and activity patterns; it is not a "
            f"finding of wrongdoing."
        )
        lines.append(score_info.get("why_flagged", ""))
    else:
        lines.append(f"{name} has not accumulated enough graph signal for a priority score.")

    n_case = sum(1 for e in evidence if e.get("type") == "INVOLVED_IN")
    if n_case:
        roles = sorted({e.get("role", "Person of Interest") for e in evidence if e.get("type") == "INVOLVED_IN"})
        lines.append(
            f"They are linked to {n_case} FIR record(s) in role(s): {', '.join(roles)}. "
            f"Each link carries its own confidence label (Confirmed/Supported) -- see the evidence panel."
        )

    if anomalies_for_node:
        a = anomalies_for_node[0]
        lines.append(
            f"A Potential anomaly was detected: recent activity ({a['recent_activity_count']} events "
            f"in the observation window) is running at {a['spike_ratio']}x their historical baseline "
            f"(z-score {a['z_score']}). This alone does not indicate misconduct -- it indicates the "
            f"pattern deserves a human look."
        )

    n_neighbors = max(len(ego_graph.get("nodes", [])) - 1, 0)
    if n_neighbors:
        lines.append(f"Their immediate network (1 hop) includes {n_neighbors} other entities.")

    lines.append(
        "All findings above are drawn from synthetic demo data and are provided for "
        "investigator review, verification, and confirm/reject action -- not as a conclusion."
    )
    return "\n\n".join(l for l in lines if l)


def _score_band(score):
    if score >= 75:
        return "in the highest priority band"
    if score >= 50:
        return "in an elevated priority band"
    if score >= 25:
        return "in a moderate priority band"
    return "in a low priority band"


def generate_pattern_alerts(graph_service, scores, anomalies, predicted_links, communities, community_sizes):
    """Rule-based suspicious-pattern alerts combining multiple weak
    signals into a single flag. Every alert is 'Potential' confidence by
    construction -- these are leads, not conclusions."""
    g = graph_service.get_networkx_view()
    alerts = []

    # Pattern 1: circular/layered financial transfers (A->B->C->...->A)
    account_to_owner = {v: u for u, v, _k, d in g.edges(keys=True, data=True)
                         if d.get("type") == "OWNS" and g.nodes.get(v, {}).get("label") == "Account"}
    txn_graph = _sub_digraph_by_edge_type(g, "TRANSFERRED_TO")
    try:
        cycles = _short_cycles(txn_graph, max_len=6)
    except Exception:
        cycles = []
    for cyc in cycles[:8]:
        owners = [account_to_owner.get(a) for a in cyc if account_to_owner.get(a)]
        alerts.append({
            "pattern": "Circular financial transfer (possible layering)",
            "confidence": "Potential",
            "entities": list(dict.fromkeys(owners)),
            "detail": (f"A closed loop of {len(cyc)} accounts transferring funds in sequence was found. "
                       f"Layering patterns like this are commonly examined in money-laundering reviews, "
                       f"but a cycle alone does not establish intent."),
        })

    # Pattern 2: person with both a financial anomaly AND a flagged-language social post
    anomaly_ids = {a["node_id"] for a in anomalies}
    flagged_post_owners = set()
    for u, v, _k, d in g.edges(keys=True, data=True):
        if d.get("type") == "POSTED" and d.get("content_category") in (
                "coded-language-flagged", "recruitment-language-flagged"):
            profile = u
            owner_edges = [uu for uu, vv, _kk, dd in g.edges(keys=True, data=True)
                           if dd.get("type") == "OWNS" and vv == profile]
            flagged_post_owners.update(owner_edges)
    account_owners = {u for u, v, _k, d in g.edges(keys=True, data=True) if d.get("type") == "OWNS"}
    for pid in flagged_post_owners:
        owned = [v for u, v, _k, d in g.edges(keys=True, data=True) if u == pid and d.get("type") == "OWNS"]
        if any(o in anomaly_ids for o in owned) or pid in anomaly_ids:
            alerts.append({
                "pattern": "Flagged social activity co-occurring with financial anomaly",
                "confidence": "Potential",
                "entities": [pid],
                "detail": ("This entity has at least one social media post flagged for coded/recruitment "
                           "language and an unusual recent spike in financial or call activity. Correlation "
                           "only -- recommend investigator review of both underlying items."),
            })

    # Pattern 3: high-score person bridging two or more distinct communities' associates
    for pid, comp in scores.items():
        if comp["score"] >= 70:
            alerts.append({
                "pattern": "High-priority broker position",
                "confidence": "Supported" if comp["raw_signals"]["betweenness_centrality"] > 0.01 else "Potential",
                "entities": [pid],
                "detail": (f"Investigative Priority Score {comp['score']}/100. " + comp["why_flagged"]),
            })

    # Pattern 4: dense community with multiple shared FIR touches (candidate organized group)
    size_by_comm = community_sizes
    comm_fir_touch = {}
    for u, v, _k, d in g.edges(keys=True, data=True):
        if d.get("type") == "INVOLVED_IN":
            c = communities.get(u)
            comm_fir_touch.setdefault(c, set()).add(v)
    for comm_id, firs in comm_fir_touch.items():
        size = size_by_comm.get(comm_id, 0)
        if size >= 4 and len(firs) >= 3:
            members = [n for n, c in communities.items() if c == comm_id]
            alerts.append({
                "pattern": "Densely connected group with multiple shared case touchpoints",
                "confidence": "Potential",
                "entities": members,
                "detail": (f"A cluster of {size} entities shares connections to {len(firs)} distinct FIR "
                           f"records. Consistent with (but not proof of) an organized group -- recommend "
                           f"cross-referencing case narratives."),
            })

    return alerts


def _sub_digraph_by_edge_type(g, etype):
    import networkx as nx
    sub = nx.DiGraph()
    for u, v, _k, d in g.edges(keys=True, data=True):
        if d.get("type") == etype:
            sub.add_edge(u, v)
    return sub


def _short_cycles(dg, max_len=6, max_results=25, max_scan=5000):
    """Bounded cycle search. Uses NetworkX's length_bound so the search
    itself is pruned (not just filtered after the fact), and additionally
    caps total cycles scanned/returned -- a dense synthetic transaction
    graph can otherwise have combinatorially many simple cycles."""
    import networkx as nx
    found = []
    scanned = 0
    try:
        gen = nx.simple_cycles(dg, length_bound=max_len)
    except TypeError:  # older networkx without length_bound
        gen = nx.simple_cycles(dg)
    for cyc in gen:
        scanned += 1
        if 2 < len(cyc) <= max_len:
            found.append(cyc)
        if len(found) >= max_results or scanned >= max_scan:
            break
    return found


# ---------------------------------------------------------------------
# Optional: real LLM-backed summary. Uncomment and set ANTHROPIC_API_KEY
# to replace the template-based generate_node_summary above.
#
# import os
# from anthropic import Anthropic
# _client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
#
# def generate_node_summary_llm(node, score_info, evidence, anomalies_for_node, ego_graph):
#     prompt = f"""You are assisting a human investigator. Never assert guilt or a
# definitive conclusion. Use only: Confirmed / Supported / Potential / Uncertain.
# Node: {node}
# Score: {score_info}
# Evidence: {evidence}
# Anomalies: {anomalies_for_node}
# Write a concise (<150 words) investigative summary."""
#     resp = _client.messages.create(
#         model="claude-sonnet-4-6", max_tokens=400,
#         messages=[{"role": "user", "content": prompt}],
#     )
#     return "".join(b.text for b in resp.content if b.type == "text")
