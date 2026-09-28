/**
 * Evaluation harness for the Ask the data copilot (parse, retrieve, compose; no model call).
 *
 *   npm run eval:ask            prints one line per case and the pass rate
 *   npm run eval:ask -- --json  machine-readable output
 *
 * Exits with code 1 when the pass rate is below eval/ask_eval.json.pass_threshold (0.8, the
 * "definition of done" for the copilot in the project brief).
 */
import { composeAnswer, parseQuestion, retrieve } from "../lib/ask";
import evalSet from "../eval/ask_eval.json";

type Expect = {
  areas?: string[];
  subType?: string;
  rooms?: string;
  sizeSqft?: number;
  price?: number;
  rent?: number;
  offplan?: boolean;
  intents?: string[];
  facts?: Array<"fair_price" | "rent_check">;
  answer?: string[];
  answer_any?: string[];
};
type Case = { q: string; expect: Expect };

function check(c: Case): { ok: boolean; problems: string[]; answer: string } {
  const p = parseQuestion(c.q);
  const f = retrieve(p);
  const answer = composeAnswer(p, f);
  const e = c.expect;
  const problems: string[] = [];
  if (e.areas && JSON.stringify(p.areas) !== JSON.stringify(e.areas)) problems.push(`areas ${JSON.stringify(p.areas)} != ${JSON.stringify(e.areas)}`);
  if (e.subType !== undefined && p.subType !== e.subType) problems.push(`subType ${p.subType} != ${e.subType}`);
  if (e.rooms !== undefined && p.rooms !== e.rooms) problems.push(`rooms ${p.rooms} != ${e.rooms}`);
  if (e.sizeSqft !== undefined && Math.abs((p.sizeSqft ?? -1) - e.sizeSqft) > 1) problems.push(`sizeSqft ${p.sizeSqft} != ${e.sizeSqft}`);
  if (e.price !== undefined && p.price !== e.price) problems.push(`price ${p.price} != ${e.price}`);
  if (e.rent !== undefined && p.rent !== e.rent) problems.push(`rent ${p.rent} != ${e.rent}`);
  if (e.offplan !== undefined && p.offplan !== e.offplan) problems.push(`offplan ${p.offplan} != ${e.offplan}`);
  for (const i of e.intents ?? []) if (!p.intents.includes(i as never)) problems.push(`intent ${i} missing (got ${p.intents.join(",")})`);
  for (const k of e.facts ?? []) {
    const a = f.areas[0] as Record<string, unknown> | undefined;
    if (!a || !a[k]) problems.push(`facts.${k} missing`);
  }
  for (const s of e.answer ?? []) if (!answer.includes(s)) problems.push(`answer lacks "${s}"`);
  if (e.answer_any && !e.answer_any.some((s) => answer.includes(s))) problems.push(`answer lacks any of ${JSON.stringify(e.answer_any)}`);
  if (/[\u2014\u2013\u2192\u2190\u2265\u2264\u2026\u00b7\u00f7]/.test(answer)) problems.push("answer contains a banned typographic character");
  return { ok: problems.length === 0, problems, answer };
}

const cases = (evalSet as { cases: Case[]; pass_threshold: number }).cases;
const threshold = (evalSet as { pass_threshold: number }).pass_threshold ?? 0.8;
const results = cases.map((c) => ({ q: c.q, ...check(c) }));
const passed = results.filter((r) => r.ok).length;
const rate = passed / results.length;

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ passed, total: results.length, rate, results: results.map((r) => ({ q: r.q, ok: r.ok, problems: r.problems })) }, null, 2));
} else {
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.q}${r.ok ? "" : "\n      " + r.problems.join("\n      ")}`);
  console.log(`\n${passed}/${results.length} cases passed (${(rate * 100).toFixed(0)}%), threshold ${(threshold * 100).toFixed(0)}%`);
}
process.exit(rate >= threshold ? 0 : 1);
