import FairPriceTool from "@/components/FairPriceTool";
import { getBacktest, getPriceBands, getRentBenchmarks } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Fair price checker | Dubai Property Decision Engine" };

export default function FairPricePage() {
  const pb = getPriceBands();
  const rb = getRentBenchmarks();
  const bt = getBacktest();
  const o = bt?.overall;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fair price checker</h1>
          <p className="sub">
            Where does an asking price sit against registered sales of comparable units? Bands from {pb.bands.length.toLocaleString()} benchmark cells (min {pb.min_n}{" "}
            sales each), data to {fmtDate(pb.as_of)}.
          </p>
          {o && o.mdape !== undefined ? (
            <p className="small">
              Back-tested on {o.n_test.toLocaleString("en-US")} registered sales from {bt!.test_window.from} to {bt!.test_window.to}: median error {(o.mdape * 100).toFixed(1)}%
              against {(o.baseline_mdape! * 100).toFixed(1)}% for a single citywide median, with {((o.coverage ?? 0) * 100).toFixed(0)}% of sales matched to a comparable cell.
              Details on the methodology page.
            </p>
          ) : null}
        </div>
      </div>
      <FairPriceTool bands={pb.bands} rents={rb.benchmarks} asOf={fmtDate(pb.as_of)} windowMonths={pb.window_months} />
    </>
  );
}
