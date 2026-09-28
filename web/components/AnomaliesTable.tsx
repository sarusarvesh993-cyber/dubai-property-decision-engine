"use client";

import { useMemo, useState } from "react";
import { fmtAed, fmtDate, fmtInt, fmtPct } from "@/lib/format";
import type { Anomaly } from "@/lib/types";

export default function AnomaliesTable({ items }: { items: Anomaly[] }) {
  const [dir, setDir] = useState<"all" | "above" | "below">("all");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => items.filter((a) => (dir === "all" || a.direction === dir) && `${a.area} ${a.project ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [items, dir, q],
  );
  return (
    <div className="card">
      <div className="toolbar">
        <input placeholder="Filter by community or project…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={dir} onChange={(e) => setDir(e.target.value as typeof dir)} style={{ font: "inherit", padding: "0.45rem" }}>
          <option value="all">Above &amp; below</option>
          <option value="above">Priced above cell median</option>
          <option value="below">Priced below cell median</option>
        </select>
        <span className="small">{rows.length} shown</span>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th><th>Community</th><th>Project</th><th>Type</th><th>Beds</th><th>Status</th><th>Size sqft</th><th>Price</th><th>AED/sqft</th><th>Cell median</th><th>Deviation</th><th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.transaction_id + a.price_aed}>
                <td>{fmtDate(a.date)}</td>
                <td>{a.area}</td>
                <td>{a.project ?? "—"}</td>
                <td>{a.sub_type}</td>
                <td>{a.rooms}</td>
                <td>{a.is_offplan ? "Off-plan" : "Ready"}</td>
                <td>{fmtInt(a.size_sqft)}</td>
                <td>{fmtAed(a.price_aed)}</td>
                <td>{fmtInt(a.price_per_sqft)}</td>
                <td>{fmtInt(a.cell_median_ppsqft)}</td>
                <td className={a.direction === "above" ? "down" : "up"}>{fmtPct(a.deviation_pct, 0, true)}</td>
                <td className="small">n={a.cell_n} · {a.cell_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
