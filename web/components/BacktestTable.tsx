import type { BacktestFile, BacktestMetrics } from "@/lib/types";

const pct = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? "n/a" : `${(v * 100).toFixed(digits)}%`);

function Row({ name, m }: { name: string; m: BacktestMetrics }) {
  return (
    <tr>
      <td style={{ textAlign: "left", whiteSpace: "normal" }}>{name}</td>
      <td>{m.n_test.toLocaleString("en-US")}</td>
      <td>{pct(m.coverage, 0)}</td>
      <td>{pct(m.mdape)}</td>
      <td>{pct(m.baseline_mdape)}</td>
      <td>{pct(m.within_p25_p75, 0)}</td>
      <td>{pct(m.within_p10_p90, 0)}</td>
    </tr>
  );
}

/** Out-of-sample accuracy of the fair-price engine, computed by pipeline/backtest.py on every refresh. */
export default function BacktestTable({ b }: { b: BacktestFile }) {
  const o = b.overall;
  return (
    <>
      <p className="small">
        Test window {b.test_window.from} to {b.test_window.to} ({b.test_window.days} days, {o.n_test.toLocaleString("en-US")} eligible residential sales).
        Each sale was priced with comparable cells built only from sales registered before the window ({b.train_window_months} months, at least {b.min_cell_n} sales per cell).
        {b.history_days_available < 120 ? " Fewer than 120 days of history are loaded, so this is a short-window check; it lengthens to 28 days automatically." : ""}
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Segment</th>
              <th>Sales tested</th>
              <th>Coverage</th>
              <th>Median error</th>
              <th>Naive baseline</th>
              <th>Inside p25 to p75</th>
              <th>Inside p10 to p90</th>
            </tr>
          </thead>
          <tbody>
            <Row name="All residential sales" m={o} />
            {Object.entries(b.by_level).map(([k, m]) => (
              <Row key={k} name={`Matched at ${k}`} m={m} />
            ))}
            {Object.entries(b.by_offplan).map(([k, m]) => (
              <Row key={k} name={k === "off-plan" ? "Off-plan sales" : "Ready sales"} m={m} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint mt">
        Median error is the median absolute percentage gap between the actual registered AED/sqft and the comparable-cell median. The naive baseline is one
        citywide median per off-plan or ready group. A well-calibrated band holds about 50% of actual prices inside p25 to p75 and about 80% inside p10 to p90.
        Coverage is the share of sales for which a comparable cell existed.
      </p>
    </>
  );
}
