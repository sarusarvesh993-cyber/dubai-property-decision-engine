// Pure decision logic shared by the calculators (runs in the browser, no server needed).
import type { PriceBand, RentBenchmark } from "./types";

export type FairPriceInput = {
  area: string;
  subType: string;
  rooms: string;
  isOffplan: boolean;
  sizeSqft: number;
  askingPrice: number;
  project?: string;
};

export type FairPriceResult = {
  band: PriceBand;
  levelLabel: string;
  confidence: "high" | "medium" | "low";
  fairLow: number;
  fairMid: number;
  fairHigh: number;
  askingPpsqft: number;
  percentile: number; // 0..100 position of the asking price within the cell distribution
  verdict: "well below market" | "below market" | "in line with market" | "above market" | "well above market";
  gapPct: number; // asking vs median, +/- share
};

const LEVEL_LABEL: Record<PriceBand["level"], string> = {
  L0: "same project, type & bedrooms",
  L1: "same community, type & bedrooms",
  L2: "same community & type",
  L3: "same community (all types)",
};

/** Pick the most specific benchmark cell that exists. */
export function selectBand(bands: PriceBand[], inp: FairPriceInput): PriceBand | null {
  const off = inp.isOffplan ? 1 : 0;
  const order: Array<(b: PriceBand) => boolean> = [
    (b) => b.level === "L0" && !!inp.project && b.project === inp.project && b.area === inp.area && b.sub_type === inp.subType && b.rooms === inp.rooms && b.is_offplan === off,
    (b) => b.level === "L1" && b.area === inp.area && b.sub_type === inp.subType && b.rooms === inp.rooms && b.is_offplan === off,
    (b) => b.level === "L2" && b.area === inp.area && b.sub_type === inp.subType && b.is_offplan === off,
    (b) => b.level === "L3" && b.area === inp.area && b.is_offplan === off,
    // last resort: ignore the ready/off-plan split
    (b) => b.level === "L2" && b.area === inp.area && b.sub_type === inp.subType,
    (b) => b.level === "L3" && b.area === inp.area,
  ];
  for (const pred of order) {
    const hit = bands.find(pred);
    if (hit) return hit;
  }
  return null;
}

/** Piece-wise linear percentile of x given p10/p25/p50/p75/p90 anchors. */
export function percentileOf(x: number, b: PriceBand): number {
  const pts: Array<[number, number]> = [
    [b.p10, 10],
    [b.p25, 25],
    [b.median, 50],
    [b.p75, 75],
    [b.p90, 90],
  ];
  if (x <= pts[0][0]) return Math.max(0, 10 * (x / pts[0][0]));
  if (x >= pts[4][0]) return Math.min(100, 90 + 10 * Math.min(1, (x - pts[4][0]) / Math.max(1, pts[4][0] - pts[3][0])));
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, p0] = pts[i];
    const [x1, p1] = pts[i + 1];
    if (x >= x0 && x <= x1) return x1 === x0 ? p0 : p0 + ((x - x0) / (x1 - x0)) * (p1 - p0);
  }
  return 50;
}

export function fairPrice(bands: PriceBand[], inp: FairPriceInput): FairPriceResult | null {
  const band = selectBand(bands, inp);
  if (!band || inp.sizeSqft <= 0) return null;
  const askingPpsqft = inp.askingPrice / inp.sizeSqft;
  const pct = percentileOf(askingPpsqft, band);
  const gapPct = askingPpsqft / band.median - 1;
  const verdict: FairPriceResult["verdict"] =
    pct < 15 ? "well below market" : pct < 35 ? "below market" : pct <= 65 ? "in line with market" : pct <= 85 ? "above market" : "well above market";
  const confidence: FairPriceResult["confidence"] =
    (band.level === "L0" || band.level === "L1") && band.n >= 20 ? "high" : band.level === "L3" || band.n < 12 ? "low" : "medium";
  return {
    band,
    levelLabel: LEVEL_LABEL[band.level],
    confidence,
    fairLow: band.p25 * inp.sizeSqft,
    fairMid: band.median * inp.sizeSqft,
    fairHigh: band.p75 * inp.sizeSqft,
    askingPpsqft,
    percentile: pct,
    verdict,
    gapPct,
  };
}

// ------------------------------------------------------------------ rents

export const SIZE_BANDS: Array<[number, number, string]> = [
  [0, 40, "<40 sqm"],
  [40, 60, "40-60"],
  [60, 85, "60-85"],
  [85, 120, "85-120"],
  [120, 170, "120-170"],
  [170, 250, "170-250"],
  [250, 400, "250-400"],
  [400, 1e9, "400+"],
];

export function sizeBandOf(sizeSqm: number): string {
  for (const [lo, hi, label] of SIZE_BANDS) if (sizeSqm >= lo && sizeSqm < hi) return label;
  return "400+";
}

export type RentInput = { area: string; subType: string; sizeSqft: number; currentRent: number; isRenewal: boolean };

export type RentResult = {
  bench: RentBenchmark;
  levelLabel: string;
  marketMedian: number;
  marketLow: number;
  marketHigh: number;
  belowMarketPct: number; // positive = current rent is below market by this share
  slabPct: number; // max permitted increase under Decree 43/2013 slabs
  maxNewRent: number;
  verdictText: string;
};

const RENT_LEVEL_LABEL: Record<RentBenchmark["level"], string> = {
  R1: "same community, type, size band & contract type",
  R2: "same community, type & size band",
  R3: "same community & type (all sizes)",
};

/** Decree 43 of 2013 slabs: permitted increase depends on how far the current rent sits below market. */
export function reraSlab(belowMarketPct: number): number {
  if (belowMarketPct <= 0.10) return 0;
  if (belowMarketPct <= 0.20) return 0.05;
  if (belowMarketPct <= 0.30) return 0.10;
  if (belowMarketPct <= 0.40) return 0.15;
  return 0.20;
}

export function selectRentBench(benchmarks: RentBenchmark[], inp: RentInput): RentBenchmark | null {
  const band = sizeBandOf(inp.sizeSqft / 10.7639);
  const ren = inp.isRenewal ? 1 : 0;
  const order: Array<(b: RentBenchmark) => boolean> = [
    (b) => b.level === "R1" && b.area === inp.area && b.sub_type === inp.subType && b.size_band === band && b.is_renewal === ren,
    (b) => b.level === "R2" && b.area === inp.area && b.sub_type === inp.subType && b.size_band === band,
    (b) => b.level === "R3" && b.area === inp.area && b.sub_type === inp.subType,
  ];
  for (const pred of order) {
    const hit = benchmarks.find(pred);
    if (hit) return hit;
  }
  return null;
}

export function rentCheck(benchmarks: RentBenchmark[], inp: RentInput): RentResult | null {
  const bench = selectRentBench(benchmarks, inp);
  if (!bench || inp.currentRent <= 0) return null;
  // For R3 (no size split) scale the per-sqft median to the tenant's unit size.
  const marketMedian = bench.level === "R3" ? bench.median_rent_psqft * inp.sizeSqft : bench.median;
  const scale = bench.level === "R3" ? marketMedian / bench.median : 1;
  const marketLow = bench.p25 * scale;
  const marketHigh = bench.p75 * scale;
  const belowMarketPct = 1 - inp.currentRent / marketMedian;
  const slabPct = reraSlab(belowMarketPct);
  const maxNewRent = inp.currentRent * (1 + slabPct);
  const verdictText =
    belowMarketPct <= 0.10
      ? belowMarketPct < -0.10
        ? "Your rent is above the market median — no increase is permitted and you have a case to negotiate down."
        : "Your rent is within 10% of the market median — no increase is permitted at renewal."
      : `Your rent is ${(belowMarketPct * 100).toFixed(0)}% below the market median — the landlord may raise it by at most ${(slabPct * 100).toFixed(0)}%.`;
  return { bench, levelLabel: RENT_LEVEL_LABEL[bench.level], marketMedian, marketLow, marketHigh, belowMarketPct, slabPct, maxNewRent, verdictText };
}
