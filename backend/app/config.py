"""
Sixense configuration.

Everything is 100% synthetic data. Nothing here connects to any real
investigative system, and nothing in this codebase makes a definitive
guilt/innocence determination — see app/risk_scoring.py and
app/ai_summary.py for the language rules that are enforced everywhere.
"""
import os

# --- Graph backend -----------------------------------------------------
# "neo4j": use a real Neo4j instance (recommended, see docker-compose.yml)
# "networkx": in-memory fallback, zero external services, used automatically
#             if Neo4j is unreachable at startup so the demo never blocks.
GRAPH_BACKEND = os.environ.get("SIXENSE_GRAPH_BACKEND", "auto")  # auto|neo4j|networkx

NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "sixense_dev_pw")
NEO4J_DATABASE = os.environ.get("NEO4J_DATABASE", "neo4j")

# --- Synthetic data volume ----------------------------------------------
N_PERSONS = int(os.environ.get("SIXENSE_N_PERSONS", 180))
N_PHONES = int(os.environ.get("SIXENSE_N_PHONES", 150))
N_FIRS = int(os.environ.get("SIXENSE_N_FIRS", 40))
N_LOCATIONS = int(os.environ.get("SIXENSE_N_LOCATIONS", 25))
N_ACCOUNTS = int(os.environ.get("SIXENSE_N_ACCOUNTS", 90))
N_TRANSACTIONS = int(os.environ.get("SIXENSE_N_TRANSACTIONS", 260))
N_CALLS = int(os.environ.get("SIXENSE_N_CALLS", 500))
N_SOCIAL_PROFILES = int(os.environ.get("SIXENSE_N_SOCIAL_PROFILES", 160))
N_SOCIAL_POSTS = int(os.environ.get("SIXENSE_N_SOCIAL_POSTS", 320))

N_ORGS = int(os.environ.get("SIXENSE_N_ORGS", 20))
N_VEHICLES = int(os.environ.get("SIXENSE_N_VEHICLES", 40))
N_ALIASES = int(os.environ.get("SIXENSE_N_ALIASES", 30))
N_NARRATIVES = int(os.environ.get("SIXENSE_N_NARRATIVES", 15))

RANDOM_SEED = int(os.environ.get("SIXENSE_SEED", 42))

DATA_DIR = os.environ.get("SIXENSE_DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data"))

# --- Confidence / evidentiary vocabulary --------------------------------
# Used everywhere a finding is surfaced. Never replace with certainty language.
CONFIDENCE_LEVELS = ["Confirmed", "Supported", "Potential", "Uncertain"]

DISCLAIMER = (
    "Synthetic demo data — not for operational use. Sixense never declares guilt. "
    "It surfaces an Investigative Priority Score and patterns for a human investigator "
    "to review, verify, confirm, or reject."
)
