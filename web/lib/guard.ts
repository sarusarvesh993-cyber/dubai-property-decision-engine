/**
 * Number guard for model-written answers.
 *
 * The model is asked to rewrite a rules-based answer using only the numbers in the facts block.
 * This check enforces that instruction: every number in the candidate text must also appear in the
 * allowed sources (facts JSON, the rules answer and the question). A few conversions the model is
 * likely to make are tolerated: thousands separators, "1.5 million" for 1,500,000, "90k" for 90,000,
 * a share written as a percentage (0.22 written as 22%), and small integers up to 12 that are used
 * for counting ("two communities", "12 weeks", "6 months").
 */

const NUM_RE = /\d[\d,]*(?:\.\d+)?/g;
const SCALED_RE = /(\d[\d,]*(?:\.\d+)?)\s*(billion|bn|million|mn|m|thousand|k)\b/gi;

function canon(value: number): string {
  if (!Number.isFinite(value)) return "nan";
  return String(Math.round(value * 100) / 100);
}

function toNumber(token: string): number {
  return Number(token.replace(/,/g, ""));
}

export function allowedNumbers(sources: string[]): Set<string> {
  const out = new Set<string>();
  for (const src of sources) {
    for (const m of src.matchAll(NUM_RE)) {
      const v = toNumber(m[0]);
      if (!Number.isFinite(v)) continue;
      out.add(canon(v));
      if (Math.abs(v) >= 100) out.add(canon(Math.round(v))); // 1,640.4 written as 1,640
      if (Math.abs(v) <= 1) out.add(canon(v * 100)); // shares quoted as percentages
      if (Math.abs(v) >= 1000) {
        out.add(canon(v / 1000)); // 90,000 written as 90k
        out.add(canon(v / 1_000_000)); // 1,500,000 written as 1.5 million
        out.add(canon(v / 1_000_000_000)); // 11,660,000,000 written as 11.66 bn
        out.add(canon(Math.round(v / 1000) * 1000)); // light rounding to the nearest thousand
      }
    }
  }
  return out;
}

/** Returns the list of numbers in `candidate` that do not appear in the allowed set (empty list = passes). */
export function unsupportedNumbers(candidate: string, sources: string[]): string[] {
  const allowed = allowedNumbers(sources);
  const scaled = new Map<string, number>();
  for (const m of candidate.matchAll(SCALED_RE)) {
    const unit = m[2].toLowerCase();
    const factor = unit === "billion" || unit === "bn" ? 1_000_000_000 : unit === "thousand" || unit === "k" ? 1000 : 1_000_000;
    scaled.set(m[1], toNumber(m[1]) * factor);
  }
  const bad: string[] = [];
  for (const m of candidate.matchAll(NUM_RE)) {
    const tok = m[0];
    const v = toNumber(tok);
    if (!Number.isFinite(v)) continue;
    const after = candidate.slice((m.index ?? 0) + tok.length, (m.index ?? 0) + tok.length + 2);
    const isPercent = /^\s?%/.test(after) || /^\s?percent/i.test(candidate.slice((m.index ?? 0) + tok.length, (m.index ?? 0) + tok.length + 9));
    // Small whole numbers are fine for counting ("two of the 6 cells", "12 weeks") but not as percentages.
    const countingWord = Number.isInteger(v) && v >= 0 && v <= 12 && !isPercent;
    const ok = countingWord || allowed.has(canon(v)) || (scaled.has(tok) && allowed.has(canon(scaled.get(tok) as number)));
    if (!ok) bad.push(tok);
  }
  return bad;
}
