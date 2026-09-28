import RentCheckTool from "@/components/RentCheckTool";
import { getRentBenchmarks } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Rent check · Dubai Property Decision Engine" };

export default function RentCheckPage() {
  const rb = getRentBenchmarks();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Rent check &amp; renewal-increase calculator</h1>
          <p className="sub">
            Compare a rent with registered Ejari contracts for comparable units and see the maximum increase a landlord may apply at renewal ·{" "}
            {rb.benchmarks.length.toLocaleString()} benchmark cells · data to {fmtDate(rb.as_of)}.
          </p>
        </div>
      </div>
      <RentCheckTool benchmarks={rb.benchmarks} asOf={fmtDate(rb.as_of)} windowMonths={rb.window_months} />
    </>
  );
}
