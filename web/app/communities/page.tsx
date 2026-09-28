import CommunitiesTable from "@/components/CommunitiesTable";
import { getAreas, getSummary } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Communities · Dubai Property Decision Engine" };

export default function CommunitiesPage() {
  const { areas, area_month, as_of } = getAreas();
  const { params } = getSummary();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Community heat map</h1>
          <p className="sub">
            Every DLD community with registered activity · last 12 weeks vs previous 12 · data to {fmtDate(as_of)}. Sales and Ejari names are
            reconciled with a published crosswalk (e.g. “Al Barsha South Fourth” → Jumeirah Village Circle); remaining names are official DLD districts.
          </p>
        </div>
      </div>
      <CommunitiesTable areas={areas} areaMonth={area_month} minN={params.min_cell_n} />
    </>
  );
}
