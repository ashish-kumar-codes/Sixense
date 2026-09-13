"""
Turns the flat synthetic JSON tables into a generic (nodes, edges) graph
representation shared by both the Neo4j store (which loads it via Cypher)
and the NetworkX fallback store (which loads it directly into memory).

Node dict shape:  {id, label, properties: {...}}
Edge dict shape:  {id, type, source, target, properties: {...}}
"""
import json
import os

from . import config


def _load(name, data_dir):
    with open(os.path.join(data_dir, f"{name}.json")) as f:
        return json.load(f)


def load_raw(data_dir=None):
    data_dir = data_dir or config.DATA_DIR
    names = ["locations", "persons", "firs", "phones", "calls", "accounts",
              "transactions", "social_profiles", "social_posts", "social_follows",
              "fir_links", "associations", "located_at", "orgs", "vehicles", "aliases", "narratives"]
    return {n: _load(n, data_dir) for n in names if os.path.exists(os.path.join(data_dir, f"{n}.json"))}


def build_graph_elements(raw=None, data_dir=None):
    raw = raw or load_raw(data_dir)
    nodes = []
    edges = []

    def add_node(label, obj, id_key="id", extra_props=None):
        props = {k: v for k, v in obj.items() if k != id_key}
        if extra_props:
            props.update(extra_props)
        nodes.append({"id": obj[id_key], "label": label, "properties": props})

    def add_edge(eid, etype, source, target, props=None):
        edges.append({"id": eid, "type": etype, "source": source, "target": target,
                       "properties": props or {}})

    for l in raw["locations"]:
        add_node("Location", l)
    for p in raw["persons"]:
        add_node("Person", p)
    for f in raw["firs"]:
        add_node("FIR", f)
        add_edge(f"{f['id']}-OCCURRED_AT", "OCCURRED_AT", f["id"], f["location_id"])
    for ph in raw["phones"]:
        add_node("Phone", ph)
        add_edge(f"OWNS-{ph['id']}", "OWNS", ph["owner_person_id"], ph["id"])
    for acc in raw["accounts"]:
        add_node("Account", acc)
        add_edge(f"OWNS-{acc['id']}", "OWNS", acc["owner_person_id"], acc["id"])
    for sp in raw["social_profiles"]:
        add_node("SocialProfile", sp)
        add_edge(f"OWNS-{sp['id']}", "OWNS", sp["owner_person_id"], sp["id"])
    for post in raw["social_posts"]:
        add_node("SocialPost", post)
        add_edge(f"POSTED-{post['id']}", "POSTED", post["profile_id"], post["id"],
                  {"content_category": post["content_category"], "sentiment": post["sentiment"]})
        if post.get("location_id"):
            add_edge(f"POSTLOC-{post['id']}", "POSTED_FROM", post["id"], post["location_id"])

    for c in raw["calls"]:
        add_edge(c["id"], "CALLED", c["from_phone_id"], c["to_phone_id"],
                  {"timestamp": c["timestamp"], "duration_sec": c["duration_sec"],
                   "tower_location_id": c["tower_location_id"], "confidence": "Confirmed",
                   "source": "CDR"})
    for t in raw["transactions"]:
        add_edge(t["id"], "TRANSFERRED_TO", t["from_account_id"], t["to_account_id"],
                  {"amount": t["amount"], "currency": t["currency"], "timestamp": t["timestamp"],
                   "channel": t["channel"], "confidence": "Confirmed", "source": "Bank Statement"})
    for fl in raw["fir_links"]:
        add_edge(fl["id"], "INVOLVED_IN", fl["person_id"], fl["fir_id"],
                  {"role": fl["role"], "confidence": fl["confidence"], "source": "FIR Record"})
    for a in raw["associations"]:
        add_edge(a["id"], "ASSOCIATED_WITH", a["person_a_id"], a["person_b_id"],
                  {"confidence": a["confidence"], "basis": a["basis"], "source": "Field Intelligence"})
    for la in raw["located_at"]:
        add_edge(la["id"], "LOCATED_AT", la["person_id"], la["location_id"],
                  {"timestamp": la["timestamp"], "confidence": "Supported", "source": "Location Ping"})
    for fo in raw.get("social_follows", []):
        add_edge(fo["id"], "FOLLOWS", fo["from_profile_id"], fo["to_profile_id"],
                  {"confidence": "Confirmed", "source": "Platform API (synthetic)"})

    for org in raw.get("orgs", []):
        add_node("Organization", org)
    for veh in raw.get("vehicles", []):
        add_node("Vehicle", veh)
        if veh.get("owner_id"):
            add_edge(f"OWNS-{veh['id']}", "OWNS", veh["owner_id"], veh["id"])
    for alias in raw.get("aliases", []):
        add_node("Alias", alias)
        add_edge(f"HAS_ALIAS-{alias['id']}", "HAS_ALIAS", alias["person_id"], alias["id"])
    for narr in raw.get("narratives", []):
        add_node("Narrative", narr)
        if narr.get("related_fir_id"):
            add_edge(f"MENTIONED_IN-{narr['id']}", "MENTIONED_IN", narr["id"], narr["related_fir_id"])

    return nodes, edges
