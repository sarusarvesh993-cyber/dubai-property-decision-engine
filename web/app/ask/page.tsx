import RenewalAgent from "@/components/RenewalAgent";
import { getRentBenchmarks } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata = {
  title: "AI Agent & Ask Copilot | Dubai Property Decision Engine",
  description: "Unified AI Agent for Dubai renters: plain-language question answering, statutory rent renewal audits, and negotiation pack generation.",
};

export default function AskPage() {
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
