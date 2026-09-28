import AnomaliesTable from "@/components/AnomaliesTable";
import { getAnomalies } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Anomalies · Dubai Property Decision Engine" };

export default function AnomaliesPage() {
  const a = getAnomalies();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Price anomaly monitor</h1>
          <p className="sub">
            Registered residential sales in the last 60 days priced more than 35% away from the median of comparable units (same community, type, bedrooms and
            status) · {a.total.toLocaleString()} flagged, top 100 shown · data to {fmtDate(a.as_of)}.
          </p>
        </div>
      </div>
      <p className="callout mb">
        Use-cases: brokers verifying comparables, lenders screening valuations, buyers spotting distressed or premium units. A flag is a prompt to look closer
        (view, floor, upgrades, bulk pricing), not a judgement.
      </p>
      <AnomaliesTable items={a.items} />
    </>
  );
}
