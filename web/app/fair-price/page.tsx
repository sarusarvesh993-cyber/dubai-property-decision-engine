import FairPriceTool from "@/components/FairPriceTool";
import { getPriceBands, getRentBenchmarks } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Fair price checker · Dubai Property Decision Engine" };

export default function FairPricePage() {
  const pb = getPriceBands();
  const rb = getRentBenchmarks();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fair price checker</h1>
          <p className="sub">
            Where does an asking price sit against registered sales of comparable units? Bands from {pb.bands.length.toLocaleString()} benchmark cells (min {pb.min_n}{" "}
            sales each) · data to {fmtDate(pb.as_of)}.
          </p>
        </div>
      </div>
      <FairPriceTool bands={pb.bands} rents={rb.benchmarks} asOf={fmtDate(pb.as_of)} windowMonths={pb.window_months} />
    </>
  );
}
