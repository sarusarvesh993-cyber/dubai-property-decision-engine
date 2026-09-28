import Link from "next/link";
import { WeeklyRentsChart, WeeklySalesChart } from "@/components/Charts";
import { getAreas, getMarketNote, getSummary } from "@/lib/data";
import { delta, fmtAed, fmtBn, fmtDate, fmtInt, fmtPct } from "@/lib/format";

function Delta({ v, invert = false }: { v: number | null; invert?: boolean }) {
  if (v === null) return <div className="delta flat">vs prior 4 weeks: n/a (needs 8+ weeks of history)</div>;
  const good = invert ? v < 0 : v > 0;
  return (
    <div className={`delta ${Math.abs(v) < 0.005 ? "flat" : good ? "up" : "down"}`}>
      {fmtPct(v, 1, true)} vs prior 4 weeks
    </div>
  );
}

export default function Home() {
  const s = getSummary();
  const areas = getAreas().areas;
  const note = getMarketNote();
  const k = s.kpi_last4w;
  const p = s.kpi_prev4w;
  const r = s.rent_kpi_last4w;
  const withChange = areas.filter((a) => a.ppsqft_change_12w !== null && a.n_bench_12w >= s.params.min_cell_n);
  const heating = [...withChange].sort((a, b) => (b.ppsqft_change_12w ?? 0) - (a.ppsqft_change_12w ?? 0)).slice(0, 6);
  const cooling = [...withChange].sort((a, b) => (a.ppsqft_change_12w ?? 0) - (b.ppsqft_change_12w ?? 0)).slice(0, 6);
  const busiest = [...areas].sort((a, b) => b.sales_12w - a.sales_12w).slice(0, 8);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dubai residential market pulse</h1>
          <p className="sub">
            Registered DLD transactions to <strong>{fmtDate(s.as_of)}</strong> · Ejari contracts to {fmtDate(s.rent_as_of)} · history from{" "}
            {fmtDate(s.coverage_from)} · refreshed daily 06:00 GST
          </p>
        </div>
        <span className="chip info">{fmtInt(s.rows.transactions)} transactions · {fmtInt(s.rows.rents)} rent contracts loaded</span>
      </div>

      <section className="grid kpis mb">
        <div className="card kpi">
          <div className="label">Sales (last 4 full weeks)</div>
          <div className="value">{fmtInt(k?.sales)}</div>
          <Delta v={delta(k?.sales, p?.sales)} />
        </div>
        <div className="card kpi">
          <div className="label">Sales value</div>
          <div className="value">{fmtBn(k?.value_aed)}</div>
          <Delta v={delta(k?.value_aed, p?.value_aed)} />
        </div>
        <div className="card kpi">
          <div className="label">Median price (residential)</div>
          <div className="value">{k ? `${fmtInt(k.median_ppsqft_res)} /sqft` : "—"}</div>
          <Delta v={delta(k?.median_ppsqft_res, p?.median_ppsqft_res)} />
        </div>
        <div className="card kpi">
          <div className="label">Off-plan share of sales</div>
          <div className="value">{fmtPct(k?.offplan_share, 0)}</div>
          <div className="delta flat">{fmtInt(k?.mortgages)} mortgage registrations</div>
        </div>
        <div className="card kpi">
          <div className="label">Ejari contracts (4 weeks)</div>
          <div className="value">{fmtInt(r?.contracts)}</div>
          <div className="delta flat">renewals {fmtPct(r?.renewal_share, 0)}</div>
        </div>
        <div className="card kpi">
          <div className="label">Median residential rent</div>
          <div className="value">{r ? fmtAed(r.median_rent_res) : "—"}</div>
          <div className="delta flat">{r ? `${r.median_rent_psqft_res.toFixed(0)} AED/sqft/yr` : ""}</div>
        </div>
      </section>

      <section className="grid two mb">
        <div className="card">
          <h2>Weekly registered sales &amp; median AED/sqft</h2>
          <WeeklySalesChart data={s.weekly_sales} />
          <p className="hint">Latest week is partial. Median uses benchmark-eligible residential sales only (no bulk deals, gifts, mortgages or outliers).</p>
        </div>
        <div className="card">
          <h2>Weekly Ejari contracts &amp; median annual rent</h2>
          <WeeklyRentsChart data={s.weekly_rents} />
          <p className="hint">Residential contracts, single-unit, 6–36 month terms. Rent medians are mix-dependent; use Rent check for like-for-like.</p>
        </div>
      </section>

      <section className="grid three mb">
        <div className="card">
          <h3>Heating communities <span className="chip good">12-week median AED/sqft ↑</span></h3>
          <ul className="list">
            {heating.length === 0 && <li className="small">Needs ≥ 24 weeks of history — appears automatically after the backfill.</li>}
            {heating.map((a) => (
              <li key={a.area}>
                <span>{a.area}</span>
                <span className="up">{fmtPct(a.ppsqft_change_12w, 1, true)} · n={a.n_bench_12w}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Cooling communities <span className="chip bad">12-week median AED/sqft ↓</span></h3>
          <ul className="list">
            {cooling.length === 0 && <li className="small">Needs ≥ 24 weeks of history — appears automatically after the backfill.</li>}
            {cooling.map((a) => (
              <li key={a.area}>
                <span>{a.area}</span>
                <span className="down">{fmtPct(a.ppsqft_change_12w, 1, true)} · n={a.n_bench_12w}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Busiest communities <span className="chip">sales, last 12 weeks</span></h3>
          <ul className="list">
            {busiest.map((a) => (
              <li key={a.area}>
                <span>{a.area}</span>
                <span>
                  {fmtInt(a.sales_12w)} · {a.median_ppsqft_12w ? `${fmtInt(a.median_ppsqft_12w)}/sqft` : "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className="hint">
            <Link href="/communities">See all communities →</Link>
          </p>
        </div>
      </section>

      <section className="card">
        <h2>
          Weekly market note{" "}
          <span className={`chip ${note?.source === "rules" ? "muted" : "info"}`}>
            {note ? (note.source === "rules" ? "rules-based (no LLM key configured)" : `written by ${note.source}`) : "not generated"}
          </span>
        </h2>
        {note ? <div className="note">{note.text}</div> : <p className="small">Run the pipeline to generate the note.</p>}
        <p className="hint">
          All figures in the note are computed by the pipeline; the language model (when configured) only turns them into prose and is
          never allowed to introduce numbers of its own.
        </p>
      </section>
    </>
  );
}
