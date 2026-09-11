"""Lazily computed + cached analytics/scoring state, recomputed on demand
via /api/analytics/recompute (e.g. after a /api/verify action, or just to
refresh anomaly windows)."""
import threading

from . import analytics, risk_scoring
from .graph_service import get_graph_service


class AppState:
    def __init__(self):
        self._lock = threading.RLock()
        self._analytics = None
        self._scores = None

    def graph_service(self):
        return get_graph_service()

    def get_analytics(self, force=False):
        with self._lock:
            if self._analytics is None or force:
                self._analytics = analytics.run_all(self.graph_service())
            return self._analytics

    def get_scores(self, force=False):
        with self._lock:
            a = self.get_analytics(force=force)
            if self._scores is None or force:
                self._scores = risk_scoring.compute_scores(
                    self.graph_service(), a["centrality"], a["communities"],
                    a["community_sizes"], a["anomalies"],
                )
            return self._scores


_state = None


def get_state():
    global _state
    if _state is None:
        _state = AppState()
    return _state
