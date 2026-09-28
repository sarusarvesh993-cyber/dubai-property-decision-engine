import { composeAnswer, parseQuestion, retrieve } from "@/lib/ask";
import { unsupportedNumbers } from "@/lib/guard";
import { anyKeyConfigured, chat } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Best-effort rate limit per serverless instance (free tiers behind this are small).
const hits = new Map<string, number[]>();
const LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;

function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > LIMIT;
}

const SYSTEM = `You are the assistant of the Dubai Property Decision Engine, a public analytics site built on registered Dubai Land Department data.
Answer the user's question using ONLY the numbers in the FACTS JSON. Never invent, estimate or round beyond what is given.
If the facts do not contain what was asked, say so plainly and offer what is available.
Write 90 to 170 words in plain sentences (no headings, no bullet symbols, no markdown). Quote AED amounts and percentages exactly, mention sample sizes (n) and the as-of date once.
End with one short sentence: "Indicative, based on registered DLD data; not a valuation or legal advice."`;

async function answer(q: string, ip: string) {
  const question = q.trim().slice(0, 300);
  if (question.length < 3) return Response.json({ error: "Please type a question." }, { status: 400 });
  if (limited(ip)) return Response.json({ error: "Too many questions in a short time. Please wait a few minutes." }, { status: 429 });
  const parsed = parseQuestion(question);
  const facts = retrieve(parsed);
  const rules = composeAnswer(parsed, facts);
  let text = rules;
  let source = anyKeyConfigured() ? "rules (model unavailable)" : "rules (no model key configured)";
  if (anyKeyConfigured()) {
    try {
      const r = await chat(
        [
          { role: "system", content: SYSTEM },
          { role: "user", content: `QUESTION: ${question}\n\nFACTS: ${JSON.stringify(facts)}\n\nA deterministic draft you may improve but must stay consistent with: ${rules}` },
        ],
        { maxTokens: 500, temperature: 0.2 },
      );
      if (r && r.text.trim().length > 40) {
        // Every number in the model's reply must already exist in the facts, the rules answer or the question.
        const bad = unsupportedNumbers(r.text, [JSON.stringify(facts), rules, question]);
        if (bad.length === 0) {
          text = r.text.trim();
          source = r.label;
        } else {
          source = `rules (model reply failed the number check: ${bad.slice(0, 3).join(", ")})`;
        }
      }
    } catch {
      /* fall back to rules */
    }
  }
  return Response.json({ question, answer: text, source, parsed, facts });
}

function ipOf(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

export async function POST(req: Request) {
  let body: { q?: string } = {};
  try {
    body = (await req.json()) as { q?: string };
  } catch {
    body = {};
  }
  return answer(body.q ?? "", ipOf(req));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return answer(url.searchParams.get("q") ?? "", ipOf(req));
}
