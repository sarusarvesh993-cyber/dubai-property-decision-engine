import { anyKeyConfigured, candidates, chat, configuredKeys } from "@/lib/llm";
import summary from "@/public/data/summary.json";
import marketNote from "@/public/data/market_note.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/status
 * Answers the question "is the model key working?" without exposing any secret:
 *  - which key environment variables are present on the server (names only),
 *  - which free models the router currently sees,
 *  - the result of a one-line live test call (cached for 10 minutes to protect free quotas; ?fresh=1 forces a new test).
 */
type Test = { ok: boolean; label: string | null; ms: number; detail: string; at: string };
let cached: Test | null = null;
const CACHE_MS = 10 * 60 * 1000;

async function liveTest(): Promise<Test> {
  const started = Date.now();
  const at = new Date().toISOString();
  if (!anyKeyConfigured()) return { ok: false, label: null, ms: 0, detail: "No model key is set on the server. Answers use the built-in rules writer.", at };
  try {
    const r = await chat([{ role: "user", content: "Reply with the single word OK." }], { maxTokens: 5, temperature: 0, attempts: 3 });
    const ms = Date.now() - started;
    if (r) return { ok: true, label: r.label, ms, detail: `A model answered in ${(ms / 1000).toFixed(1)} s. Ask box answers are written by the model and checked against the facts.`, at };
    return { ok: false, label: null, ms, detail: "A key is set, but no model answered. Usual causes: the key is invalid or revoked, the provider rate-limited the free tier, or the request timed out. Answers fall back to the rules writer until a model responds.", at };
  } catch (e) {
    return { ok: false, label: null, ms: Date.now() - started, detail: `Test call failed: ${e instanceof Error ? e.message : String(e)}`, at };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fresh = url.searchParams.get("fresh") === "1";
  if (!cached || fresh || Date.now() - Date.parse(cached.at) > CACHE_MS) cached = await liveTest();
  let models: Array<{ provider: string; model: string }> = [];
  try {
    models = (await candidates()).slice(0, 5).map((c) => ({ provider: c.provider, model: c.model }));
  } catch {
    models = [];
  }
  const note = marketNote as { source?: string };
  return Response.json(
    {
      checked_at: new Date().toISOString(),
      keys_on_server: configuredKeys(),
      any_key: anyKeyConfigured(),
      models_seen: models,
      live_test: cached,
      market_note_source: note.source ?? null,
      data_as_of: (summary as { as_of: string }).as_of,
      how_to_read: [
        "keys_on_server lists the environment variable names the site can see; a value of false means the key is not set in Vercel for this deployment.",
        "live_test.ok true means a model answered a one-word test call; the label is provider:model.",
        "market_note_source is the writer of the weekly note produced by the GitHub Actions pipeline; it reflects the GitHub secret, not the Vercel variable.",
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
