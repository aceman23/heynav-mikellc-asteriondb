"use client";

import { useState } from "react";
import { Icon } from "../Icon";

type CitationT = {
  objectId: string;
  displayName: string;
  snippet: string;
};

type AskResultT = {
  answer: string;
  citations: CitationT[];
  errorMessage?: string;
};

export function AskScreen() {
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<"all" | "opportunity">("all");
  const [opportunityId, setOpportunityId] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AskResultT | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (!question.trim()) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          opportunityId: scope === "opportunity" && opportunityId ? Number(opportunityId) : null,
        }),
      });
      const data = (await res.json()) as AskResultT & { errorMessage?: string };
      if (!res.ok || data.errorMessage) {
        setError(data.errorMessage ?? `HTTP ${res.status}`);
      } else {
        setResult(data);
      }
    } catch {
      setError("Could not reach the server.");
    }
    setPending(false);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Ask</h2>
          <p>Ask a question about your vault documents. Answers are grounded in the stored objects with citations to the source passages.</p>
        </div>
      </div>

      <section className="panel ask-panel">
        <div className="ask-scope">
          <label>
            <input
              type="radio"
              name="scope"
              checked={scope === "all"}
              onChange={() => setScope("all")}
            />
            All documents I can see
          </label>
          <label>
            <input
              type="radio"
              name="scope"
              checked={scope === "opportunity"}
              onChange={() => setScope("opportunity")}
            />
            One opportunity
          </label>
          {scope === "opportunity" && (
            <input
              type="number"
              className="ask-opp-id"
              placeholder="Opportunity ID"
              value={opportunityId}
              onChange={(e) => setOpportunityId(e.target.value)}
              aria-label="Opportunity ID"
            />
          )}
        </div>

        <div className="ask-input">
          <textarea
            placeholder="e.g. What are the evaluation criteria for this solicitation?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(); }}
            rows={3}
            aria-label="Question"
          />
          <button type="button" className="btn primary" onClick={ask} disabled={pending || !question.trim()}>
            {pending ? "Asking…" : "Ask"}
          </button>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {result && (
          <div className="ask-answer">
            <div className="ask-answer-text">
              <h4><Icon name="ask" size={14} /> Answer</h4>
              <p>{result.answer}</p>
            </div>
            {result.citations.length > 0 && (
              <div className="ask-citations">
                <h4>Citations</h4>
                <ul>
                  {result.citations.map((c, i) => (
                    <li key={i}>
                      <span className="doc-name">{c.displayName}</span>
                      <span className="muted mono">{c.objectId}</span>
                      <p className="citation-snippet">{c.snippet}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
