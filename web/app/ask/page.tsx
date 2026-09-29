import AskBox from "@/components/AskBox";
import ModelStatus from "@/components/ModelStatus";
import { getSummary } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Ask the data | Dubai Property Decision Engine" };

export default function AskPage() {
  const s = getSummary();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ask the data</h1>
          <p className="sub">
            Plain-language questions about prices, rents, yields and trends, answered from registered DLD data to {fmtDate(s.as_of)}. Mention a community,
            a size in sqft and a price or rent to get a verdict.
          </p>
        </div>
      </div>
      <AskBox mode="full" />
      <ModelStatus />
      <p className="callout mt">
        How it works: the question is parsed for community, property type, bedrooms, size and amounts; the matching benchmark cells are retrieved; a
        rules-based answer is written from them and, when a free-tier model key is configured, the model rewrites it in better prose without adding numbers.
        Nothing you type is stored.
      </p>
    </>
  );
}
