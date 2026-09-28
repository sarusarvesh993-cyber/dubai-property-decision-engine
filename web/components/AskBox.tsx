"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const EXAMPLES = [
  "Is AED 1.5m fair for a 750 sqft 1 bed in Business Bay?",
  "What is the rent for a 2 bed flat in JVC?",
  "Which communities are heating up?",
  "Best yield areas for apartments",
  "My rent in Dubai Marina is 90,000 for 900 sqft. Can the landlord increase it?",
  "Compare Dubai Hills vs Arabian Ranches villas",
];

type AskResponse = { question: string; answer: string; source: string; facts: unknown; error?: string };

export default function AskBox({ mode = "full" }: { mode?: "full" | "compact" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const asked = useRef<string | null>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    if (mode === "compact") {
      router.push(`/ask?q=${encodeURIComponent(text)}`);
      return;
    }
    setLoading(true);
    setRes(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/ask?q=${encodeURIComponent(text)}`);
    }
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text }) });
      const data = (await r.json()) as AskResponse;
      setRes(r.ok ? data : { question: text, answer: data.error ?? "Something went wrong.", source: "error", facts: null });
    } catch {
      setRes({ question: text, answer: "The service did not respond. Please try again.", source: "error", facts: null });
    } finally {
      setLoading(false);
    }
  }

  // On /ask?q=... (for example after using the box on the home page) ask the question straight away.
  // The query string is read in the browser so the form itself is part of the static HTML.
  useEffect(() => {
    if (mode !== "full" || typeof window === "undefined") return;
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial && asked.current !== initial) {
      asked.current = initial;
      setQ(initial);
      void ask(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div>
      <form
        className="askbar"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about a community, a price or a rent. For example: is AED 1.5m fair for a 750 sqft 1 bed in Business Bay?"
          aria-label="Ask a question"
          maxLength={300}
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Thinking" : "Ask"}
        </button>
      </form>
      <div className="examples">
        {EXAMPLES.slice(0, mode === "compact" ? 4 : 6).map((ex) => (
          <button key={ex} type="button" className="chip-btn" onClick={() => { setQ(ex); void ask(ex); }}>
            {ex}
          </button>
        ))}
      </div>
      {mode === "full" && res && (
        <div className="card mt">
          <div className="small mb">
            Q: {res.question}
          </div>
          <div className="note">{res.answer}</div>
          <p className="hint mt">
            Answered by <strong>{res.source}</strong>. Every number comes from the published benchmarks; the model (when configured) only writes the sentences.
          </p>
          {res.facts ? (
            <details className="mt">
              <summary className="small">Facts used for this answer</summary>
              <pre className="facts">{JSON.stringify(res.facts, null, 2)}</pre>
            </details>
          ) : null}
        </div>
      )}
    </div>
  );
}
