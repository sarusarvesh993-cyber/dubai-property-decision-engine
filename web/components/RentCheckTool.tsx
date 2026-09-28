"use client";

import { useMemo, useState } from "react";
import { rentCheck, sizeBandOf } from "@/lib/engine";
import { fmtAed, fmtInt, fmtPct } from "@/lib/format";
import type { RentBenchmark } from "@/lib/types";

export default function RentCheckTool({ benchmarks, asOf, windowMonths }: { benchmarks: RentBenchmark[]; asOf: string; windowMonths: number }) {
  const areas = useMemo(() => Array.from(new Set(benchmarks.map((b) => b.area))).sort(), [benchmarks]);
  const [area, setArea] = useState(areas.includes("Business Bay") ? "Business Bay" : areas[0] ?? "");
  const subTypes = useMemo(() => Array.from(new Set(benchmarks.filter((b) => b.area === area).map((b) => b.sub_type))).sort(), [benchmarks, area]);
  const [subType, setSubType] = useState("Flat");
  const [size, setSize] = useState(750);
  const [rent, setRent] = useState(70_000);
  const [renewal, setRenewal] = useState(true);
  const effSub = subTypes.includes(subType) ? subType : subTypes[0] ?? subType;
  const res = rentCheck(benchmarks, { area, subType: effSub, sizeSqft: size, currentRent: rent, isRenewal: renewal });
  const cls = res ? (res.slabPct === 0 ? "good" : res.slabPct <= 0.1 ? "warn" : "bad") : "";

  return (
    <div className="grid two">
      <div className="card">
        <h2>Your tenancy</h2>
        <div className="form">
          <label className="field">
            Community
            <select value={area} onChange={(e) => setArea(e.target.value)}>
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
            Size (sqft)
            <input type="number" min={100} step={10} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
          <label className="field">
            Current annual rent (AED)
            <input type="number" min={5000} step={1000} value={rent} onChange={(e) => setRent(Number(e.target.value))} />
          </label>
          <label className="field">
            Contract
            <select value={renewal ? "renewal" : "new"} onChange={(e) => setRenewal(e.target.value === "renewal")}>
              <option value="renewal">Renewal</option>
              <option value="new">New lease</option>
            </select>
          </label>
        </div>
        <p className="hint mt">
          Size band {sizeBandOf(size / 10.7639)} sqm. Benchmarks use registered residential Ejari contracts from the last {windowMonths} months to {asOf};
          bulk leases and outliers removed. The public feed does not expose bedrooms for rentals, so size bands are used instead.
        </p>
      </div>

      <div className="card">
        <h2>Renewal position</h2>
        {!res ? (
          <p className="callout">No rent benchmark with enough contracts for this combination yet. Try another property type or a nearby community.</p>
        ) : (
          <>
            <div className={`verdict ${cls}`}>
              <div className="big">Max permitted increase: {fmtPct(res.slabPct, 0)}</div>
              <div>{res.verdictText}</div>
            </div>
            <ul className="list mt">
              <li><span>Market median for comparable units</span><strong>{fmtAed(res.marketMedian)}</strong></li>
              <li><span>Typical range (p25-p75)</span><strong>{fmtAed(res.marketLow)} to {fmtAed(res.marketHigh)}</strong></li>
              <li><span>Your rent vs median</span><strong className={res.belowMarketPct > 0 ? "up" : "down"}>{fmtPct(-res.belowMarketPct, 1, true)}</strong></li>
              <li><span>Ceiling for the new rent</span><strong>{fmtAed(res.maxNewRent)}</strong></li>
              <li><span>Evidence</span><strong>{fmtInt(res.bench.n)} contracts, {res.levelLabel}</strong></li>
              <li><span>Median rent per sqft in cell</span><strong>{res.bench.median_rent_psqft.toFixed(0)} AED/sqft/yr</strong></li>
            </ul>
            <div className="callout mt">
              Slabs per Decree 43/2013: 0% if rent is up to 10% below market; 5% (11-20% below); 10% (21-30%); 15% (31-40%); 20% (more than 40% below).
              The official RERA Rental Index calculator is the legally binding reference; use this tool to prepare, not to litigate.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
