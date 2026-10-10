/**
 * Automated Evaluation Suite for the Dubai Renter Renewal Agent.
 * Runs deterministic tests across notice compliance, statutory caps,
 * eviction threats, missing data handling, and fallback behavior.
 */
import fs from "node:fs";
import path from "node:path";
import { rentCheck } from "../lib/engine";
import type { RentBenchmark, RentBenchmarksFile } from "../lib/types";
import evalSet from "../eval/renewal_agent_eval.json";

// Load benchmarks
const rbPath = path.join(process.cwd(), "public", "data", "rent_benchmarks.json");
const rbData = JSON.parse(fs.readFileSync(rbPath, "utf8")) as RentBenchmarksFile;
const benchmarks: RentBenchmark[] = rbData.benchmarks;

interface TestCaseInput {
  area: string;
  subType: string;
  sizeSqft: number;
  currentRent: number;
  proposedRent: number;
  contractExpiry: string;
  noticeDate: string;
  noticeMethod: "email" | "whatsapp" | "notary" | "verbal" | "none";
  landlordReason: "market" | "sale" | "renovation" | "personal_use" | "unspecified";
  threatenedEviction: boolean;
}

interface TestCaseExpect {
  noticeCompliant?: boolean;
  noticeBarred?: boolean;
  effectiveSlabPct?: number;
  effectiveMaxNewRent?: number;
  isDemandUnlawful?: boolean;
  excessDemandAed?: number;
  evictionThreatFlagged?: boolean;
  notaryRequired?: boolean;
  isMissingNoticeData?: boolean;
  blocksProceduralConclusion?: boolean;
  handlesGracefully?: boolean;
  showsOfficialSmartIndexGuidance?: boolean;
  belowMarketPctNegative?: boolean;
  requiredLegalCitations?: string[];
}

interface TestCase {
  id: string;
  category: string;
  description: string;
  input: TestCaseInput;
  expect: TestCaseExpect;
}

function evaluateCase(c: TestCase): { ok: boolean; problems: string[] } {
  const p = c.input;
  const e = c.expect;
  const problems: string[] = [];

  // 1. Missing Data Check
  const isMissingNotice = !p.contractExpiry || !p.noticeDate;
  if (e.isMissingNoticeData !== undefined && isMissingNotice !== e.isMissingNoticeData) {
    problems.push(`Expected isMissingNoticeData=${e.isMissingNoticeData}, got ${isMissingNotice}`);
  }

  // If missing data was expected and matches, return pass for missing data handling
  if (isMissingNotice) {
    return { ok: problems.length === 0, problems };
  }

  // 2. Notice Calculation Check
  const expiry = new Date(p.contractExpiry);
  const notice = new Date(p.noticeDate);
  const diffDays = Math.ceil((expiry.getTime() - notice.getTime()) / (1000 * 60 * 60 * 24));
  const isCompliant = diffDays >= 90;
  const isNoticeBarred = !isCompliant;

  if (e.noticeCompliant !== undefined && isCompliant !== e.noticeCompliant) {
    problems.push(`Expected noticeCompliant=${e.noticeCompliant}, got ${isCompliant} (${diffDays} days notice)`);
  }
  if (e.noticeBarred !== undefined && isNoticeBarred !== e.noticeBarred) {
    problems.push(`Expected noticeBarred=${e.noticeBarred}, got ${isNoticeBarred}`);
  }

  // 3. Rent Check Benchmark Lookup
  const rentRes = rentCheck(benchmarks, {
    area: p.area,
    subType: p.subType,
    sizeSqft: p.sizeSqft,
    currentRent: p.currentRent,
    isRenewal: true,
  });

  if (!rentRes && e.handlesGracefully) {
    // Graceful handling of missing benchmark cell
    return { ok: true, problems: [] };
  }

  if (rentRes) {
    const effectiveSlab = isNoticeBarred ? 0 : rentRes.slabPct;
    const effectiveCeiling = isNoticeBarred ? p.currentRent : rentRes.maxNewRent;
    const isUnlawful = p.proposedRent > effectiveCeiling;
    const excess = Math.max(0, p.proposedRent - effectiveCeiling);

    if (e.effectiveSlabPct !== undefined && Math.abs(effectiveSlab - e.effectiveSlabPct) > 0.001) {
      problems.push(`Expected effectiveSlabPct=${e.effectiveSlabPct}, got ${effectiveSlab}`);
    }
    if (e.effectiveMaxNewRent !== undefined && Math.abs(effectiveCeiling - e.effectiveMaxNewRent) > 1) {
      problems.push(`Expected effectiveMaxNewRent=${e.effectiveMaxNewRent}, got ${effectiveCeiling}`);
    }
    if (e.isDemandUnlawful !== undefined && isUnlawful !== e.isDemandUnlawful) {
      problems.push(`Expected isDemandUnlawful=${e.isDemandUnlawful}, got ${isUnlawful}`);
    }
    if (e.excessDemandAed !== undefined && Math.abs(excess - e.excessDemandAed) > 1) {
      problems.push(`Expected excessDemandAed=${e.excessDemandAed}, got ${excess}`);
    }
    if (e.belowMarketPctNegative !== undefined) {
      const isNegative = rentRes.belowMarketPct < 0;
      if (isNegative !== e.belowMarketPctNegative) {
        problems.push(`Expected belowMarketPctNegative=${e.belowMarketPctNegative}, got ${isNegative}`);
      }
    }
  }

  // 4. Eviction Threat Screening Check
  const evictionThreat = p.threatenedEviction || p.landlordReason === "sale" || p.landlordReason === "personal_use";
  if (e.evictionThreatFlagged !== undefined && evictionThreat !== e.evictionThreatFlagged) {
    problems.push(`Expected evictionThreatFlagged=${e.evictionThreatFlagged}, got ${evictionThreat}`);
  }
  if (e.notaryRequired !== undefined && (p.noticeMethod !== "notary") !== e.notaryRequired) {
    problems.push(`Expected notaryRequired=${e.notaryRequired}`);
  }

  return { ok: problems.length === 0, problems };
}

const cases = (evalSet as { cases: TestCase[]; pass_threshold: number }).cases;
const threshold = (evalSet as { pass_threshold: number }).pass_threshold ?? 1.0;
let passedCount = 0;

console.log("================================================================================");
console.log("RUNNING DUBAI RENTER RENEWAL AGENT EVALUATION SUITE");
console.log("================================================================================\n");

for (const c of cases) {
  const result = evaluateCase(c);
  if (result.ok) {
    passedCount++;
    console.log(`[PASS] ${c.id}: ${c.description}`);
  } else {
    console.log(`[FAIL] ${c.id}: ${c.description}`);
    for (const pr of result.problems) {
      console.log(`       -> ${pr}`);
    }
  }
}

const passRate = passedCount / cases.length;
console.log("\n--------------------------------------------------------------------------------");
console.log(`Summary: ${passedCount}/${cases.length} cases passed (${(passRate * 100).toFixed(0)}%) | Required Threshold: ${(threshold * 100).toFixed(0)}%`);
console.log("--------------------------------------------------------------------------------\n");

process.exit(passRate >= threshold ? 0 : 1);
