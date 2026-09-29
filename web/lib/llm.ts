// Free-model router (TypeScript port of pipeline/llm_router.py) for the /api/ask function.
// Discovers which free models are available right now, ranks them, tries them in order and
// gives up cleanly (the caller falls back to the rules-based answer). Keys come from env vars only.

type Provider = { base: string; keyEnv: string; needsKeyToList: boolean; headers?: Record<string, string> };

const PROVIDERS: Record<string, Provider> = {
  groq: { base: "https://api.groq.com/openai/v1", keyEnv: "GROQ_API_KEY", needsKeyToList: true },
  gemini: { base: "https://generativelanguage.googleapis.com/v1beta/openai", keyEnv: "GEMINI_API_KEY", needsKeyToList: true },
  cerebras: { base: "https://api.cerebras.ai/v1", keyEnv: "CEREBRAS_API_KEY", needsKeyToList: true },
  openrouter: {
    base: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY",
    needsKeyToList: false,
    headers: { "HTTP-Referer": "https://github.com/dubai-property-decision-engine", "X-Title": "Dubai Property Decision Engine" },
  },
};
const ORDER = ["groq", "gemini", "cerebras", "openrouter"];
const EXCLUDE = /(safety|guard|moderat|embed|whisper|tts|speech|audio|lyria|image|vision-only|ocr|rerank|transcri|native-audio|live|veo|imagen|aqa|learnlm|robotics|computer-use|-code|coder)/i;
const GOOD = ["llama", "qwen", "gemma", "mistral", "mixtral", "deepseek", "nemotron", "gpt-oss", "glm", "kimi", "gemini", "command", "phi", "hermes", "openchat", "yi-"];

export type Candidate = { provider: string; model: string; score: number };
export type LLMResult = { text: string; provider: string; model: string; label: string };

const cache = new Map<string, { at: number; list: Candidate[] }>();
const blacklist = new Map<string, number>();
const TTL_MS = 6 * 3600 * 1000;

function sizeB(id: string): number {
  const m = id.toLowerCase().match(/(\d+(?:\.\d+)?)b\b/);
  return m ? parseFloat(m[1]) : 0;
}

export function scoreModel(provider: string, id: string, ctx = 0): number {
  const low = id.toLowerCase();
  let s = 0;
  if (GOOD.some((g) => low.includes(g))) s += 10;
  const b = sizeB(low);
  s += b >= 400 ? 9 : b >= 120 ? 8 : b >= 60 ? 6 : b >= 25 ? 4 : b >= 7 ? 2 : b > 0 ? 0 : 3;
  if (/instruct|chat|it\b/.test(low)) s += 1;
  if (/(nano|mini|tiny|small|lite)/.test(low)) s -= 2;
  if (/(preview|exp|beta)/.test(low)) s -= 1;
  if (ctx >= 100_000) s += 2;
  else if (ctx >= 32_000) s += 1;
  s += { groq: 3, gemini: 2, cerebras: 2, openrouter: 0 }[provider] ?? 0;
  return s;
}

function key(provider: string): string | undefined {
  const v = process.env[PROVIDERS[provider].keyEnv];
  return v && v.trim() ? v.trim() : undefined;
}

function headers(provider: string, withAuth = true): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...(PROVIDERS[provider].headers ?? {}) };
  const k = key(provider);
  if (withAuth && k) h.Authorization = `Bearer ${k}`;
  return h;
}

async function discover(provider: string): Promise<Candidate[]> {
  const p = PROVIDERS[provider];
  if (p.needsKeyToList && !key(provider)) return [];
  const cached = cache.get(provider);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.list;
  let list: Candidate[] = [];
  try {
    const res = await fetch(`${p.base}/models`, { headers: headers(provider), signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const body = (await res.json()) as { data?: Array<Record<string, unknown>> };
      for (const m of body.data ?? []) {
        let id = String(m.id ?? "");
        if (!id || EXCLUDE.test(id)) continue;
        if (provider === "gemini") id = id.replace(/^models\//, "");
        if (provider === "openrouter") {
          const pricing = (m.pricing ?? {}) as Record<string, string>;
          const arch = (m.architecture ?? {}) as { input_modalities?: string[]; output_modalities?: string[] };
          const free = parseFloat(pricing.prompt ?? "1") === 0 && parseFloat(pricing.completion ?? "1") === 0;
          const textOnly = (arch.input_modalities ?? ["text"]).includes("text") && (arch.output_modalities ?? ["text"]).includes("text");
          if (!free || !textOnly) continue;
        }
        const ctx = Number(m.context_length ?? m.context_window ?? 0);
        list.push({ provider, model: id, score: scoreModel(provider, id, ctx) });
      }
    }
  } catch {
    list = [];
  }
  if (provider === "openrouter" && key(provider)) list.push({ provider, model: "openrouter/free", score: -5 });
  list.sort((a, b) => b.score - a.score);
  cache.set(provider, { at: Date.now(), list });
  return list;
}

export async function candidates(): Promise<Candidate[]> {
  const pinned = process.env.LLM_MODEL;
  const all: Candidate[] = [];
  for (const prov of ORDER) {
    if (!key(prov)) continue;
    all.push(...(await discover(prov)).slice(0, 6));
  }
  if (pinned && pinned.includes(":")) {
    const [prov, model] = pinned.split(":", 2);
    if (key(prov)) all.unshift({ provider: prov, model, score: 999 });
  }
  const now = Date.now();
  return all.filter((c) => (blacklist.get(`${c.provider}:${c.model}`) ?? 0) < now).sort((a, b) => b.score - a.score);
}

export function anyKeyConfigured(): boolean {
  return ORDER.some((p) => key(p));
}

/** Which provider keys are present on the server, by environment variable name (values are never exposed). */
export function configuredKeys(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const p of ORDER) out[PROVIDERS[p].keyEnv] = Boolean(key(p));
  return out;
}

export async function chat(messages: Array<{ role: string; content: string }>, opts: { maxTokens?: number; temperature?: number; attempts?: number } = {}): Promise<LLMResult | null> {
  const list = await candidates();
  const dead = new Set<string>();
  let tries = 0;
  for (const c of list) {
    if (dead.has(c.provider)) continue;
    if (tries >= (opts.attempts ?? 4)) break;
    tries++;
    const k = `${c.provider}:${c.model}`;
    try {
      const res = await fetch(`${PROVIDERS[c.provider].base}/chat/completions`, {
        method: "POST",
        headers: headers(c.provider),
        body: JSON.stringify({ model: c.model, messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 600 }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 401 || res.status === 403) {
        dead.add(c.provider);
        continue;
      }
      if (res.status === 429) {
        blacklist.set(k, Date.now() + 5 * 60 * 1000);
        continue;
      }
      if (res.status === 404 || res.status === 400) {
        blacklist.set(k, Date.now() + 24 * 3600 * 1000);
        continue;
      }
      if (!res.ok) {
        blacklist.set(k, Date.now() + 2 * 60 * 1000);
        continue;
      }
      const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = body.choices?.[0]?.message?.content?.trim();
      if (!text) continue;
      return { text, provider: c.provider, model: c.model, label: `${c.provider}:${c.model}` };
    } catch {
      blacklist.set(k, Date.now() + 2 * 60 * 1000);
    }
  }
  return null;
}
