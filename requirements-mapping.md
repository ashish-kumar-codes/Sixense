# Requirement → implementation mapping

| Requested | Built | Where |
|---|---|---|
| Interconnected synthetic data: FIR, call details/records, financial transactions, social media intelligence, locations | Yes — persons, FIRs, phones, calls, accounts, transactions, social profiles, posts, follows, locations, movement pings | `backend/app/data_generator.py` |
| Realistic synthetic dataset via Python | Yes — Faker + numpy, seeded, with 3 deliberately dense "ring" clusters for demo-visible structure | `backend/app/data_generator.py` |
| Neo4j for storing nodes/relationships/properties via Cypher | Yes — batched `UNWIND` Cypher writes; reads (full graph, ego network, search, shortest path) via Cypher, including `shortestPath()` | `backend/app/neo4j_store.py` |
| Centrality, betweenness, community detection | Yes — degree centrality, betweenness centrality, PageRank, Louvain communities | `backend/app/analytics.py` |
| Shortest path / quickest route between suspects | Yes — Cypher `shortestPath()` when Neo4j is active, NetworkX shortest path fallback; dedicated Path Finder UI tab | `neo4j_store.py`, `networkx_store.py`, `frontend/src/components/PathFinderView.jsx` |
| Evaluation metrics: precision, recall, F1 for risk score | Yes — against synthetic ground-truth labels, plus top-K threshold sweep and confusion matrix | `backend/app/evaluation.py` |
| Interactive network visualization | Yes — `vis-network`, colored by community, sized by score, confidence-colored edges, predicted-link and anomaly overlays, expandable ego network | `frontend/src/components/NetworkGraph.jsx` |
| Suspect profile search | Yes — live search across persons/FIRs/phones/accounts/social profiles | `frontend/src/components/SearchPanel.jsx` |
| Financial and call analysis | Yes — anomaly detection (activity spikes vs. baseline) surfaced per financial/call entity; circular-transfer ("layering") pattern detection | `backend/app/analytics.py` (`detect_anomalies`), `ai_summary.py` (`generate_pattern_alerts`), `frontend/src/components/SignalsView.jsx` |
| AI investigation summary | Yes — template-driven cautious-language summary generator per entity, with a commented hook to swap in a real Claude API call | `backend/app/ai_summary.py` (`generate_node_summary`) |
| Suspicious pattern alerts | Yes — circular transaction layering, flagged social language + financial anomaly co-occurrence, high-priority broker positions, dense clusters with shared FIR touchpoints | `backend/app/ai_summary.py` (`generate_pattern_alerts`), `frontend/src/components/AlertsView.jsx` |
| No definitive guilt declarations | Enforced throughout: `Confirmed/Supported/Potential/Uncertain` vocabulary, "why flagged" language rules, human-in-the-loop confirm/reject, synthetic-data banner | `backend/app/config.py`, `risk_scoring.py`, `ai_summary.py`, `frontend/src/components/TopBar.jsx` |
| React UI | Yes — Vite + React + Tailwind, dark investigator-console theme | `frontend/` |
| FastAPI (Python/ML) backend | Yes | `backend/app/main.py` |
| Neo4j | Yes, with automatic in-memory NetworkX fallback so the app never blocks on infra availability | `backend/app/graph_service.py` |

## Explicitly deferred (see README "Architecture roadmap")

Real NLP/NER extraction, trained entity-resolution ML, Neo4j GDS plugin
integration, GNN-based link prediction, RBAC/auth, durable audit logging,
geospatial map view, and a relational datastore (Postgres) for non-graph
metadata.
