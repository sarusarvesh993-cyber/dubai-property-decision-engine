import RenewalAgent from "@/components/RenewalAgent";
import { getRentBenchmarks } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata = {
  title: "Renewal Agent | Dubai Property Decision Engine",
  description: "Personal AI agent for Dubai tenants preparing for rent renewal, auditing landlord demands, and assembling negotiation packs.",
};

export default function RenewalAgentPage() {
  const rb = getRentBenchmarks();
  return (
    <div style={{ maxWidth: "1140px", margin: "0 auto" }}>
      <RenewalAgent
        benchmarks={rb.benchmarks}
        asOf={fmtDate(rb.as_of)}
        windowMonths={rb.window_months}
      />
    </div>
  );
}
