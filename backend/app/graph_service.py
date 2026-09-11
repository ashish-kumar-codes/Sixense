"""
Single entry point the rest of the app imports. Chooses the graph backend:

- SIXENSE_GRAPH_BACKEND=neo4j     -> require Neo4j, fail loudly if unreachable
- SIXENSE_GRAPH_BACKEND=networkx  -> force the in-memory fallback
- SIXENSE_GRAPH_BACKEND=auto (default) -> try Neo4j, fall back to NetworkX
  and log a warning, so `docker-compose up` gives you the real Neo4j/Cypher
  path but a plain `uvicorn app.main:app` still works with zero setup.
"""
import logging

from . import config
from .networkx_store import NetworkXStore

logger = logging.getLogger("sixense.graph_service")

_service = None


class GraphService:
    def __init__(self, store):
        self.store = store
        self.backend_name = store.backend_name

    def load(self, data_dir=None):
        return self.store.load(data_dir)

    def get_full_graph(self, **kw):
        return self.store.get_full_graph(**kw)

    def get_node(self, node_id):
        return self.store.get_node(node_id)

    def get_ego_graph(self, node_id, depth=1):
        return self.store.get_ego_graph(node_id, depth=depth)

    def search(self, query, limit=25):
        return self.store.search(query, limit=limit)

    def shortest_path(self, from_id, to_id):
        return self.store.shortest_path(from_id, to_id)

    def get_networkx_view(self):
        return self.store.to_networkx_view()


def _build_service():
    mode = config.GRAPH_BACKEND
    if mode in ("neo4j", "auto"):
        try:
            from .neo4j_store import Neo4jStore
            store = Neo4jStore()
            store.verify_connectivity()
            store.load()
            logger.info("Sixense: connected to Neo4j at %s", config.NEO4J_URI)
            return GraphService(store)
        except Exception as exc:  # noqa: BLE001 - deliberately broad, this is a startup fallback
            if mode == "neo4j":
                raise
            logger.warning(
                "Sixense: Neo4j unavailable (%s). Falling back to in-memory "
                "NetworkX backend. Run `docker-compose up neo4j` for the real "
                "Cypher-backed graph.", exc,
            )
    store = NetworkXStore()
    store.load()
    logger.info("Sixense: using in-memory NetworkX backend")
    return GraphService(store)


def get_graph_service():
    global _service
    if _service is None:
        _service = _build_service()
    return _service
