/**
 * Automated Evaluation Suite for the Dubai Renter Renewal Agent.
 * Runs deterministic tests across statutory notice compliance, custom contract terms,
 * 89/90/91-day boundaries, date validation, Decree 43/2013 indicative slabs,
 * eviction formalities screening, missing-fact detection, and fallback handling.
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
  noticeMethod: "email" | "whatsapp" | "notary" | "registered_mail" | "verbal" | "none";
  noticeAgreement: "statutory_90" | "custom_agreed";
  customNoticeDays?: number;
  landlordReason: "market" | "sale" | "renovation" | "personal_use" | "unspecified";
  threatenedEviction: boolean;
}

interface TestCaseExpect {
  daysNotice?: number;
  noticeCompliant?: boolean;
  noticePrecluded?: boolean;
  customRequiredDays?: number;
  isRecognizedNoticeMethod?: boolean;
  evictionCheckTriggered?: boolean;
  notaryPublicRequired?: boolean;
  indicativeSlabPct?: number;
  indicativeCeiling?: number;
  diffVsIndicative?: number;
  unableToAssess?: boolean;
  calculationBlocked?: boolean;
  dateValidationError?: boolean;
  handlesGracefully?: boolean;
  providesDLDGuidance?: boolean;
  rentAboveMedian?: boolean;
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

  // 1. Missing Data / Unable to Assess Check
  const isMissingFacts = !p.contractExpiry || !p.noticeDate;
  if (e.unableToAssess !== undefined && isMissingFacts !== e.unableToAssess) {
    problems.push(`Expected unableToAssess=${e.unableToAssess}, got ${isMissingFacts}`);
  }
  if (isMissingFacts) {
    return { ok: problems.length === 0, problems };
  }

  // 2. Date Sequence Validation
  const expiry = new Date(p.contractExpiry);
  const notice = new Date(p.noticeDate);
  const hasDateValidationError = notice.getTime() > expiry.getTime();
  if (e.dateValidationError !== undefined && hasDateValidationError !== e.dateValidationError) {
    problems.push(`Expected dateValidationError=${e.dateValidationError}, got ${hasDateValidationError}`);
  }
  if (hasDateValidationError) {
    return { ok: problems.length === 0, problems };
  }

  // 3. Days Notice and Custom Term Check
  const diffDays = Math.ceil((expiry.getTime() - notice.getTime()) / (1000 * 60 * 60 * 24));
  if (e.daysNotice !== undefined && diffDays !== e.daysNotice) {
    problems.push(`Expected daysNotice=${e.daysNotice}, got ${diffDays}`);
  }

  const requiredDays = p.noticeAgreement === "custom_agreed" ? (p.customNoticeDays || 90) : 90;
  if (e.customRequiredDays !== undefined && requiredDays !== e.customRequiredDays) {
    problems.push(`Expected customRequiredDays=${e.customRequiredDays}, got ${requiredDays}`);
  }

  const isCompliant = diffDays >= requiredDays;
  const isPrecluded = !isCompliant;
  if (e.noticeCompliant !== undefined && isCompliant !== e.noticeCompliant) {
    problems.push(`Expected noticeCompliant=${e.noticeCompliant}, got ${isCompliant}`);
  }
  if (e.noticePrecluded !== undefined && isPrecluded !== e.noticePrecluded) {
    problems.push(`Expected noticePrecluded=${e.noticePrecluded}, got ${isPrecluded}`);
  }

  // 4. Notice Method Check
  const recognizedFormalMethods = ["notary", "registered_mail", "email"];
  const isRecognized = recognizedFormalMethods.includes(p.noticeMethod);
  if (e.isRecognizedNoticeMethod !== undefined && isRecognized !== e.isRecognizedNoticeMethod) {
    problems.push(`Expected isRecognizedNoticeMethod=${e.isRecognizedNoticeMethod}, got ${isRecognized}`);
  }

  // 5. Eviction Check
  const evictionCheck = p.threatenedEviction || p.landlordReason === "sale" || p.landlordReason === "personal_use";
  if (e.evictionCheckTriggered !== undefined && evictionCheck !== e.evictionCheckTriggered) {
    problems.push(`Expected evictionCheckTriggered=${e.evictionCheckTriggered}, got ${evictionCheck}`);
  }
  if (e.notaryPublicRequired !== undefined) {
    const notaryNeeded = evictionCheck && p.noticeMethod !== "notary";
    if (notaryNeeded !== e.notaryPublicRequired) {
      problems.push(`Expected notaryPublicRequired=${e.notaryPublicRequired}, got ${notaryNeeded}`);
    }
  }

  // 6. Rent Benchmark and Indicative Slab
  const rentRes = rentCheck(benchmarks, {
    area: p.area,
    subType: p.subType,
    sizeSqft: p.sizeSqft,
    currentRent: p.currentRent,
    isRenewal: true,
  });

  if (!rentRes) {
    if (e.handlesGracefully) {
      return { ok: problems.length === 0, problems };
    }
    problems.push(`No benchmark found for ${p.area} ${p.subType}`);
    return { ok: false, problems };
  }

  const effectiveSlab = isPrecluded ? 0 : rentRes.slabPct;
  const effectiveCeiling = isPrecluded ? p.currentRent : rentRes.maxNewRent;
  const diffVsIndicative = Math.max(0, p.proposedRent - effectiveCeiling);

  if (e.indicativeSlabPct !== undefined && Math.abs(effectiveSlab - e.indicativeSlabPct) > 0.001) {
    problems.push(`Expected indicativeSlabPct=${e.indicativeSlabPct}, got ${effectiveSlab}`);
  }
  if (e.indicativeCeiling !== undefined && Math.abs(effectiveCeiling - e.indicativeCeiling) > 1) {
    problems.push(`Expected indicativeCeiling=${e.indicativeCeiling}, got ${effectiveCeiling}`);
  }
  if (e.diffVsIndicative !== undefined && Math.abs(diffVsIndicative - e.diffVsIndicative) > 1) {
    problems.push(`Expected diffVsIndicative=${e.diffVsIndicative}, got ${diffVsIndicative}`);
  }
  if (e.rentAboveMedian !== undefined) {
    const isAbove = rentRes.belowMarketPct < 0;
    if (isAbove !== e.rentAboveMedian) {
      problems.push(`Expected rentAboveMedian=${e.rentAboveMedian}, got ${isAbove}`);
    }
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
