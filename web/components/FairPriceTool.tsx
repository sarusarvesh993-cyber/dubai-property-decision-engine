"use client";

import { useMemo, useState } from "react";
import { fairPrice, selectRentBench } from "@/lib/engine";
import { fmtAed, fmtInt, fmtPct } from "@/lib/format";
import type { PriceBand, RentBenchmark } from "@/lib/types";

const ROOM_OPTIONS = ["Studio", "1 B/R", "2 B/R", "3 B/R", "4 B/R", "5+ B/R", "NA"];

export default function FairPriceTool({ bands, rents, asOf, windowMonths }: { bands: PriceBand[]; rents: RentBenchmark[]; asOf: string; windowMonths: number }) {
  const areas = useMemo(() => Array.from(new Set(bands.map((b) => b.area))).sort(), [bands]);
  const [area, setArea] = useState(areas.includes("Business Bay") ? "Business Bay" : areas[0] ?? "");
  const subTypes = useMemo(() => Array.from(new Set(bands.filter((b) => b.area === area && b.sub_type).map((b) => b.sub_type as string))).sort(), [bands, area]);
  const [subType, setSubType] = useState("Flat");
  const [rooms, setRooms] = useState("1 B/R");
  const [offplan, setOffplan] = useState(false);
  const [size, setSize] = useState(750);
  const [price, setPrice] = useState(1_500_000);
  const projects = useMemo(
    () => Array.from(new Set(bands.filter((b) => b.level === "L0" && b.area === area && b.project).map((b) => b.project as string))).sort(),
    [bands, area],
  );
  const [project, setProject] = useState("");

  const effSub = subTypes.includes(subType) ? subType : subTypes[0] ?? subType;
  const res = fairPrice(bands, { area, subType: effSub, rooms, isOffplan: offplan, sizeSqft: size, askingPrice: price, project: project || undefined });
  const rentBench = selectRentBench(rents, { area, subType: effSub, sizeSqft: size, currentRent: 1, isRenewal: false });
  const grossYield = rentBench && price > 0 ? (rentBench.level === "R3" ? rentBench.median_rent_psqft * size : rentBench.median) / price : null;

  const verdictClass = res ? (res.verdict.includes("below") ? "good" : res.verdict === "in line with market" ? "" : res.verdict === "above market" ? "warn" : "bad") : "";
  const [copied, setCopied] = useState(false);
  const rentMedian = rentBench ? (rentBench.level === "R3" ? rentBench.median_rent_psqft * size : rentBench.median) : null;
  const brief = res
    ? [
        `NEGOTIATION BRIEF (indicative, registered DLD data to ${asOf})`,
        `Property: ${rooms === "NA" ? "" : rooms + " "}${effSub.toLowerCase()}, ${fmtInt(size)} sqft, ${area}${project ? ", " + project : ""}, ${offplan ? "off-plan" : "ready"}`,
        `Asking price: ${fmtAed(price)} (${fmtInt(res.askingPpsqft)} AED/sqft)`,
        `Evidence: ${res.band.n} registered sales, ${res.levelLabel}, last ${windowMonths} months (confidence ${res.confidence})`,
        `Comparable AED/sqft: p10 ${fmtInt(res.band.p10)}, p25 ${fmtInt(res.band.p25)}, median ${fmtInt(res.band.median)}, p75 ${fmtInt(res.band.p75)}, p90 ${fmtInt(res.band.p90)}`,
        `Verdict: ${res.verdict}, percentile ${res.percentile.toFixed(0)}, ${fmtPct(res.gapPct, 1, true)} versus the median`,
        `Fair range for ${fmtInt(size)} sqft: ${fmtAed(res.fairLow)} to ${fmtAed(res.fairHigh)}; market-median price ${fmtAed(res.fairMid)}`,
        `Buyer anchors: open at ${fmtAed(res.fairLow)} (p25), aim for ${fmtAed(res.fairMid)} (median), treat ${fmtAed(res.fairHigh)} (p75) as the ceiling`,
        rentMedian
          ? `Rent benchmark: median ${fmtAed(rentMedian)} a year, gross yield ${fmtPct(rentMedian / price, 1)} at asking and ${fmtPct(rentMedian / res.fairMid, 1)} at the market-median price`
          : "Rent benchmark: none for this community and size band",
        `Typical unit in this cell: ${fmtInt(res.band.median_size_sqft)} sqft at ${fmtAed(res.band.median_price)}`,
        "Not a valuation or legal advice. Source: Dubai Land Department open data via dubai-property-decision-engine.vercel.app",
      ].join("\n")
    : "";
  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid two">
      <div className="card">
        <h2>Property details</h2>
        <div className="form">
          <label className="field">
            Community
            <select value={area} onChange={(e) => { setArea(e.target.value); setProject(""); }}>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="field">
            Property type
            <select value={effSub} onChange={(e) => setSubType(e.target.value)}>
              {subTypes.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            Bedrooms
            <select value={rooms} onChange={(e) => setRooms(e.target.value)}>
              {ROOM_OPTIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="field">
            Status
            <select value={offplan ? "off" : "ready"} onChange={(e) => setOffplan(e.target.value === "off")}>
              <option value="ready">Ready / secondary</option>
              <option value="off">Off-plan</option>
            </select>
          </label>
          <label className="field">
            Project (optional)
            <select value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">any project in {area}</option>
              {projects.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="field">
            Size (sqft)
            <input type="number" min={100} step={10} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
          <label className="field">
            Asking price (AED)
            <input type="number" min={100000} step={10000} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </label>
        </div>
        <p className="hint mt">
          Benchmarks: registered sales in the last {windowMonths} months to {asOf}; bulk deals, gifts, mortgages and statistical outliers removed. The engine
          picks the most specific cell with enough evidence (project first, then community + type + bedrooms, then community + type, then community).
        </p>
      </div>

      <div className="card">
        <h2>Verdict</h2>
        {!res ? (
          <p className="callout">No benchmark with at least the minimum sample size for this combination yet. Try "any bedrooms" (NA), the other status, or a nearby community.</p>
        ) : (
          <>
            <div className={`verdict ${verdictClass}`}>
              <div className="big">
                {fmtAed(price)} is <u>{res.verdict}</u>
              </div>
              <div>
                {fmtInt(res.askingPpsqft)} AED/sqft vs community median {fmtInt(res.band.median)} AED/sqft ({fmtPct(res.gapPct, 1, true)}) |
                percentile {res.percentile.toFixed(0)}
              </div>
            </div>
            <div className="range">
              <div className="marker" style={{ left: `${Math.min(100, Math.max(0, res.percentile))}%` }} title={`Percentile ${res.percentile.toFixed(0)}`} />
            </div>
            <div className="range-labels">
              <span>p10 {fmtInt(res.band.p10)}</span>
              <span>p25 {fmtInt(res.band.p25)}</span>
              <span>median {fmtInt(res.band.median)}</span>
              <span>p75 {fmtInt(res.band.p75)}</span>
              <span>p90 {fmtInt(res.band.p90)}</span>
            </div>
            <ul className="list mt">
              <li><span>Fair range for {fmtInt(size)} sqft (p25-p75)</span><strong>{fmtAed(res.fairLow)} to {fmtAed(res.fairHigh)}</strong></li>
              <li><span>Market-median price for this size</span><strong>{fmtAed(res.fairMid)}</strong></li>
              <li><span>Gap to median</span><strong>{fmtAed(price - res.fairMid)}</strong></li>
              <li><span>Evidence</span><strong>{res.band.n} sales, {res.levelLabel}</strong></li>
              <li><span>Confidence</span><span className={`chip ${res.confidence === "high" ? "good" : res.confidence === "medium" ? "info" : "warn"}`}>{res.confidence}</span></li>
              <li><span>Typical unit in this cell</span><strong>{fmtInt(res.band.median_size_sqft)} sqft, {fmtAed(res.band.median_price)}</strong></li>
              <li>
                <span>Gross yield at asking price</span>
                <strong>{grossYield ? `${fmtPct(grossYield, 1)} (median rent ${fmtAed(rentBench!.level === "R3" ? rentBench!.median_rent_psqft * size : rentBench!.median)})` : "no rent benchmark"}</strong>
              </li>
            </ul>
            <p className="hint">
              Negotiation anchor: offering at the p25 level equals {fmtAed(res.fairLow)}; the seller's realistic ceiling (p75) is {fmtAed(res.fairHigh)}. Indicative only, not a
              valuation.
            </p>
            <details className="mt">
              <summary className="small">Negotiation brief (one page to copy into an email or a note)</summary>
              <pre className="facts">{brief}</pre>
              <button type="button" className="btn" onClick={copyBrief}>{copied ? "Copied" : "Copy brief"}</button>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
