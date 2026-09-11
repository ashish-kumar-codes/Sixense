"""
In-memory graph store built on NetworkX. This is the zero-dependency
fallback backend, and also the shared representation analytics.py always
computes against (even when Neo4j is the system of record) because
graph algorithm libraries for Neo4j require the separately-licensed GDS
plugin, which we don't assume is installed.
"""
import networkx as nx

from .graph_elements import build_graph_elements, load_raw


class NetworkXStore:
    backend_name = "networkx"

    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.raw = None

    def load(self, data_dir=None):
        self.raw = load_raw(data_dir)
        nodes, edges = build_graph_elements(self.raw, data_dir)
        g = nx.MultiDiGraph()
        for n in nodes:
            g.add_node(n["id"], label=n["label"], **n["properties"])
        for e in edges:
            g.add_edge(e["source"], e["target"], key=e["id"], type=e["type"], **e["properties"])
        self.graph = g
        return {"nodes": g.number_of_nodes(), "edges": g.number_of_edges()}

    # -------------------------------------------------------------- reads
    def get_full_graph(self, limit_nodes=None):
        g = self.graph
        node_ids = list(g.nodes())
        if limit_nodes:
            node_ids = node_ids[:limit_nodes]
        nodes = [{"id": nid, **g.nodes[nid]} for nid in node_ids]
        node_set = set(node_ids)
        edges = []
        for u, v, k, d in g.edges(keys=True, data=True):
            if u in node_set and v in node_set:
                edges.append({"id": k, "source": u, "target": v, **d})
        return {"nodes": nodes, "edges": edges}

    def get_node(self, node_id):
        if node_id not in self.graph:
            return None
        return {"id": node_id, **self.graph.nodes[node_id]}

    def get_ego_graph(self, node_id, depth=1):
        if node_id not in self.graph:
            return {"nodes": [], "edges": []}
        undirected = self.graph.to_undirected(as_view=True)
        sub_nodes = nx.ego_graph(undirected, node_id, radius=depth).nodes()
        nodes = [{"id": nid, **self.graph.nodes[nid]} for nid in sub_nodes]
        sub_set = set(sub_nodes)
        edges = []
        for u, v, k, d in self.graph.edges(keys=True, data=True):
            if u in sub_set and v in sub_set:
                edges.append({"id": k, "source": u, "target": v, **d})
        return {"nodes": nodes, "edges": edges}

    def search(self, query, limit=25):
        query = query.lower().strip()
        results = []
        if not query:
            return results
        for nid, d in self.graph.nodes(data=True):
            label = d.get("label", "")
            name = str(d.get("name") or d.get("handle") or d.get("fir_number") or
                       d.get("account_number") or d.get("number") or nid)
            haystack = f"{name} {label} {nid}".lower()
            if query in haystack:
                results.append({"id": nid, "label": label, "name": name})
            if len(results) >= limit:
                break
        return results

    def shortest_path(self, from_id, to_id):
        if from_id not in self.graph or to_id not in self.graph:
            return None
        undirected = self.graph.to_undirected(as_view=True)
        try:
            path = nx.shortest_path(undirected, from_id, to_id)
        except nx.NetworkXNoPath:
            return None
        edges_on_path = []
        for a, b in zip(path[:-1], path[1:]):
            # pick a representative edge (there may be a MultiDiGraph edge either direction)
            data = None
            if self.graph.has_edge(a, b):
                data = list(self.graph.get_edge_data(a, b).values())[0]
            elif self.graph.has_edge(b, a):
                data = list(self.graph.get_edge_data(b, a).values())[0]
            edges_on_path.append({"source": a, "target": b, **(data or {})})
        nodes_on_path = [{"id": nid, **self.graph.nodes[nid]} for nid in path]
        return {"nodes": nodes_on_path, "edges": edges_on_path, "length": len(path) - 1}

    def to_networkx_view(self):
        return self.graph


_store = None


def get_store():
    global _store
    if _store is None:
        _store = NetworkXStore()
        _store.load()
    return _store
