"""
Neo4j-backed graph store. Loads the synthetic dataset into Neo4j using
batched Cypher UNWIND writes, and answers reads with Cypher queries
(including Cypher's built-in shortestPath()).

Heavy graph algorithms (centrality, community detection, link prediction)
are NOT run in Cypher here -- that needs the separately licensed Graph
Data Science (GDS) plugin, which a fresh `neo4j` Docker image does not
include. Instead, analytics.py pulls the graph out via `to_networkx_view()`
and runs NetworkX / python-louvain, which needs no extra plugin. If you
do have GDS installed, swapping analytics.py's calls for
`gds.betweenness.stream` etc. is a drop-in upgrade -- the Cypher for that
is noted in comments in analytics.py.
"""
import networkx as nx
from neo4j import GraphDatabase

from . import config
from .graph_elements import build_graph_elements, load_raw

LABEL_INDEX_CYPHER = [
    "CREATE CONSTRAINT sixense_node_id IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE",
]


class Neo4jStore:
    backend_name = "neo4j"

    def __init__(self, uri=None, user=None, password=None, database=None):
        self.uri = uri or config.NEO4J_URI
        self.user = user or config.NEO4J_USER
        self.password = password or config.NEO4J_PASSWORD
        self.database = database or config.NEO4J_DATABASE
        self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))

    def verify_connectivity(self):
        self.driver.verify_connectivity()

    def close(self):
        self.driver.close()

    # ------------------------------------------------------------- write
    def load(self, data_dir=None):
        raw = load_raw(data_dir)
        nodes, edges = build_graph_elements(raw, data_dir)
        with self.driver.session(database=self.database) as session:
            session.run("MATCH (n) DETACH DELETE n")
            for stmt in LABEL_INDEX_CYPHER:
                session.run(stmt)

            by_label = {}
            for n in nodes:
                by_label.setdefault(n["label"], []).append(
                    {"id": n["id"], **n["properties"]})
            for label, batch in by_label.items():
                session.run(
                    f"""
                    UNWIND $rows AS row
                    CREATE (n:Entity:{label})
                    SET n = row
                    """,
                    rows=batch,
                )

            by_type = {}
            for e in edges:
                by_type.setdefault(e["type"], []).append({
                    "id": e["id"], "source": e["source"], "target": e["target"],
                    **e["properties"],
                })
            for etype, batch in by_type.items():
                session.run(
                    f"""
                    UNWIND $rows AS row
                    MATCH (a:Entity {{id: row.source}})
                    MATCH (b:Entity {{id: row.target}})
                    CREATE (a)-[r:{etype}]->(b)
                    SET r = row
                    """,
                    rows=batch,
                )
        return {"nodes": len(nodes), "edges": len(edges)}

    # -------------------------------------------------------------- reads
    def _node_record_to_dict(self, node):
        d = dict(node)
        d["label"] = [l for l in node.labels if l != "Entity"][0] if node.labels else None
        return d

    def get_full_graph(self, limit_nodes=2000):
        with self.driver.session(database=self.database) as session:
            node_rows = session.run(
                "MATCH (n:Entity) RETURN n LIMIT $lim", lim=limit_nodes).data()
            nodes = [self._node_record_to_dict(r["n"]) for r in node_rows]
            ids = [n["id"] for n in nodes]
            edge_rows = session.run(
                """
                MATCH (a:Entity)-[r]->(b:Entity)
                WHERE a.id IN $ids AND b.id IN $ids
                RETURN r, a.id AS source, b.id AS target, type(r) AS rtype
                """, ids=ids).data()
            edges = []
            for row in edge_rows:
                d = dict(row["r"])
                d["source"] = row["source"]
                d["target"] = row["target"]
                d["type"] = row["rtype"]
                d.setdefault("id", f"{row['source']}-{row['rtype']}-{row['target']}")
                edges.append(d)
        return {"nodes": nodes, "edges": edges}

    def get_node(self, node_id):
        with self.driver.session(database=self.database) as session:
            rec = session.run("MATCH (n:Entity {id: $id}) RETURN n", id=node_id).single()
            if not rec:
                return None
            return self._node_record_to_dict(rec["n"])

    def get_ego_graph(self, node_id, depth=1):
        depth = max(1, min(depth, 3))
        with self.driver.session(database=self.database) as session:
            rows = session.run(
                f"""
                MATCH (n:Entity {{id: $id}})
                CALL {{
                    WITH n
                    MATCH p = (n)-[*1..{depth}]-(m:Entity)
                    RETURN p
                }}
                RETURN p
                """, id=node_id).data()
        nodes = {}
        edges = {}
        for row in rows:
            path = row["p"]
            for node in path.nodes:
                d = self._node_record_to_dict(node)
                nodes[d["id"]] = d
            for rel in path.relationships:
                d = dict(rel)
                d["source"] = rel.start_node["id"]
                d["target"] = rel.end_node["id"]
                d["type"] = rel.type
                d.setdefault("id", f"{d['source']}-{d['type']}-{d['target']}")
                edges[d["id"]] = d
        center = self.get_node(node_id)
        if center:
            nodes[node_id] = center
        return {"nodes": list(nodes.values()), "edges": list(edges.values())}

    def search(self, query, limit=25):
        query_l = f"(?i).*{query}.*"
        with self.driver.session(database=self.database) as session:
            rows = session.run(
                """
                MATCH (n:Entity)
                WHERE any(prop IN ['name','handle','fir_number','account_number','number','id']
                          WHERE n[prop] IS NOT NULL AND toString(n[prop]) =~ $q)
                RETURN n LIMIT $lim
                """, q=query_l, lim=limit).data()
        results = []
        for r in rows:
            d = self._node_record_to_dict(r["n"])
            name = d.get("name") or d.get("handle") or d.get("fir_number") or \
                d.get("account_number") or d.get("number") or d["id"]
            results.append({"id": d["id"], "label": d["label"], "name": name})
        return results

    def shortest_path(self, from_id, to_id):
        with self.driver.session(database=self.database) as session:
            rec = session.run(
                """
                MATCH (a:Entity {id: $from_id}), (b:Entity {id: $to_id})
                MATCH p = shortestPath((a)-[*..8]-(b))
                RETURN p
                """, from_id=from_id, to_id=to_id).single()
        if not rec:
            return None
        path = rec["p"]
        nodes = [self._node_record_to_dict(n) for n in path.nodes]
        edges = []
        for rel in path.relationships:
            d = dict(rel)
            d["source"] = rel.start_node["id"]
            d["target"] = rel.end_node["id"]
            d["type"] = rel.type
            edges.append(d)
        return {"nodes": nodes, "edges": edges, "length": len(path.relationships)}

    # ------------------------------------------------- analytics handoff
    def to_networkx_view(self):
        """Pull the whole graph out of Neo4j into a NetworkX MultiDiGraph
        so analytics.py can run centrality/community/link-prediction
        without requiring the Neo4j GDS plugin."""
        full = self.get_full_graph(limit_nodes=100000)
        g = nx.MultiDiGraph()
        for n in full["nodes"]:
            props = {k: v for k, v in n.items() if k != "id"}
            g.add_node(n["id"], **props)
        for e in full["edges"]:
            props = {k: v for k, v in e.items() if k not in ("id", "source", "target")}
            g.add_edge(e["source"], e["target"], key=e.get("id"), **props)
        return g
