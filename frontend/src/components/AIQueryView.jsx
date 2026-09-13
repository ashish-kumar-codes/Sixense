import React, { useMemo, useState } from "react";

const API = "";

const EXAMPLES = [
  "Summarize this person's investigative profile",
  "Why is this person being prioritized for review?",
  "What evidence is linked to this person?",
  "What are the main risk signals?",
];

export default function AIQuery() {
  const [personId, setPersonId] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const score = profile?.risk_score?.score ?? result?.context?.risk?.score ?? null;
  const evidence = profile?.evidence || result?.context?.evidence || [];
  const riskTier =
    profile?.risk_score?.confidence_tier ||
    result?.context?.risk?.confidence_tier ||
    "Uncertain";

  const evidenceKinds = useMemo(() => {
    return [...new Set(evidence.map((e) => e.kind).filter(Boolean))];
  }, [evidence]);

  const loadProfile = async (id = personId) => {
    const cleanId = id.trim();
    if (!cleanId) return;

    setProfileLoading(true);
    try {
      const res = await fetch(`${API}/person/${encodeURIComponent(cleanId)}`);
      if (!res.ok) throw new Error("Person not found");
      const data = await res.json();
      setProfile(data);
      setPersonId(cleanId);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const runQuery = async (customQuery = query) => {
    const cleanQuery = customQuery.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setQuery(cleanQuery);

    try {
      const res = await fetch(`${API}/ai/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: cleanQuery,
          person_id: personId.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Query failed");
      }

      setResult(data);

      setHistory((prev) => [
        { query: cleanQuery, time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }) },
        ...prev.filter((item) => item.query !== cleanQuery),
      ].slice(0, 5));
    } catch (err) {
      setResult({
        error: err.message || "Unable to process query.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="aiq-page">
      <header className="aiq-header">
        <div>
          <div className="aiq-eyebrow">SIXENSE / INTELLIGENCE LAYER</div>
          <h1>AI Query</h1>
          <p>Ask natural-language questions across the active intelligence graph.</p>
        </div>

        <div className="aiq-status">
          <span className="aiq-status-dot" />
          AI ENGINE READY
        </div>
      </header>

      <section className="aiq-grid">
        {/* LEFT */}
        <aside className="aiq-panel aiq-query-panel">
          <div className="aiq-panel-head">
            <div>
              <span className="aiq-section-no">01</span>
              <h2>Query</h2>
            </div>
            <span className="aiq-live">LIVE</span>
          </div>

          <label className="aiq-label">PERSON CONTEXT</label>

          <div className="aiq-person-row">
            <input
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadProfile();
              }}
              placeholder="e.g. P9399"
            />
            <button onClick={() => loadProfile()} disabled={profileLoading}>
              {profileLoading ? "..." : "LOAD"}
            </button>
          </div>

          <label className="aiq-label">NATURAL LANGUAGE QUERY</label>

          <div className="aiq-command">
            <div className="aiq-command-top">
              <span>QUERY://</span>
              <span>CTRL + ENTER</span>
            </div>

            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  runQuery();
                }
              }}
              placeholder="Ask Sixense to analyze the selected entity..."
            />

            <div className="aiq-command-foot">
              <span>{query.length} chars</span>
              <span>GRAPH GROUNDED</span>
            </div>
          </div>

          <button
            className="aiq-run"
            onClick={() => runQuery()}
            disabled={loading || !query.trim()}
          >
            <span>{loading ? "ANALYZING..." : "RUN QUERY"}</span>
            <span>→</span>
          </button>

          <div className="aiq-examples">
            <div className="aiq-label">SUGGESTED QUERIES</div>

            {EXAMPLES.map((example) => (
              <button
                key={example}
                className="aiq-example"
                onClick={() => {
                  setQuery(example);
                  runQuery(example);
                }}
              >
                <span>+</span>
                {example}
              </button>
            ))}
          </div>

          <div className="aiq-history">
            <div className="aiq-label">RECENT QUERIES</div>

            {history.length === 0 ? (
              <div className="aiq-empty-small">No queries in this session.</div>
            ) : (
              history.map((item, index) => (
                <button
                  className="aiq-history-item"
                  key={`${item.query}-${index}`}
                  onClick={() => {
                    setQuery(item.query);
                    runQuery(item.query);
                  }}
                >
                  <span>{item.query}</span>
                  <time>{item.time}</time>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* CENTER */}
        <section className="aiq-panel aiq-analysis-panel">
          <div className="aiq-panel-head">
            <div>
              <span className="aiq-section-no">02</span>
              <h2>AI Analysis</h2>
            </div>

            {result?.generated_by && (
              <span className="aiq-source">
                {result.generated_by === "anthropic-api" ? "CLAUDE" : "LOCAL FALLBACK"}
              </span>
            )}
          </div>

          {!result && !loading ? (
            <div className="aiq-analysis-empty">
              <div className="aiq-orbit">
                <span />
                <span />
                <span />
              </div>
              <strong>READY FOR ANALYSIS</strong>
              <p>
                Select an entity, ask a question, and Sixense will return
                an evidence-grounded analysis.
              </p>
            </div>
          ) : loading ? (
            <div className="aiq-analysis-empty">
              <div className="aiq-loader">
                <span />
                <span />
                <span />
              </div>
              <strong>ANALYZING GRAPH CONTEXT</strong>
              <p>Processing the selected entity and linked evidence.</p>
            </div>
          ) : result?.error ? (
            <div className="aiq-error">
              <span>QUERY ERROR</span>
              <strong>{result.error}</strong>
            </div>
          ) : (
            <div className="aiq-result">
              <div className="aiq-result-meta">
                <div>
                  <span>QUERY</span>
                  <strong>{query}</strong>
                </div>

                <div className="aiq-result-score">
                  <span>PRIORITY</span>
                  <strong>{score !== null ? `${Number(score).toFixed(1)}` : "—"}</strong>
                </div>
              </div>

              <div className="aiq-answer">
                <div className="aiq-answer-title">
                  <span className="aiq-spark">✦</span>
                  INTELLIGENCE RESPONSE
                </div>

                <div className="aiq-answer-text">
                  {result.answer}
                </div>
              </div>

              <div className="aiq-findings">
                <div className="aiq-label">EVIDENCE SIGNALS</div>

                <div className="aiq-finding-grid">
                  <div>
                    <strong>{evidence.length}</strong>
                    <span>Linked records</span>
                  </div>
                  <div>
                    <strong>{evidenceKinds.length}</strong>
                    <span>Evidence types</span>
                  </div>
                  <div>
                    <strong>{riskTier}</strong>
                    <span>Confidence tier</span>
                  </div>
                </div>
              </div>

              <div className="aiq-disclaimer">
                <span>ANALYTICAL NOTE</span>
                <p>
                  AI output is grounded in the supplied graph context and is
                  intended as a prioritization aid for human review.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT */}
        <aside className="aiq-panel aiq-context-panel">
          <div className="aiq-panel-head">
            <div>
              <span className="aiq-section-no">03</span>
              <h2>Context</h2>
            </div>
          </div>

          {profile ? (
            <>
              <div className="aiq-profile">
                <div className="aiq-avatar">
                  {(profile.profile?.label || "?").charAt(0).toUpperCase()}
                </div>

                <div>
                  <strong>{profile.profile?.label || "Unknown"}</strong>
                  <span>{profile.profile?.id || personId}</span>
                </div>
              </div>

              <div className="aiq-risk-card">
                <div>
                  <span>INVESTIGATIVE PRIORITY</span>
                  <strong>
                    {score !== null ? Number(score).toFixed(1) : "—"}
                    <small>/100</small>
                  </strong>
                </div>
                <div className="aiq-risk-tier">{riskTier}</div>
              </div>

              <div className="aiq-context-stats">
                <div>
                  <span>TYPE</span>
                  <strong>{profile.profile?.ntype || "Person"}</strong>
                </div>
                <div>
                  <span>REVIEW</span>
                  <strong>{profile.review_status || "Not reviewed"}</strong>
                </div>
                <div>
                  <span>EVIDENCE</span>
                  <strong>{evidence.length}</strong>
                </div>
              </div>

              <div className="aiq-why">
                <div className="aiq-label">WHY FLAGGED</div>
                <p>
                  {profile.risk_score?.why_flagged ||
                    "No significant contributing factors identified."}
                </p>
              </div>

              <div className="aiq-evidence">
                <div className="aiq-label">LINKED EVIDENCE</div>

                {evidence.slice(0, 6).map((item, index) => (
                  <div className="aiq-evidence-row" key={`${item.reference_id}-${index}`}>
                    <span>{item.kind || "RECORD"}</span>
                    <div>
                      <strong>{item.reference_id || "—"}</strong>
                      <p>{item.detail || "Linked record"}</p>
                    </div>
                  </div>
                ))}

                {evidence.length === 0 && (
                  <div className="aiq-empty-small">No linked evidence available.</div>
                )}
              </div>
            </>
          ) : (
            <div className="aiq-context-empty">
              <div className="aiq-context-icon">◎</div>
              <strong>NO ENTITY LOADED</strong>
              <p>
                Enter a Person ID on the left to load profile, risk and
                evidence context.
              </p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
