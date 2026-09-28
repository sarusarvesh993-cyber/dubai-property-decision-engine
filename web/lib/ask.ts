// Question understanding, fact retrieval and a rules-based answer for the "Ask the data" feature.
// Everything here is deterministic. A language model (lib/llm.ts) may rephrase the answer, but it only
// ever sees the facts assembled below, so it cannot introduce numbers that are not in the data.
import { fairPrice, rentCheck, selectBand, selectRentBench, sizeBandOf, type FairPriceResult, type RentResult } from "./engine";
import { DATASET } from "./dataset";
import type { AreaRow, PriceBand, RentBenchmark } from "./types";

export type Intent = "price" | "rent" | "yield" | "trend" | "rank" | "overview" | "anomaly" | "compare" | "profile";

export type Parsed = {
  question: string;
  areas: string[];
  subType: string | null;
  rooms: string | null;
  offplan: boolean | null;
  sizeSqft: number | null;
  price: number | null;
  rent: number | null;
  intents: Intent[];
};

export type AreaFacts = {
  area: string;
  summary: Partial<AreaRow>;
  price_cells: Array<Pick<PriceBand, "level" | "project" | "sub_type" | "rooms" | "is_offplan" | "n" | "p25" | "median" | "p75" | "median_size_sqft" | "median_price">>;
  rent_cells: Array<Pick<RentBenchmark, "level" | "sub_type" | "size_band" | "is_renewal" | "n" | "p25" | "median" | "p75" | "median_rent_psqft">>;
  fair_price?: Omit<FairPriceResult, "band"> & { cell_n: number; cell_median_ppsqft: number };
  rent_check?: Omit<RentResult, "bench"> & { cell_n: number };
};

export type Facts = {
  as_of: string;
  coverage_from: string;
  windows: { price_bands_months: number; rent_months: number; min_cell_n: number };
  market?: Record<string, unknown>;
  areas: AreaFacts[];
  anomalies?: { flagged_60d: number; examples: Array<Record<string, unknown>> };
  suggestions?: string[];
  notes: string[];
};

const ALIASES: Record<string, string> = {
  jvc: "Jumeirah Village Circle",
  "jumeirah village circle": "Jumeirah Village Circle",
  jlt: "Jumeirah Lakes Towers",
  "jumeirah lake towers": "Jumeirah Lakes Towers",
  jvt: "Jumeirah Village Triangle",
  downtown: "Burj Khalifa",
  "downtown dubai": "Burj Khalifa",
  "burj khalifa": "Burj Khalifa",
  marina: "Dubai Marina",
  "marsa dubai": "Dubai Marina",
  jbr: "Jumeirah Beach Residence",
  palm: "Palm Jumeirah",
  "the palm": "Palm Jumeirah",
  "creek harbour": "Dubai Creek Harbour",
  "creek harbor": "Dubai Creek Harbour",
  "hills estate": "Dubai Hills",
  "dubai hills estate": "Dubai Hills",
  akoya: "Damac Hills",
  "damac hills 2": "Madinat Hind 4",
  "akoya oxygen": "Madinat Hind 4",
  dso: "Silicon Oasis",
  "dubai silicon oasis": "Silicon Oasis",
  "sports city": "Dubai Sports City",
  furjan: "Al Furjan",
  "mbr city": "Al Merkadh",
  "mohammed bin rashid city": "Al Merkadh",
  "sobha hartland": "Sobha Heartland",
  "arabian ranches": "Arabian Ranches I",
  "international city": "International City Ph 1",
  dip: "Dubai Investment Park First",
  "investment park": "Dubai Investment Park First",
  tecom: "Barsha Heights",
  greens: "The Greens",
  "al barsha": "Al Barsha First",
  dubailand: "Dubai Land Residence Complex",
  dlrc: "Dubai Land Residence Complex",
  "production city": "Dubai Production City",
  impz: "Dubai Production City",
  "studio city": "Dubai Studio City",
  "science park": "Dubai Science Park",
  "jumeirah golf estates": "Jumeirah Golf",
  jge: "Jumeirah Golf",
  "emirates living": "Emirate Living",
  springs: "Emirate Living",
  meadows: "Emirate Living",
  "the lakes": "Emirate Living",
  "healthcare city": "Dubai Healthcare City - Phase 2",
  "al jaddaf": "Jaddaf Waterfront",
  "expo city": "Dubai South",
};

const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

function moneyValues(q: string): number[] {
  const out: number[] = [];
  const re = /(?:aed|dhs?|dirhams?)?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(million|mn|m|k|thousand|lakh|crore)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) {
    const raw = m[1].replace(/,/g, "");
    if (!raw) continue;
    let v = parseFloat(raw);
    const unit = (m[2] || "").toLowerCase();
    if (unit === "million" || unit === "mn" || unit === "m") v *= 1e6;
    else if (unit === "k" || unit === "thousand") v *= 1e3;
    else if (unit === "lakh") v *= 1e5;
    else if (unit === "crore") v *= 1e7;
    // ignore things that are obviously not money (years, bedroom counts, percentages, sizes)
    const after = q.slice(m.index + m[0].length, m.index + m[0].length + 12).toLowerCase();
    if (/^\s*(%|percent|sq|ft|bed|br|b\/r|bhk|weeks?|months?|days?|years?)/.test(after)) continue;
    if (v >= 1900 && v <= 2100 && !unit) continue;
    if (v >= 5000) out.push(Math.round(v));
  }
  return out;
}

export function parseQuestion(question: string): Parsed {
  const q = " " + question.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim() + " ";
  // punctuation-free copy used for community matching ("in Business Bay?" must still match)
  const qa = " " + q.replace(/[^a-z0-9&/+\- ]/g, " ").replace(/\s+/g, " ").trim() + " ";
  const allAreas = DATASET.areas.areas.map((a) => a.area);
  const districtMap = new Map(DATASET.crosswalk.mappings.map((m) => [m.district.toLowerCase(), m.community]));

  // communities: longest matches first, keep order of appearance
  const candidates: Array<{ pos: number; len: number; area: string }> = [];
  const tryMatch = (needle: string, area: string) => {
    const n = " " + needle.toLowerCase().replace(/[^a-z0-9&/+\- ]/g, " ").replace(/\s+/g, " ").trim() + " ";
    const pos = qa.indexOf(n);
    if (pos >= 0) candidates.push({ pos, len: needle.length, area });
  };
  for (const a of allAreas) tryMatch(a, a);
  for (const [alias, area] of Object.entries(ALIASES)) if (allAreas.includes(area)) tryMatch(alias, area);
  for (const [district, community] of districtMap) if (allAreas.includes(community)) tryMatch(district, community);
  candidates.sort((a, b) => a.pos - b.pos || b.len - a.len);
  const areas: string[] = [];
  const covered: Array<[number, number]> = [];
  for (const c of candidates) {
    if (covered.some(([s, e]) => c.pos >= s && c.pos < e)) continue;
    if (!areas.includes(c.area)) areas.push(c.area);
    covered.push([c.pos, c.pos + c.len + 1]);
    if (areas.length === 3) break;
  }

  let subType: string | null = null;
  if (/\b(villa|townhouse|town house|townhouses|villas)\b/.test(q)) subType = "Villa";
  else if (/\b(office|offices)\b/.test(q)) subType = "Office";
  else if (/\b(shop|retail)\b/.test(q)) subType = "Shop";
  else if (/\bhotel apartment/.test(q)) subType = "Hotel Apartment";
  else if (/\b(flat|flats|apartment|apartments|apt|studio|bed|beds|bedroom|bedrooms|br|bhk|b\/r)\b/.test(q)) subType = "Flat";

  let rooms: string | null = null;
  if (/\bstudio\b/.test(q)) rooms = "Studio";
  else {
    const m = q.match(/\b(\d|one|two|three|four|five|six)\s*-?\s*(bed|beds|bedroom|bedrooms|br|b\/r|bhk)\b/);
    if (m) {
      const n = WORD_NUM[m[1]] ?? parseInt(m[1], 10);
      rooms = n >= 5 ? "5+ B/R" : `${n} B/R`;
    }
  }
  let offplan: boolean | null = null;
  if (/\b(off-plan|offplan|off plan|launch|under construction)\b/.test(q)) offplan = true;
  else if (/\b(ready|secondary|resale|handed over|completed)\b/.test(q)) offplan = false;

  let sizeSqft: number | null = null;
  const sf = q.match(/(\d{1,3}(?:,\d{3})+|\d{2,5}(?:\.\d+)?)\s*(sq\.?\s*ft|sqft|square feet|square foot|ft2|sft)\b/);
  const sm = q.match(/(\d{1,3}(?:,\d{3})+|\d{2,5}(?:\.\d+)?)\s*(sqm|sq\.?\s*m|square met(?:er|re)s?|m2)\b/);
  if (sf) sizeSqft = parseFloat(sf[1].replace(/,/g, ""));
  else if (sm) sizeSqft = Math.round(parseFloat(sm[1]) * 10.7639);

  const intents: Intent[] = [];
  const has = (re: RegExp) => re.test(q);
  const rentish = has(/\b(rent|rental|rents|renew|renewal|landlord|tenant|increase|ejari|lease|leasing)\b/);
  const priceish = has(/\b(price|prices|buy|buying|purchase|fair|worth|asking|cost|costs|value|expensive|cheap|cheaper|sale|sales|sold|per sqft|psf|sqft price|pay)\b/);
  if (rentish) intents.push("rent");
  if (priceish) intents.push("price");
  if (has(/\b(yield|yields|roi|return|returns|investment|invest|income)\b/)) intents.push("yield");
  if (has(/\b(heating|cooling|hot|hottest|trend|trends|trending|growth|growing|rising|falling|momentum|slowing|change|changed|up or down)\b/)) intents.push("trend");
  if (has(/\b(top|best|most|busiest|highest|lowest|cheapest|ranking|rank|which (communities|areas)|where should|where to)\b/)) intents.push("rank");
  if (has(/\b(overview|summary|this week|pulse|what happened|latest)\b/) || (areas.length === 0 && has(/\b(market|how is)\b/))) intents.push("overview");
  if (has(/\b(anomaly|anomalies|suspicious|mispriced|outlier|outliers|unusual)\b/)) intents.push("anomaly");
  if (areas.length >= 2 && has(/\b(vs|versus|compare|compared|or|better)\b/)) intents.push("compare");

  const money = moneyValues(q);
  let price: number | null = null;
  let rent: number | null = null;
  const perYear = has(/\b(per year|per annum|annual|annually|pa|\/yr|yearly|a year)\b/);
  for (const v of money) {
    if ((rentish || perYear) && !priceish && v < 2_000_000) rent = rent ?? v;
    else if (priceish && !rentish) price = price ?? v;
    else if (v >= 250_000) price = price ?? v;
    else rent = rent ?? v;
  }
  if (intents.length === 0) intents.push(areas.length ? "profile" : "overview");
  return { question: question.trim(), areas, subType, rooms, offplan, sizeSqft, price, rent, intents };
}

function pick<T extends object>(o: T, keys: Array<keyof T>): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) out[k] = o[k];
  return out;
}

function suggestions(question: string): string[] {
  const tokens = question.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
  const scored = DATASET.areas.areas.map((a) => {
    const name = a.area.toLowerCase();
    const s = tokens.reduce((acc, t) => acc + (name.includes(t) ? 1 : 0), 0);
    return { area: a.area, s, sales: a.sales_12w };
  });
  return scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s || b.sales - a.sales).slice(0, 5).map((x) => x.area);
}

/** Typical Ejari size band for a bedroom count (used only when no size was given). */
function typicalBandForRooms(rooms: string): string | null {
  switch (rooms) {
    case "Studio":
      return "<40 sqm";
    case "1 B/R":
      return "60-85";
    case "2 B/R":
      return "85-120";
    case "3 B/R":
      return "120-170";
    case "4 B/R":
      return "170-250";
    case "5+ B/R":
      return "250-400";
    default:
      return null;
  }
}

export function retrieve(p: Parsed): Facts {
  const s = DATASET.summary;
  const rows = DATASET.areas.areas;
  const facts: Facts = {
    as_of: s.as_of,
    coverage_from: s.coverage_from,
    windows: { price_bands_months: s.params.sales_months, rent_months: s.params.rent_months, min_cell_n: s.params.min_cell_n },
    areas: [],
    notes: [
      "Registered DLD transactions and Ejari contracts only (not listings).",
      "Benchmarks exclude mortgages, gifts, bulk deals and statistical outliers; cells need at least " + s.params.min_cell_n + " records.",
      "Rent benchmarks use size bands because the public Ejari feed has no bedroom counts.",
    ],
  };
  const wantMarket = p.intents.some((i) => ["overview", "rank", "trend", "yield", "anomaly"].includes(i)) || p.areas.length === 0;
  if (wantMarket) {
    const withChange = rows.filter((a) => a.ppsqft_change_12w !== null && a.n_bench_12w >= s.params.min_cell_n);
    const yieldRows = rows.filter((a) => a.gross_yield_est !== null && (a.n_rent_bench_12w ?? 0) >= 30);
    facts.market = {
      last_4_full_weeks: s.kpi_last4w,
      previous_4_weeks: s.kpi_prev4w,
      rents_last_4_weeks: s.rent_kpi_last4w,
      busiest_communities_12w: [...rows].sort((a, b) => b.sales_12w - a.sales_12w).slice(0, 8).map((a) => pick(a, ["area", "sales_12w", "median_ppsqft_12w", "offplan_share_12w"])),
      heating_12w: [...withChange].sort((a, b) => (b.ppsqft_change_12w ?? 0) - (a.ppsqft_change_12w ?? 0)).slice(0, 6).map((a) => pick(a, ["area", "ppsqft_change_12w", "median_ppsqft_12w", "n_bench_12w"])),
      cooling_12w: [...withChange].sort((a, b) => (a.ppsqft_change_12w ?? 0) - (b.ppsqft_change_12w ?? 0)).slice(0, 6).map((a) => pick(a, ["area", "ppsqft_change_12w", "median_ppsqft_12w", "n_bench_12w"])),
      highest_gross_yield_estimates: [...yieldRows].sort((a, b) => (b.gross_yield_est ?? 0) - (a.gross_yield_est ?? 0)).slice(0, 6).map((a) => pick(a, ["area", "gross_yield_est", "median_rent_12w", "median_ppsqft_12w", "n_rent_bench_12w"])),
      cheapest_by_median_ppsqft: rows.filter((a) => a.n_bench_12w >= 30).sort((a, b) => (a.median_ppsqft_12w ?? 0) - (b.median_ppsqft_12w ?? 0)).slice(0, 6).map((a) => pick(a, ["area", "median_ppsqft_12w", "median_price_12w", "n_bench_12w"])),
      most_expensive_by_median_ppsqft: rows.filter((a) => a.n_bench_12w >= 30).sort((a, b) => (b.median_ppsqft_12w ?? 0) - (a.median_ppsqft_12w ?? 0)).slice(0, 6).map((a) => pick(a, ["area", "median_ppsqft_12w", "median_price_12w", "n_bench_12w"])),
    };
    if (withChange.length === 0) facts.notes.push("Heating/cooling signals need 24 weeks of history and are not available yet.");
  }
  if (p.intents.includes("anomaly")) {
    const an = DATASET.anomalies;
    facts.anomalies = {
      flagged_60d: an.total,
      examples: an.items.filter((x) => p.areas.length === 0 || p.areas.includes(x.area)).slice(0, 5)
        .map((x) => ({ date: x.date, area: x.area, project: x.project, sub_type: x.sub_type, rooms: x.rooms, price_aed: x.price_aed, price_per_sqft: x.price_per_sqft, cell_median_ppsqft: x.cell_median_ppsqft, deviation_pct: x.deviation_pct })),
    };
  }
  for (const area of p.areas) {
    const row = rows.find((a) => a.area === area);
    const af: AreaFacts = { area, summary: row ? pick(row, ["sales_12w", "value_12w", "offplan_share_12w", "mortgages_12w", "n_bench_12w", "median_ppsqft_12w", "median_price_12w", "median_ppsqft_prev_12w", "ppsqft_change_12w", "signal", "rent_contracts_12w", "renewal_share_12w", "n_rent_bench_12w", "median_rent_12w", "median_rent_psqft_12w", "gross_yield_est"]) : {}, price_cells: [], rent_cells: [] };
    const subType = p.subType ?? "Flat";
    const bands = DATASET.priceBands.bands.filter((b) => b.area === area);
    const wantedLevels = p.rooms ? ["L1", "L2", "L3"] : ["L2", "L1", "L3"];
    const matches = bands
      .filter((b) => (p.subType ? b.sub_type === p.subType || b.level === "L3" : true))
      .filter((b) => (p.rooms ? b.rooms === p.rooms || b.level !== "L1" : true))
      .filter((b) => (p.offplan === null ? true : b.is_offplan === (p.offplan ? 1 : 0)))
      .filter((b) => b.level !== "L0")
      .sort((a, b) => wantedLevels.indexOf(a.level) - wantedLevels.indexOf(b.level) || b.n - a.n)
      .slice(0, 4);
    af.price_cells = matches.map((b) => ({ level: b.level, project: b.project, sub_type: b.sub_type, rooms: b.rooms, is_offplan: b.is_offplan, n: b.n, p25: b.p25, median: b.median, p75: b.p75, median_size_sqft: b.median_size_sqft, median_price: b.median_price }));
    const rb = DATASET.rentBenchmarks.benchmarks.filter((b) => b.area === area && (p.subType ? b.sub_type === p.subType : b.sub_type === "Flat" || b.sub_type === "Villa"));
    // Ejari rarely records bedrooms, so rent benchmarks are by size band. With a size we use its band;
    // with only a bedroom count we lead with the band a unit of that size typically falls into.
    const band = p.sizeSqft ? sizeBandOf(p.sizeSqft / 10.7639) : p.rooms ? typicalBandForRooms(p.rooms) : null;
    const rents = rb
      .filter((b) => (band ? b.size_band === band || b.level === "R3" : b.level !== "R1"))
      .sort((a, b) => (a.level === "R2" ? 0 : a.level === "R3" ? 1 : 2) - (b.level === "R2" ? 0 : b.level === "R3" ? 1 : 2) || b.n - a.n)
      .slice(0, band ? 3 : 5);
    if (band && rents.length === 0) {
      // nothing in the typical band: fall back to the best-populated bands
      rents.push(...rb.filter((b) => b.level !== "R1").sort((a, b) => b.n - a.n).slice(0, 5));
    }
    af.rent_cells = rents.map((b) => ({ level: b.level, sub_type: b.sub_type, size_band: b.size_band, is_renewal: b.is_renewal, n: b.n, p25: b.p25, median: b.median, p75: b.p75, median_rent_psqft: b.median_rent_psqft }));
    if (p.price && p.sizeSqft) {
      const r = fairPrice(DATASET.priceBands.bands, { area, subType, rooms: p.rooms ?? "NA", isOffplan: p.offplan ?? false, sizeSqft: p.sizeSqft, askingPrice: p.price });
      if (r) {
        const { band: b, ...rest } = r;
        af.fair_price = { ...rest, cell_n: b.n, cell_median_ppsqft: b.median };
      }
    } else if (p.price && !p.sizeSqft) {
      facts.notes.push("A fair-price verdict needs the unit size in sqft as well as the asking price.");
    }
    if (p.rent && p.sizeSqft) {
      const r = rentCheck(DATASET.rentBenchmarks.benchmarks, { area, subType, sizeSqft: p.sizeSqft, currentRent: p.rent, isRenewal: true });
      if (r) {
        const { bench, ...rest } = r;
        af.rent_check = { ...rest, cell_n: bench.n };
      }
    } else if (p.rent && !p.sizeSqft) {
      facts.notes.push("A renewal-increase check needs the unit size in sqft as well as the current rent.");
    }
    facts.areas.push(af);
  }
  if (p.areas.length === 0 && !p.intents.includes("overview")) {
    const sug = suggestions(p.question);
    if (sug.length) facts.suggestions = sug;
  }
  // keep unused helpers referenced for tree-shaking clarity
  void selectBand;
  void selectRentBench;
  return facts;
}

// ------------------------------------------------------------------ rules-based answer

const aed = (v: number | null | undefined, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? "n/a" : "AED " + v.toLocaleString("en-AE", { maximumFractionDigits: d }));
const int = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? "n/a" : Math.round(v).toLocaleString("en-AE"));
const pct = (v: number | null | undefined, d = 1, signed = false) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  const t = (v * 100).toFixed(d) + "%";
  return signed && v > 0 ? "+" + t : t;
};
const cellName = (c: AreaFacts["price_cells"][number]) =>
  [c.is_offplan ? "off-plan" : "ready", c.rooms && c.rooms !== "NA" ? c.rooms : null, c.sub_type ? c.sub_type.toLowerCase() + "s" : "all types"].filter(Boolean).join(" ");

/** "<40 sqm" becomes "under 40 sqm", "400+" becomes "400 sqm and above", "60-85" becomes "60 to 85 sqm". */
function bandLabel(band: string | null | undefined): string {
  if (!band) return "all sizes";
  const b = band.replace(/sqm/gi, "").trim();
  if (b.startsWith("<")) return `under ${b.slice(1).trim()} sqm`;
  if (b.endsWith("+")) return `${b.slice(0, -1).trim()} sqm and above`;
  return `${b.replace("-", " to ")} sqm`;
}

export function composeAnswer(p: Parsed, f: Facts): string {
  const out: string[] = [];
  const m = f.market as Record<string, Array<Record<string, number | string | null>>> & { last_4_full_weeks?: Record<string, number> | null; previous_4_weeks?: Record<string, number> | null; rents_last_4_weeks?: Record<string, number> | null } | undefined;

  for (const a of f.areas) {
    const s = a.summary;
    const parts: string[] = [];
    if (a.fair_price) {
      const r = a.fair_price;
      parts.push(`${aed(p.price)} for ${int(p.sizeSqft)} sqft in ${a.area} works out at ${int(r.askingPpsqft)} AED/sqft, which is ${r.verdict} (percentile ${r.percentile.toFixed(0)} against ${r.cell_n} comparable registered sales, ${r.levelLabel}; median ${int(r.cell_median_ppsqft)} AED/sqft). The p25 to p75 range for this size is ${aed(r.fairLow)} to ${aed(r.fairHigh)}; the market-median price is ${aed(r.fairMid)}. Confidence: ${r.confidence}.`);
    }
    if (a.rent_check) {
      const r = a.rent_check;
      parts.push(`${r.verdictText} Comparable registered rents: median ${aed(r.marketMedian)} (${r.cell_n} contracts, ${r.levelLabel}; typical range ${aed(r.marketLow)} to ${aed(r.marketHigh)}). Ceiling for the new rent: ${aed(r.maxNewRent)}. The official RERA calculator is the binding reference.`);
    }
    const wantsPrice = p.intents.includes("price") || p.intents.includes("profile") || p.intents.includes("compare");
    const wantsRent = p.intents.includes("rent") || p.intents.includes("profile") || p.intents.includes("compare");
    if (wantsPrice && !a.fair_price) {
      if (a.price_cells.length) {
        const c = a.price_cells[0];
        parts.push(`Registered sales of ${cellName(c)} in ${a.area} over the last ${f.windows.price_bands_months} months: median ${int(c.median)} AED/sqft (p25 ${int(c.p25)} to p75 ${int(c.p75)}, ${c.n} sales). A typical unit in that group is ${int(c.median_size_sqft)} sqft at ${aed(c.median_price)}.`);
        for (const c2 of a.price_cells.slice(1, 3)) parts.push(`For ${cellName(c2)}: median ${int(c2.median)} AED/sqft, typical ${aed(c2.median_price)} (${c2.n} sales).`);
      } else if (s.median_ppsqft_12w) {
        parts.push(`${a.area}: median ${int(s.median_ppsqft_12w)} AED/sqft across ${int(s.n_bench_12w)} eligible residential sales in the last 12 weeks (median price ${aed(s.median_price_12w)}). No cell with enough sales for the exact type requested.`);
      } else {
        parts.push(`${a.area}: not enough eligible registered sales in the current window to publish a price benchmark.`);
      }
    }
    if (wantsRent && !a.rent_check) {
      if (a.rent_cells.length) {
        const c = a.rent_cells[0];
        const label = c.size_band ? `${c.sub_type.toLowerCase()}s of ${bandLabel(c.size_band)}` : `${c.sub_type.toLowerCase()}s (all sizes)`;
        parts.push(`Registered Ejari rents for ${label} in ${a.area} over the last ${f.windows.rent_months} months: median ${aed(c.median)} a year (p25 ${aed(c.p25)} to p75 ${aed(c.p75)}, ${c.n} contracts, about ${c.median_rent_psqft.toFixed(0)} AED/sqft/yr).`);
        const sameBand = a.rent_cells.slice(1, 4).filter((x) => x.size_band === c.size_band && x.is_renewal !== null && x.is_renewal !== undefined);
        const otherBands = a.rent_cells.slice(1, 4).filter((x) => x.size_band && x.size_band !== c.size_band);
        if (sameBand.length) parts.push("By contract type: " + sameBand.map((x) => `${x.is_renewal ? "renewals" : "new contracts"} ${aed(x.median)} (n=${x.n})`).join("; ") + ".");
        if (otherBands.length) parts.push("Other size bands: " + otherBands.map((x) => `${bandLabel(x.size_band)} ${aed(x.median)} (n=${x.n})`).join("; ") + ".");
      } else if (s.median_rent_12w) {
        parts.push(`Median residential rent registered in ${a.area} in the last 12 weeks: ${aed(s.median_rent_12w)} a year (${int(s.n_rent_bench_12w)} contracts).`);
      } else {
        parts.push(`${a.area}: no rent benchmark with enough contracts in the current window.`);
      }
    }
    if (p.intents.includes("yield") || p.intents.includes("profile") || p.intents.includes("compare")) {
      parts.push(s.gross_yield_est ? `Gross yield estimate for ${a.area}: ${pct(s.gross_yield_est)} (median rent per sqft divided by median price per sqft, not net of service charges or vacancy).` : `No gross-yield estimate for ${a.area} yet (needs both price and rent benchmarks in the same window).`);
    }
    if (p.intents.includes("trend") || p.intents.includes("profile") || p.intents.includes("compare")) {
      parts.push(s.ppsqft_change_12w !== undefined && s.ppsqft_change_12w !== null
        ? `Trend for ${a.area}: median AED/sqft ${pct(s.ppsqft_change_12w, 1, true)} versus the previous 12 weeks (${s.signal}); ${int(s.sales_12w)} sales in the last 12 weeks, off-plan share ${pct(s.offplan_share_12w, 0)}.`
        : `Trend for ${a.area}: ${int(s.sales_12w)} registered sales in the last 12 weeks with off-plan share ${pct(s.offplan_share_12w, 0)}; the 12-week price change appears once 24 weeks of history are loaded.`);
    }
    out.push(parts.join(" "));
  }

  if (m && (p.areas.length === 0 || p.intents.some((i) => ["rank", "trend", "yield", "overview"].includes(i)))) {
    const k = m.last_4_full_weeks;
    const prev = m.previous_4_weeks;
    if (p.intents.includes("overview") || p.areas.length === 0 && !p.intents.some((i) => ["rank", "trend", "yield", "anomaly"].includes(i))) {
      if (k) {
        const d = prev && prev.sales ? ` (${pct(k.sales / prev.sales - 1, 1, true)} versus the previous four weeks)` : "";
        out.push(`Market to ${f.as_of}: ${int(k.sales)} registered sales worth ${aed(k.value_aed / 1e9, 2).replace("AED ", "AED ")} bn in the last four full weeks${d}; median residential price ${int(k.median_ppsqft_res)} AED/sqft; off-plan share ${pct(k.offplan_share, 0)}; ${int(k.mortgages)} mortgage registrations.`);
      }
      const r = m.rents_last_4_weeks;
      if (r) out.push(`Rentals: ${int(r.contracts)} Ejari contracts in four weeks, ${pct(r.renewal_share, 0)} renewals, median residential rent ${aed(r.median_rent_res)} a year.`);
    }
    const list = (title: string, rowsL: Array<Record<string, number | string | null>> | undefined, fmt: (r: Record<string, number | string | null>) => string) =>
      rowsL && rowsL.length ? `${title}: ` + rowsL.slice(0, 5).map(fmt).join("; ") + "." : "";
    const rankOnly = !p.intents.includes("trend") && !p.intents.includes("yield");
    if ((p.intents.includes("rank") && rankOnly) || (p.areas.length === 0 && p.intents.includes("price") && !p.intents.includes("rank"))) {
      const q = p.question.toLowerCase();
      if (/cheap|afford|lowest|budget/.test(q)) out.push(list("Lowest median AED/sqft (communities with 30+ eligible sales)", m.cheapest_by_median_ppsqft, (r) => `${r.area} ${int(r.median_ppsqft_12w as number)}/sqft`));
      else if (/expensive|premium|highest price|priciest|luxury/.test(q)) out.push(list("Highest median AED/sqft", m.most_expensive_by_median_ppsqft, (r) => `${r.area} ${int(r.median_ppsqft_12w as number)}/sqft`));
      else out.push(list("Busiest communities by registered sales in the last 12 weeks", m.busiest_communities_12w, (r) => `${r.area} ${int(r.sales_12w as number)} sales at a median ${int(r.median_ppsqft_12w as number)}/sqft`));
    }
    if (p.intents.includes("trend") && p.areas.length === 0) {
      const h = list("Heating (12-week change in median AED/sqft)", m.heating_12w, (r) => `${r.area} ${pct(r.ppsqft_change_12w as number, 1, true)}`);
      const c = list("Cooling", m.cooling_12w, (r) => `${r.area} ${pct(r.ppsqft_change_12w as number, 1, true)}`);
      out.push(h && c ? h + " " + c : "Heating and cooling signals need 24 weeks of history; they appear automatically once the backfill has loaded.");
    }
    if (p.intents.includes("yield") && p.areas.length === 0) {
      out.push(list("Highest gross-yield estimates (communities with 30+ rent contracts)", m.highest_gross_yield_estimates, (r) => `${r.area} ${pct(r.gross_yield_est as number)} (median rent ${aed(r.median_rent_12w as number)})`));
    }
  }
  if (f.anomalies) {
    out.push(`${int(f.anomalies.flagged_60d)} registered sales in the last 60 days were priced more than 35% away from their comparable-cell median. ` +
      (f.anomalies.examples.length ? "Examples: " + f.anomalies.examples.map((e) => `${e.area}${e.project ? " (" + e.project + ")" : ""} ${e.rooms} ${String(e.sub_type).toLowerCase()} at ${int(e.price_per_sqft as number)}/sqft vs ${int(e.cell_median_ppsqft as number)} median (${pct(e.deviation_pct as number, 0, true)})`).join("; ") + "." : ""));
  }
  if (f.areas.length === 0 && f.suggestions?.length) {
    out.push(`I could not match a community in your question. Did you mean: ${f.suggestions.join(", ")}?`);
  }
  if (out.length === 0) out.push("I could not find data for that question. Try asking about a community (for example JVC, Business Bay, Dubai Marina), a price for a given size, or a rent.");
  out.push(`Data to ${f.as_of}, registered DLD records only. Indicative, not a valuation.`);
  return out.filter(Boolean).join("\n\n");
}
