"use client";

import { useEffect, useState } from "react";

type Status = {
  keys_on_server: Record<string, boolean>;
  misnamed_keys?: Array<{ provider: string; found_name: string; expected_name: string }>;
  any_key: boolean;
  models_seen: Array<{ provider: string; model: string }>;
  live_test: { ok: boolean; label: string | null; ms: number; detail: string; at: string };
  market_note_source: string | null;
};

/** Small status line for the Ask page: is a model key configured on the server, and does a model actually answer? */
export default function ModelStatus() {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(fresh = false) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/status${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`status ${r.status}`);
      setSt((await r.json()) as Status);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load(false);
  }, []);

  const keysSet = st ? Object.entries(st.keys_on_server).filter(([, v]) => v).map(([k]) => k) : [];
  const tone = !st ? "" : st.live_test.ok ? "good" : st.any_key ? "warn" : "muted";
  const headline = !st
    ? err
      ? `Status check failed (${err}).`
      : "Checking model status"
    : st.live_test.ok
      ? `Model connected: ${st.live_test.label} answered in ${(st.live_test.ms / 1000).toFixed(1)} s.`
      : st.any_key
        ? "Model key is set on the server, but no model answered the test call."
        : "No model key on the server. Answers come from the built-in rules writer (same numbers, plainer wording).";

  return (
    <div className="card mt">
      <div className="small">
        <span className={`chip ${tone}`}>{!st ? "checking" : st.live_test.ok ? "model on" : st.any_key ? "key set, model off" : "rules only"}</span>{" "}
        <strong>{headline}</strong>
      </div>
      {st ? (
        <p className="hint mt">
          Keys visible to the site: {keysSet.length ? keysSet.join(", ") : "none"}.{" "}
          {st.misnamed_keys && st.misnamed_keys.length
            ? st.misnamed_keys.map((m) => `A variable named ${m.found_name} is being used for ${m.provider}; the expected name is ${m.expected_name}, rename it when convenient.`).join(" ") + " "
            : ""}
          {st.models_seen.length ? `Models the router sees right now: ${st.models_seen.map((m) => `${m.provider}:${m.model}`).join(", ")}. ` : ""}
          Weekly market note (written by the GitHub Actions pipeline, uses the GitHub secret): {st.market_note_source ?? "not generated"}.{" "}
          {!st.live_test.ok && st.any_key ? st.live_test.detail + " " : ""}
          Last test {st.live_test.at.replace("T", " ").slice(0, 16)} UTC.
        </p>
      ) : null}
      <button type="button" className="btn" onClick={() => void load(true)} disabled={busy}>
        {busy ? "Testing" : "Test the model connection now"}
      </button>
    </div>
  );
}
