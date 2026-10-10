"use client";

import { useMemo, useState } from "react";
import { AreaTrendChart } from "@/components/Charts";
import { fmtAed, fmtInt, fmtMn, fmtPct } from "@/lib/format";
import type { AreaMonth, AreaRow } from "@/lib/types";

type SortKey = keyof AreaRow;

const SIGNAL_CLASS: Record<string, string> = {
  heating: "good",
  warming: "good",
  stable: "info",
  softening: "warn",
  cooling: "bad",
  "insufficient data": "muted",
};

export default function CommunitiesTable({ areas, areaMonth, minN }: { areas: AreaRow[]; areaMonth: AreaMonth[]; minN: number }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sales_12w");
  const [desc, setDesc] = useState(true);
  const [selected, setSelected] = useState<string | null>(areas[0]?.area ?? null);

  const rows = useMemo(() => {
    const f = areas.filter((a) => a.area.toLowerCase().includes(q.toLowerCase()));
    return f.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string" && typeof bv === "string") return desc ? bv.localeCompare(av) : av.localeCompare(bv);
      return desc ? Number(bv) - Number(av) : Number(av) - Number(bv);
    });
  }, [areas, q, sortKey, desc]);

  const sel = areas.find((a) => a.area === selected) ?? null;
  const trend = areaMonth.filter((m) => m.area === selected);

  const header = (label: string, key: SortKey, title?: string) => (
    <th
      title={title}
      onClick={() => {
        if (sortKey === key) setDesc(!desc);
        else {
          setSortKey(key);
          setDesc(true);
        }
      }}
    >
      {label} {sortKey === key ? (desc ? "▼" : "▲") : ""}
    </th>
  );

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 1fr)" }}>
      <div className="card">
        <div className="toolbar">
          <input placeholder="Search community..." value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="small">{rows.length} communities. Click a column to sort, click a row for detail.</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {header("Community", "area")}
                {header("Sales 12w", "sales_12w")}
                {header("Value 12w", "value_12w")}
                {header("Median AED/sqft", "median_ppsqft_12w", "Benchmark-eligible residential sales, last 12 weeks")}
                {header("12w Δ", "ppsqft_change_12w", "Change in median AED/sqft vs previous 12 weeks")}
                {header("Signal", "signal")}
                {header("Off-plan", "offplan_share_12w")}
                {header("Median rent", "median_rent_12w", "Residential Ejari contracts, last 12 weeks")}
                {header("Yield est.", "gross_yield_est", "Median rent per sqft divided by median price per sqft, same property type (flats or villas)")}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.area} className={a.area === selected ? "selected" : undefined} onClick={() => setSelected(a.area)} style={{ cursor: "pointer" }}>
                  <td>{a.area}</td>
                  <td>{fmtInt(a.sales_12w)}</td>
                  <td>{fmtMn(a.value_12w)}</td>
                  <td>{a.n_bench_12w >= minN ? fmtInt(a.median_ppsqft_12w) : <span className="small">n&lt;{minN}</span>}</td>
                  <td className={a.ppsqft_change_12w === null ? "flat" : a.ppsqft_change_12w > 0 ? "up" : "down"}>{fmtPct(a.ppsqft_change_12w, 1, true)}</td>
                  <td>
                    <span className={`chip ${SIGNAL_CLASS[a.signal] ?? "muted"}`}>{a.signal}</span>
                  </td>
                  <td>{fmtPct(a.offplan_share_12w, 0)}</td>
                  <td>{(a.n_rent_bench_12w ?? 0) >= minN ? fmtAed(a.median_rent_12w) : <span className="small">n/a</span>}</td>
                  <td>{fmtPct(a.gross_yield_est, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        {sel ? (
          <>
            <h2>{sel.area}</h2>
            <span className={`chip ${SIGNAL_CLASS[sel.signal] ?? "muted"}`}>{sel.signal}</span>
            <ul className="list mt">
              <li><span>Sales, last 12 weeks</span><strong>{fmtInt(sel.sales_12w)}</strong></li>
              <li><span>Sales value</span><strong>{fmtMn(sel.value_12w)}</strong></li>
              <li><span>Median price (residential)</span><strong>{fmtAed(sel.median_price_12w)}</strong></li>
              <li><span>Median AED/sqft</span><strong>{fmtInt(sel.median_ppsqft_12w)}</strong></li>
              <li><span>Previous 12 weeks</span><strong>{fmtInt(sel.median_ppsqft_prev_12w)}</strong></li>
              <li><span>Off-plan share</span><strong>{fmtPct(sel.offplan_share_12w, 0)}</strong></li>
              <li><span>Mortgage registrations</span><strong>{fmtInt(sel.mortgages_12w)}</strong></li>
              <li><span>Ejari contracts</span><strong>{fmtInt(sel.rent_contracts_12w)}</strong></li>
              <li><span>Renewal share</span><strong>{fmtPct(sel.renewal_share_12w, 0)}</strong></li>
              <li><span>Median annual rent</span><strong>{fmtAed(sel.median_rent_12w)}</strong></li>
              <li><span>Median rent AED/sqft/yr</span><strong>{sel.median_rent_psqft_12w?.toFixed(0) ?? "n/a"}</strong></li>
              <li><span>Gross yield estimate</span><strong>{fmtPct(sel.gross_yield_est, 1)}</strong></li>
            </ul>
            <h3 className="mt">Monthly median AED/sqft</h3>
            {trend.length ? <AreaTrendChart rows={trend} /> : <p className="small">Not enough benchmark-eligible sales yet (min {minN} per month).</p>}
          </>
        ) : (
          <p className="small">Select a community.</p>
        )}
      </div>
    </div>
  );
}
