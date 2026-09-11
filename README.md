# Sixense — AI-Assisted Criminal Network Analysis (Prototype)

Sixense is a working prototype investigator dashboard that ingests synthetic
FIR, call detail record (CDR), financial transaction, social media, and
location data into a graph, runs network analysis (centrality, betweenness,
community detection, link prediction, anomaly detection) and produces an
explainable **Investigative Priority Score** per entity — never a guilt
determination.

> **100% synthetic data.** No real people, cases, phone numbers, accounts, or
> social media content are used anywhere in this repository. This is a
> hackathon/demo prototype, not an operational tool.

## Ethical framing (enforced in code, not just docs)

- Sixense **never declares guilt**. Every score, alert, and AI-generated
  summary is phrased as "flagged for", "consistent with", "Potential" —
  never "is guilty of" or "committed".
- Every finding is labelled with one of four confidence levels:
  **Confirmed / Supported / Potential / Uncertain** (`app/config.py`).
- Every score ships with a full breakdown and a plain-English "why flagged"
  explanation (`app/risk_scoring.py`), plus a linked evidence/provenance list
  (`app/evidence.py`) so an investigator can check the underlying data.
- A human-in-the-loop **Confirm / Reject** action is required to turn a
  flagged finding into an investigator-verified one (`POST /api/verify`).
  Nothing is auto-escalated.
- The scoring evaluation (precision/recall/F1) is run against **synthetic**
  ground-truth labels generated alongside the demo data — see the big
  warning in `app/evaluation.py`. It demonstrates the evaluation methodology,
  not real-world accuracy.

## Architecture

```
┌─────────────────┐      Cypher       ┌──────────────┐
│  React frontend  │ ───── HTTP ─────► │   FastAPI     │
│  (vis-network,    │ ◄──── JSON ───── │   backend     │────► Neo4j (Cypher)
│   recharts)        │                  │               │      or
└─────────────────┘                   │  analytics.py │────► NetworkX
                                       │  risk_scoring │      (in-memory
                                       │  evaluation   │       fallback)
                                       │  ai_summary   │
                                       └──────────────┘
```

- **Data generation** (`backend/app/data_generator.py`): synthetic persons,
  FIRs, phones/calls, financial accounts/transactions, social media
  profiles/posts, locations, and relationships — with a few deliberately
  dense "ring" clusters so network analysis has something interesting to find.
- **Graph storage**: Neo4j is the primary, Cypher-driven store
  (`neo4j_store.py`) — nodes/relationships are written with batched `UNWIND`
  Cypher, and reads (full graph, ego network, search, shortest path) run as
  real Cypher queries, including `shortestPath()`. If Neo4j isn't reachable,
  the app automatically falls back to an in-memory NetworkX store
  (`networkx_store.py`) with an identical interface — so the demo never
  blocks on infra (`graph_service.py`).
- **Analytics** (`analytics.py`): degree/betweenness centrality, PageRank,
  Louvain community detection, common-neighbors + Jaccard link prediction,
  and timestamp-based anomaly detection. These run on a NetworkX view pulled
  from whichever backend is active, because the Neo4j Graph Data Science
  (GDS) plugin — which would let these run as Cypher procedures — isn't
  assumed to be installed. The Cypher-with-GDS equivalents are noted in
  comments as a drop-in upgrade path if you do have it.
- **Scoring** (`risk_scoring.py`): weighted composite of the above into a
  0–100 Investigative Priority Score, fully broken down by component.
- **Evaluation** (`evaluation.py`): precision/recall/F1/confusion matrix
  against synthetic ground truth, plus a top-K threshold sweep.
- **AI summaries & pattern alerts** (`ai_summary.py`): template-driven by
  default (deterministic, zero external dependency); the file includes a
  commented-out hook to swap in a real Claude API call.
- **Frontend** (`frontend/`): Vite + React + Tailwind + `vis-network` +
  `recharts`. Interactive graph (colored by community, sized by score,
  predicted-link and anomaly overlays), suspect search, an inspector panel
  (score breakdown, AI summary, evidence, confirm/reject), financial & call
  signal view, suspicious pattern alerts, shortest-path finder, and the
  evaluation dashboard.

## Quickstart

### Option A — with Neo4j (recommended, real Cypher-backed graph)

Requires Docker.

```bash
docker-compose up --build
```

Then open **http://localhost:8000**. The backend generates synthetic data,
loads it into Neo4j via Cypher, and serves the built frontend. Neo4j Browser
is available at http://localhost:7474 (user `neo4j`, password
`sixense_dev_pw`) if you want to run your own Cypher queries against the
loaded graph.

### Option B — no Docker, in-memory fallback (fastest to try)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.data_generator          # generate synthetic data into backend/data/
uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run build      # or `npm run dev` for hot-reload against localhost:8000
```

Open **http://localhost:8000** (built frontend, served by FastAPI) or
**http://localhost:5173** (Vite dev server, proxies `/api` to :8000).

The backend auto-detects Neo4j: if `bolt://localhost:7687` isn't reachable,
it logs a warning and falls back to the in-memory NetworkX store
automatically — everything still works, just without a real graph database
underneath.

### Regenerating / resizing the dataset

Tune volumes via environment variables before running the data generator,
e.g.:

```bash
SIXENSE_N_PERSONS=300 SIXENSE_N_FIRS=80 python -m app.data_generator
```

See `backend/app/config.py` for all tunables.

## API reference (short version)

| Endpoint | What it does |
|---|---|
| `GET /api/graph` | Full graph as nodes+edges |
| `GET /api/graph/subgraph/{id}?depth=1` | Ego network around an entity |
| `GET /api/node/{id}` | Node detail + priority score + evidence + verifications |
| `GET /api/node/{id}/summary` | AI-generated investigation summary |
| `GET /api/search?q=` | Search persons/FIRs/phones/accounts/etc. |
| `GET /api/path?from=&to=` | Shortest route between two entities |
| `GET /api/analytics/centrality` | Degree/betweenness/PageRank per node |
| `GET /api/analytics/communities` | Louvain partition + community sizes |
| `GET /api/analytics/anomalies` | Activity-spike anomaly detections |
| `GET /api/analytics/predicted-links` | Common-neighbors/Jaccard predicted links |
| `GET /api/analytics/pattern-alerts` | Rule-based suspicious pattern alerts |
| `GET /api/analytics/scores?top=25` | Top-N Investigative Priority Scores |
| `GET /api/analytics/evaluation` | Precision/recall/F1 vs. synthetic ground truth |
| `GET /api/analytics/evaluation/sweep` | Same, swept across top-K cutoffs |
| `POST /api/verify` | Human-in-the-loop confirm/reject a finding |

Interactive Swagger docs at `/docs` when the backend is running.

## Architecture roadmap (explicitly out of scope for this prototype)

- Real NLP/NER extraction from unstructured text (FIR narratives, chat logs)
- Trained entity-resolution ML (currently: exact/id-based linking only)
- Neo4j Graph Data Science plugin for native Cypher-based algorithms
- Graph neural network (GNN) based link prediction
- Role-based access control / authentication
- Durable audit logging (verifications are currently in-memory)
- Geospatial map view
- Horizontally-scaled datastore (Postgres for relational metadata, etc.)

## Demo script

See [`demo-script.md`](./demo-script.md) for a 90-second walkthrough.
