"""
Evidence panel data + human-in-the-loop verification store.

get_evidence_for_node() returns every edge touching a node with its
confidence label and source, so the UI's "Why flagged?" panel can show
provenance for every claim rather than a bare score.

VerificationStore is intentionally in-memory (a dict) -- for a 3-hour
hackathon prototype this is a fine, honestly-labelled tradeoff. A real
deployment would persist to Neo4j itself (a Verification node/relationship
property) or a proper audit-logged datastore.
"""
import threading
from datetime import datetime


def get_evidence_for_node(graph_service, node_id):
    g = graph_service.get_networkx_view()
    if node_id not in g:
        return []
    evidence = []
    for u, v, k, d in g.in_edges(node_id, keys=True, data=True):
        evidence.append({"edge_id": k, "type": d.get("type"), "direction": "incoming",
                          "counterpart": u, **{kk: vv for kk, vv in d.items() if kk != "type"}})
    for u, v, k, d in g.out_edges(node_id, keys=True, data=True):
        evidence.append({"edge_id": k, "type": d.get("type"), "direction": "outgoing",
                          "counterpart": v, **{kk: vv for kk, vv in d.items() if kk != "type"}})
    evidence.sort(key=lambda e: e.get("timestamp") or "", reverse=True)
    return evidence


class VerificationStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._store = {}  # node_id -> list of verification records

    def add(self, node_id, finding_ref, status, investigator, note=None):
        record = {
            "node_id": node_id,
            "finding_ref": finding_ref,
            "status": status,  # "Confirmed" | "Rejected"
            "investigator": investigator or "demo-investigator",
            "note": note,
            "timestamp": datetime.now().isoformat(),
        }
        with self._lock:
            self._store.setdefault(node_id, []).append(record)
        return record

    def get(self, node_id):
        with self._lock:
            return list(self._store.get(node_id, []))

    def all(self):
        with self._lock:
            return dict(self._store)


_verification_store = None


def get_verification_store():
    global _verification_store
    if _verification_store is None:
        _verification_store = VerificationStore()
    return _verification_store
