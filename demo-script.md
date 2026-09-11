# Sixense — 90-second demo script

**Setup:** `docker-compose up --build` (or the no-Docker path in README.md),
open http://localhost:8000.

1. **(0:00–0:10) Set the frame.** Point at the amber disclaimer banner:
   "Synthetic demo data — not for operational use. Sixense never declares
   guilt." This is the operating principle for everything that follows.

2. **(0:10–0:25) Search a name.** Type a partial name into the left-rail
   search box (e.g. a few letters). Results appear live across persons,
   FIRs, phones, and accounts. Click a top-priority entity from the default
   "Top priority entities" list.

3. **(0:25–0:40) View the network.** The center graph re-centers on that
   entity's ego network. Point out: node color = community (Louvain), node
   size = priority score, edge color = confidence (teal=Confirmed,
   amber=Supported, grey=Potential). Toggle "Expand depth" to 2 to show more
   of the network.

4. **(0:40–0:55) Click the high-score node.** The right-rail Inspector opens:
   big Investigative Priority Score, the component breakdown bar chart
   (betweenness / case ties / connectivity / anomaly / cluster size), and
   the plain-English "why flagged" sentence underneath.

5. **(0:55–1:05) Show evidence.** Scroll the Inspector's evidence panel —
   every claim has a confidence badge and a source (FIR Record, CDR, Bank
   Statement, Field Intelligence). Click "Generate AI investigation summary"
   for a synthesized, cautiously-worded paragraph.

6. **(1:05–1:15) Predicted link.** Toggle "Predicted links" in the top bar.
   Dashed amber edges appear labelled "Potential" — common-neighbors/Jaccard
   link prediction. Explain: these are leads, not established connections.

7. **(1:15–1:25) Anomaly alert.** Toggle "Anomaly alerts" (on by default) —
   nodes with a rust-colored ring have a statistically unusual recent
   activity spike. Switch to the **Financial & Call Signals** tab to see the
   full list with z-scores and baselines.

8. **(1:25–1:30) Confirm a finding.** Back in the Inspector, click
   **Confirm** under "Human review." The verification is timestamped and
   attributed to the investigator — the human stays in the loop on every
   escalation.

**Optional extra beats if you have time:**
- **Alerts tab**: rule-based suspicious patterns (circular transaction
  layering / "possible layering", flagged social language co-occurring with
  a financial anomaly, broker positions, dense clusters sharing multiple FIRs).
- **Path Finder tab**: pick two entities, get the shortest connecting route
  through calls/transfers/associations/shared cases.
- **Evaluation tab**: precision/recall/F1 of the scoring methodology against
  synthetic ground truth, plus the threshold-sweep chart — shows the scoring
  system was validated, not just asserted.
