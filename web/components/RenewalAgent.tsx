"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { RentBenchmark } from "@/lib/types";
import { rentCheck, sizeBandOf } from "@/lib/engine";
import { fmtAed, fmtInt, fmtPct, fmtDate } from "@/lib/format";

interface RenewalAgentProps {
  benchmarks: RentBenchmark[];
  asOf: string;
  windowMonths: number;
  initialQuestion?: string;
}

export interface TenancyFacts {
  area: string;
  subType: string;
  sizeSqft: number | "";
  currentRent: number | "";
  proposedRent: number | "";
  contractExpiry: string;
  noticeDate: string;
  noticeMethod: "email" | "whatsapp" | "notary" | "registered_mail" | "verbal" | "none";
  noticeAgreement: "statutory_90" | "custom_agreed" | "unknown";
  customNoticeDays: number;
  landlordReason: "market" | "sale" | "renovation" | "personal_use" | "unspecified";
  threatenedEviction: boolean;
}

interface AskResponse {
  question: string;
  answer: string;
  source: string;
  facts: unknown;
  parsed?: {
    areas?: string[];
    subType?: string | null;
    rooms?: string | null;
    sizeSqft?: number | null;
    rent?: number | null;
    price?: number | null;
  };
  error?: string;
}

const BLANK_FACTS: TenancyFacts = {
  area: "",
  subType: "Flat",
  sizeSqft: "",
  currentRent: "",
  proposedRent: "",
  contractExpiry: "",
  noticeDate: "",
  noticeMethod: "email",
  noticeAgreement: "statutory_90",
  customNoticeDays: 90,
  landlordReason: "market",
  threatenedEviction: false,
};

const SYNTHETIC_DEMO_SCENARIOS: Array<{
  id: string;
  title: string;
  subtitle: string;
  data: TenancyFacts;
}> = [
  {
    id: "untimely-notice",
    title: "Synthetic Demo 1: Notice under 90 Days",
    subtitle: "Dubai Marina 1BR • Synthetic case: 61 days notice received vs 90d statutory default",
    data: {
      area: "Dubai Marina",
      subType: "Flat",
      sizeSqft: 850,
      currentRent: 85000,
      proposedRent: 98000,
      contractExpiry: "2026-10-15",
      noticeDate: "2026-08-15", // 61 days notice (past date relative to 2026-10-11)
      noticeMethod: "email",
      noticeAgreement: "statutory_90",
      customNoticeDays: 90,
      landlordReason: "market",
      threatenedEviction: false,
    },
  },
  {
    id: "marina-zero-increase",
    title: "Synthetic Demo 2: Within 10% of Registered Median",
    subtitle: "Dubai Marina 1BR • Synthetic case: Notice >=90d, rent within 10% of median",
    data: {
      area: "Dubai Marina",
      subType: "Flat",
      sizeSqft: 850,
      currentRent: 88000,
      proposedRent: 105000,
      contractExpiry: "2026-11-01",
      noticeDate: "2026-07-01", // 123 days notice
      noticeMethod: "email",
      noticeAgreement: "statutory_90",
      customNoticeDays: 90,
      landlordReason: "market",
      threatenedEviction: false,
    },
  },
  {
    id: "eviction-threat-sale",
    title: "Synthetic Demo 3: Eviction Notice Screening",
    subtitle: "Business Bay • Synthetic case: Informal notice citing intent to sell",
    data: {
      area: "Business Bay",
      subType: "Flat",
      sizeSqft: 750,
      currentRent: 72000,
      proposedRent: 86400,
      contractExpiry: "2026-11-15",
      noticeDate: "2026-07-15",
      noticeMethod: "whatsapp",
      noticeAgreement: "statutory_90",
      customNoticeDays: 90,
      landlordReason: "sale",
      threatenedEviction: true,
    },
  },
  {
    id: "jvc-moderate-increase",
    title: "Synthetic Demo 4: Indicative 10% Bracket",
    subtitle: "JVC 1BR • Synthetic case: Rent 26% below median; indicative 10% slab",
    data: {
      area: "Jumeirah Village Circle",
      subType: "Flat",
      sizeSqft: 800,
      currentRent: 48000,
      proposedRent: 65000,
      contractExpiry: "2026-11-01",
      noticeDate: "2026-07-01",
      noticeMethod: "email",
      noticeAgreement: "statutory_90",
      customNoticeDays: 90,
      landlordReason: "market",
      threatenedEviction: false,
    },
  },
  {
    id: "above-market-reduction",
    title: "Synthetic Demo 5: Rent Above Registered Median",
    subtitle: "Downtown Dubai • Synthetic case: Current rent exceeds registered median",
    data: {
      area: "Burj Khalifa",
      subType: "Flat",
      sizeSqft: 1100,
      currentRent: 215000,
      proposedRent: 230000,
      contractExpiry: "2026-11-01",
      noticeDate: "2026-07-01",
      noticeMethod: "email",
      noticeAgreement: "statutory_90",
      customNoticeDays: 90,
      landlordReason: "market",
      threatenedEviction: false,
    },
  },
];

export default function RenewalAgent({ benchmarks, asOf, windowMonths, initialQuestion = "" }: RenewalAgentProps) {
  const areas = useMemo(() => Array.from(new Set(benchmarks.map((b) => b.area))).sort(), [benchmarks]);

  // Conversational Ask Copilot State
  const [question, setQuestion] = useState(initialQuestion);
  const [askLoading, setAskLoading] = useState(false);
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const askedRef = useRef<string | null>(null);

  // Form State: Starts completely blank as required by P0-2
  const [facts, setFacts] = useState<TenancyFacts>(BLANK_FACTS);

  // Dynamic property types for selected area
  const subTypes = useMemo(() => {
    if (!facts.area) return ["Flat", "Villa", "Studio"];
    const list = Array.from(new Set(benchmarks.filter((b) => b.area === facts.area).map((b) => b.sub_type))).sort();
    return list.length ? list : ["Flat", "Villa", "Studio"];
  }, [benchmarks, facts.area]);

  // Execution & Approval States
  const [activeTab, setActiveTab] = useState<"analysis" | "script" | "roadmap" | "disclaimer">("analysis");
  const [acknowledgedFacts, setAcknowledgedFacts] = useState(false);
  const [acknowledgedDisclaimer, setAcknowledgedDisclaimer] = useState(false);
  const [approvedAction, setApprovedAction] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showPlanBreakdown, setShowPlanBreakdown] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Effective sub-type
  const effSub = subTypes.includes(facts.subType) ? facts.subType : subTypes[0] ?? "Flat";

  // Invalidate user approval whenever facts or inputs change (P0-4)
  const updateFacts = (patch: Partial<TenancyFacts>) => {
    setFacts((prev) => ({ ...prev, ...patch }));
    setApprovedAction(false);
    setAcknowledgedFacts(false);
    setAcknowledgedDisclaimer(false);
    setCopiedScript(false);
    setHasInteracted(true);
  };

  // Missing facts evaluation
  const missingInputs = useMemo(() => {
    const list: string[] = [];
    if (!facts.area) list.push("Community / Area");
    if (!facts.sizeSqft || Number(facts.sizeSqft) <= 0) list.push("Unit size (sqft)");
    if (!facts.currentRent || Number(facts.currentRent) <= 0) list.push("Current annual rent");
    if (!facts.contractExpiry) list.push("Lease expiry date");
    if (!facts.noticeDate) list.push("Notice receipt date");
    return list;
  }, [facts]);

  const hasRequiredFacts = missingInputs.length === 0;

  // Date Sequence Validation (P0-3)
  const dateValidation = useMemo(() => {
    if (!facts.contractExpiry || !facts.noticeDate) {
      return { isValid: false, isMissing: true, error: "Dates not provided" };
    }
    const expiry = new Date(facts.contractExpiry);
    const notice = new Date(facts.noticeDate);
    if (isNaN(expiry.getTime()) || isNaN(notice.getTime())) {
      return { isValid: false, isMissing: false, error: "Invalid date format" };
    }
    if (notice > expiry) {
      return { isValid: false, isMissing: false, error: "Notice date cannot be after contract expiry date" };
    }
    const diffTime = expiry.getTime() - notice.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { isValid: true, isMissing: false, diffDays, error: null };
  }, [facts.contractExpiry, facts.noticeDate]);

  // Notice Period Threshold Check (P0-3: Accounts for "unless otherwise agreed")
  const noticeAudit = useMemo(() => {
    if (!dateValidation.isValid || dateValidation.diffDays === undefined) {
      return { assessed: false, status: "incomplete", daysNotice: null };
    }
    const requiredDays = facts.noticeAgreement === "custom_agreed" ? Number(facts.customNoticeDays) || 90 : 90;
    const isCompliant = dateValidation.diffDays >= requiredDays;
    return {
      assessed: true,
      daysNotice: dateValidation.diffDays,
      requiredDays,
      isCompliant,
      noticeAgreement: facts.noticeAgreement,
    };
  }, [dateValidation, facts.noticeAgreement, facts.customNoticeDays]);

  // Benchmark Lookup and Calculation
  const rentResult = useMemo(() => {
    if (!facts.area || !facts.currentRent || !facts.sizeSqft) return null;
    return rentCheck(benchmarks, {
      area: facts.area,
      subType: effSub,
      sizeSqft: Number(facts.sizeSqft),
      currentRent: Number(facts.currentRent),
      isRenewal: true,
    });
  }, [benchmarks, facts.area, effSub, facts.sizeSqft, facts.currentRent]);

  // Indicative Benchmark Math
  const numCurrentRent = Number(facts.currentRent) || 0;
  const numProposedRent = Number(facts.proposedRent) || 0;
  const noticeTimelinePrecludes = noticeAudit.assessed && !noticeAudit.isCompliant;
  const indicativeSlabPct = noticeTimelinePrecludes ? 0 : rentResult ? rentResult.slabPct : 0;
  const indicativeCeiling = noticeTimelinePrecludes ? numCurrentRent : rentResult ? rentResult.maxNewRent : numCurrentRent;
  const diffVsIndicative = numProposedRent > indicativeCeiling ? numProposedRent - indicativeCeiling : 0;

  // Handle Preset Load
  const loadScenario = (scenarioId: string) => {
    const sc = SYNTHETIC_DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (sc) {
      setFacts(sc.data);
      setApprovedAction(false);
      setAcknowledgedFacts(false);
      setAcknowledgedDisclaimer(false);
      setCopiedScript(false);
      setHasInteracted(true);
    }
  };

  // Reset to blank
  const resetToBlank = () => {
    setFacts(BLANK_FACTS);
    setApprovedAction(false);
    setAcknowledgedFacts(false);
    setAcknowledgedDisclaimer(false);
    setCopiedScript(false);
    setAskResult(null);
    setQuestion("");
  };

  // Natural Language Ask Handler (P0-2: Does not silently merge with old preset values)
  async function handleAsk(queryText: string) {
    const text = queryText.trim();
    if (!text) return;
    setAskLoading(true);
    setAskResult(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text }),
      });
      const data = (await res.json()) as AskResponse;
      setAskResult(res.ok ? data : { question: text, answer: data.error ?? "Failed to analyze question.", source: "error", facts: null });

      // Synchronize ONLY newly detected facts; do not silently preserve stale inputs
      if (data.parsed) {
        updateFacts({
          area: (data.parsed.areas && data.parsed.areas[0]) ? data.parsed.areas[0] : facts.area,
          subType: data.parsed.subType ?? facts.subType,
          sizeSqft: data.parsed.sizeSqft ? data.parsed.sizeSqft : facts.sizeSqft,
          currentRent: data.parsed.rent ? data.parsed.rent : facts.currentRent,
          proposedRent: data.parsed.price ? data.parsed.price : facts.proposedRent,
        });
      }
    } catch {
      setAskResult({ question: text, answer: "The AI agent could not reach the server. Please try again.", source: "error", facts: null });
    } finally {
      setAskLoading(false);
    }
  }

  // Handle URL query parameter on initial mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial && askedRef.current !== initial) {
      askedRef.current = initial;
      setQuestion(initial);
      void handleAsk(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate Negotiation Preparation Draft
  const negotiationDraft = useMemo(() => {
    if (!hasRequiredFacts) return "";
    const todayStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const expiryFormatted = facts.contractExpiry
      ? new Date(facts.contractExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "[Expiry Date]";
    const noticeFormatted = facts.noticeDate
      ? new Date(facts.noticeDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "[Notice Date]";

    let noticeSection = "";
    if (noticeAudit.assessed && !noticeAudit.isCompliant) {
      noticeSection = `1. Notice Period Discussion (Reference: Law No. 33 of 2008, Article 14):
Our records show notice was received on ${noticeFormatted} (${noticeAudit.daysNotice} days prior to the tenancy expiration date of ${expiryFormatted}). Under Article 14 of Law No. 33 of 2008, standard tenancy amendments require at least 90 days' written notice prior to contract expiry, unless our tenancy agreement specifically agreed otherwise. On this basis, we propose renewing at the existing rental rate of ${fmtAed(numCurrentRent)}.`;
    } else {
      noticeSection = `1. Notice Period:
We acknowledge receipt of your notice on ${noticeFormatted} regarding the tenancy expiring on ${expiryFormatted}.`;
    }

    let benchmarkSection = "";
    if (rentResult) {
      const belowPctAbs = Math.abs(rentResult.belowMarketPct * 100).toFixed(1);
      benchmarkSection = `2. Rental Index & Registered Benchmark Reference (Decree No. 43 of 2013 Slabs):
Based on registered Ejari contracts published by the Dubai Land Department for ${facts.area} (median: ${fmtAed(rentResult.marketMedian)} across ${fmtInt(rentResult.bench.n)} comparable contracts), current rent of ${fmtAed(numCurrentRent)} sits ${belowPctAbs}% ${rentResult.belowMarketPct >= 0 ? "below" : "above"} the registered median.
Under the Decree No. 43 of 2013 bracket framework, the indicative increase benchmark is ${fmtPct(indicativeSlabPct, 0)}, corresponding to an indicative figure of ${fmtAed(indicativeCeiling)}. The requested figure of ${fmtAed(numProposedRent)} exceeds this benchmark by ${fmtAed(diffVsIndicative)}.
(Note: We also refer to the official Smart Rental Index calculator on the Dubai REST app to verify building classification rating).`;
    } else {
      benchmarkSection = `2. Rental Evaluation:
The proposed rental figure of ${fmtAed(numProposedRent)} appears above prevailing registered benchmarks. We propose referring to the official DLD Smart Rental Index on the Dubai REST app.`;
    }

    let evictionSection = "";
    if (facts.threatenedEviction) {
      evictionSection = `\n3. Eviction Notice Requirements (Reference: Law No. 33 of 2008, Article 25):
Regarding the mention of vacating the premises, please note that under Article 25(2) of Law No. 33 of 2008, eviction upon lease expiry for reasons such as sale or personal use requires a formal 12 months' written notice served exclusively through the Dubai Notary Public or by registered mail. Informal electronic messages do not constitute statutory notice.`;
    }

    return `Subject: Tenancy Contract Renewal Discussion - Unit in ${facts.area || "[Area]"} (Ejari Reference)

Date: ${todayStr}

Dear Landlord / Property Management Team,

Thank you for your correspondence regarding the renewal of our tenancy contract for the unit in ${facts.area || "[Area]"}, scheduled to expire on ${expiryFormatted}.

I am writing to respectfully discuss the proposed renewal terms in reference to the regulatory framework governing tenancy contracts in the Emirate of Dubai:

${noticeSection}

${benchmarkSection}
${evictionSection}

Proposed Next Step:
In accordance with prevailing market guidelines and registered benchmarks, I propose renewing the tenancy at ${fmtAed(indicativeCeiling)} per annum, maintaining our existing payment terms. 

Please review this proposal and let us know if we can proceed with issuing the renewal documents.

Sincerely,
[Tenant Name]
[Contact Number / Email]
[Unit Number]

---
Disclaimer: This draft was generated as an indicative negotiation aid based on open data and statutory rules. It does not constitute legal advice. Binding determinations are issued by the Dubai Rental Dispute Center (RDC).`;
  }, [hasRequiredFacts, facts, noticeAudit, rentResult, numCurrentRent, numProposedRent, indicativeSlabPct, indicativeCeiling, diffVsIndicative]);

  const handleCopyScript = () => {
    if (!approvedAction) {
      alert("Please review the preparation draft and confirm both verification checkboxes before copying.");
      return;
    }
    navigator.clipboard.writeText(negotiationDraft);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="renewal-agent-container">
      {/* Header Banner */}
      <div className="agent-hero card mb">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
              <span className="chip info">Personal AI Agent (Prototype)</span>
              <span className="chip muted">Indicative Preparation Aid</span>
              <span className="chip muted">DLD Open Data to {fmtDate(asOf)}</span>
            </div>
            <h1 style={{ margin: "0.2rem 0 0.5rem 0", fontSize: "1.8rem" }}>Dubai Renter Renewal Agent</h1>
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: "800px", fontSize: "0.95rem" }}>
              A goal-driven personal agent assisting Dubai tenants in preparing evidence for lease renewal discussions.
              Compares terms against Decree 43/2013 slabs, evaluates the 90-day notice timeline (Law 33/2008), screens eviction formalities,
              and generates an indicative negotiation preparation pack requiring your explicit review.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {hasInteracted && (
              <button onClick={resetToBlank} className="btn secondary" style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem" }}>
                Reset to Blank Case
              </button>
            )}
            <button
              onClick={() => setShowPlanBreakdown(!showPlanBreakdown)}
              className="btn secondary"
              style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem" }}
            >
              {showPlanBreakdown ? "Hide Agent Workflow" : "View Agent Workflow"}
            </button>
          </div>
        </div>

        {/* Visible Multi-Step Agent Execution Plan */}
        {showPlanBreakdown && (
          <div className="agent-plan-box mt" style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid var(--line)" }}>
            <h3 style={{ fontSize: "0.92rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--brand)" }}>
              Visible Multi-Step Agent Workflow
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem", marginTop: "0.6rem" }}>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 1: Fact Collection</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>Collects tenancy dates, notice timing, and rent details without preloaded assumptions.</p>
              </div>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 2: Notice Timeline</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>Audits Law 33/2008 Art 14 notice timeline (&quot;unless otherwise agreed&quot;).</p>
              </div>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 3: Benchmark Mapping</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>Applies Decree 43/2013 slabs to registered Ejari medians as an indicative guide.</p>
              </div>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 4: Formalities Check</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>Screens Law 33/2008 Art 25 eviction notice channel requirements.</p>
              </div>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 5: Human Review Gate</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>Renter reviews draft; changes immediately revoke approval to prevent unintended actions.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prominent Official Guidance Banner (P0-1 & P0-8) */}
      <div className="callout mb" style={{ background: "#eff6ff", borderColor: "#93c5fd", color: "#1e3a8a", fontSize: "0.85rem" }}>
        <strong>Important Regulatory Notice:</strong> This tool provides an <em>indicative preparation estimate</em> based on open-data Ejari transaction medians.
        It does not issue binding legal rulings. Official rent increase limits in Dubai are governed by the DLD Smart Rental Index and building classifications.
        For your official, legally binding determination, always consult the{" "}
        <a href="https://dubailand.gov.ae/en/frequently-asked-questions/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", fontWeight: 600 }}>
          official DLD Rental Calculator FAQs
        </a>{" "}
        or the{" "}
        <a href="https://rdc.gov.ae/en/frequently-asked-questions/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", fontWeight: 600 }}>
          Dubai Rental Dispute Center (RDC)
        </a>.
      </div>

      {/* Natural Language Copilot Bar */}
      <div className="card mb" style={{ border: "1px solid var(--line)", background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap", gap: "0.4rem" }}>
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>💬 Natural Language Copilot: Ask a Rent Question</h2>
          <span className="chip muted" style={{ fontSize: "0.75rem" }}>Privacy Safe • No PII Stored</span>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 0.5rem 0" }}>
          Ask a general question about Dubai market rents or describe your renewal situation. Extracted area and rent numbers will populate the form below.
        </p>

        <form
          className="askbar"
          onSubmit={(e) => {
            e.preventDefault();
            void handleAsk(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What is the market rent for an 850 sqft flat in Dubai Marina?"
            maxLength={300}
            style={{ fontSize: "0.92rem" }}
          />
          <button className="btn" type="submit" disabled={askLoading}>
            {askLoading ? "Analyzing..." : "Ask Copilot"}
          </button>
        </form>

        {/* Real-time Copilot Answer Card */}
        {askResult && (
          <div className="card mt" style={{ background: "#f8fafc", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
              <span className="small"><strong>Query:</strong> {askResult.question}</span>
              <span className="chip muted" style={{ fontSize: "0.75rem" }}>Source: {askResult.source}</span>
            </div>
            <div className="note" style={{ fontSize: "0.92rem", lineHeight: 1.5, color: "var(--ink)" }}>
              {askResult.answer}
            </div>
          </div>
        )}
      </div>

      {/* 1-Click Synthetic Demo Scenarios (P0-2 & P0-5: Explicitly labeled synthetic) */}
      <div className="card mb" style={{ background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
          <h3 style={{ fontSize: "0.88rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
            Synthetic Demo Scenarios (For Testing &amp; Evaluation Only)
          </h3>
          <span className="chip warn" style={{ fontSize: "0.72rem" }}>Synthetic Data • Not Real Tenant Records</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          {SYNTHETIC_DEMO_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => loadScenario(sc.id)}
              className="chip-btn"
              style={{
                background: facts.contractExpiry === sc.data.contractExpiry && facts.currentRent === sc.data.currentRent ? "var(--brand)" : "#f1f5f9",
                color: facts.contractExpiry === sc.data.contractExpiry && facts.currentRent === sc.data.currentRent ? "#fff" : "var(--ink)",
                border: "1px solid var(--line)",
                textAlign: "left",
                padding: "0.4rem 0.7rem",
              }}
            >
              <strong>{sc.title}</strong>
              <div style={{ fontSize: "0.75rem", opacity: 0.85 }}>{sc.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Tenancy Facts vs Agent Assessment */}
      <div className="grid two">
        {/* Left Column: Tenancy Facts Input */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
            <h2>1. Tenancy Facts</h2>
            <span className="chip info">Renter Inputs</span>
          </div>

          <div className="form">
            <label className="field">
              Community / Area *
              <select value={facts.area} onChange={(e) => updateFacts({ area: e.target.value })}>
                <option value="">-- Select Community --</option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>

            <label className="field">
              Property Type *
              <select value={effSub} onChange={(e) => updateFacts({ subType: e.target.value })}>
                {subTypes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="field">
              Unit Size (sqft) *
              <input
                type="number"
                min={100}
                step={10}
                placeholder="e.g. 850"
                value={facts.sizeSqft}
                onChange={(e) => updateFacts({ sizeSqft: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </label>

            <label className="field">
              Current Annual Rent (AED) *
              <input
                type="number"
                min={5000}
                step={1000}
                placeholder="e.g. 85000"
                value={facts.currentRent}
                onChange={(e) => updateFacts({ currentRent: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </label>

            <label className="field">
              Landlord&apos;s Proposed Rent (AED)
              <input
                type="number"
                min={5000}
                step={1000}
                placeholder="e.g. 98000"
                value={facts.proposedRent}
                onChange={(e) => updateFacts({ proposedRent: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </label>

            <label className="field">
              Current Lease Expiry Date *
              <input
                type="date"
                value={facts.contractExpiry}
                onChange={(e) => updateFacts({ contractExpiry: e.target.value })}
              />
            </label>

            <label className="field">
              Notice Received Date *
              <input
                type="date"
                value={facts.noticeDate}
                onChange={(e) => updateFacts({ noticeDate: e.target.value })}
              />
            </label>

            <label className="field">
              Contract Notice Period Term (P0-3)
              <select
                value={facts.noticeAgreement}
                onChange={(e) => updateFacts({ noticeAgreement: e.target.value as TenancyFacts["noticeAgreement"] })}
              >
                <option value="statutory_90">Standard statutory (at least 90 days)</option>
                <option value="custom_agreed">Custom period specified in contract</option>
                <option value="unknown">Not sure / Default statutory</option>
              </select>
            </label>

            {facts.noticeAgreement === "custom_agreed" && (
              <label className="field">
                Agreed Notice Days in Contract
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={facts.customNoticeDays}
                  onChange={(e) => updateFacts({ customNoticeDays: Number(e.target.value) })}
                />
              </label>
            )}

            <label className="field">
              Notice Delivery Channel (P0-3)
              <select
                value={facts.noticeMethod}
                onChange={(e) => updateFacts({ noticeMethod: e.target.value as TenancyFacts["noticeMethod"] })}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp / SMS</option>
                <option value="registered_mail">Registered Mail</option>
                <option value="notary">Notary Public (Formal Legal Notice)</option>
                <option value="verbal">Verbal / Phone call</option>
                <option value="none">No formal notice yet</option>
              </select>
            </label>

            <label className="field">
              Landlord Stated Reason
              <select
                value={facts.landlordReason}
                onChange={(e) => updateFacts({ landlordReason: e.target.value as TenancyFacts["landlordReason"] })}
              >
                <option value="market">Market Rent Adjustment</option>
                <option value="sale">Intention to Sell Property</option>
                <option value="personal_use">Personal Use / First-degree Kin</option>
                <option value="renovation">Major Renovation / Demolition</option>
                <option value="unspecified">Unspecified / Other</option>
              </select>
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  id="threatenedEviction"
                  checked={facts.threatenedEviction}
                  onChange={(e) => updateFacts({ threatenedEviction: e.target.checked })}
                  style={{ width: "18px", height: "18px" }}
                />
                <label htmlFor="threatenedEviction" style={{ cursor: "pointer", fontSize: "0.88rem", color: "var(--ink)" }}>
                  Landlord indicated property must be vacated if the new rent is not accepted
                </label>
              </div>
            </label>
          </div>

          {/* Date Sequence Error Notice (P0-3) */}
          {!dateValidation.isValid && !dateValidation.isMissing && (
            <div className="callout mt" style={{ background: "#fee2e2", borderColor: "#ef4444", color: "#991b1b" }}>
              <strong>Date Sequence Error:</strong> {dateValidation.error}. Please check that your notice date precedes your contract expiry date.
            </div>
          )}

          {/* Missing Fields Prompt (P0-2) */}
          {!hasRequiredFacts && (
            <div className="callout mt" style={{ background: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" }}>
              <strong>Missing Information:</strong> Please provide the following to generate an assessment:{" "}
              {missingInputs.join(", ")}.
            </div>
          )}

          {facts.area && facts.sizeSqft && (
            <p className="hint mt">
              Benchmark matching: Size band {sizeBandOf(Number(facts.sizeSqft) / 10.7639)} sqm in {facts.area}.
              Benchmarks drawn from 12 months of registered Ejari renewals (as of {fmtDate(asOf)}).
            </p>
          )}
        </div>

        {/* Right Column: Agent Assessment & Action Pack */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.4rem" }}>
            <h2>2. Preparation Assessment &amp; Pack</h2>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              <button
                className={`chip-btn ${activeTab === "analysis" ? "active" : ""}`}
                onClick={() => setActiveTab("analysis")}
                style={{ background: activeTab === "analysis" ? "var(--brand)" : "#f1f5f9", color: activeTab === "analysis" ? "#fff" : "inherit" }}
              >
                Assessment
              </button>
              <button
                className={`chip-btn ${activeTab === "script" ? "active" : ""}`}
                onClick={() => setActiveTab("script")}
                style={{ background: activeTab === "script" ? "var(--brand)" : "#f1f5f9", color: activeTab === "script" ? "#fff" : "inherit" }}
              >
                Preparation Draft
              </button>
              <button
                className={`chip-btn ${activeTab === "roadmap" ? "active" : ""}`}
                onClick={() => setActiveTab("roadmap")}
                style={{ background: activeTab === "roadmap" ? "var(--brand)" : "#f1f5f9", color: activeTab === "roadmap" ? "#fff" : "inherit" }}
              >
                RDC Escalation
              </button>
            </div>
          </div>

          {/* State when required facts are missing */}
          {!hasRequiredFacts || !dateValidation.isValid ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
              <h3 style={{ color: "var(--ink)", fontSize: "1.05rem" }}>Unable to Assess — Missing Required Information</h3>
              <p style={{ maxWidth: "420px", margin: "0.4rem auto 1rem", fontSize: "0.85rem" }}>
                The agent requires your community, unit size, current rent, and validated notice/expiry dates before producing an indicative assessment or draft.
              </p>
              <button
                onClick={() => loadScenario("untimely-notice")}
                className="btn secondary"
                style={{ fontSize: "0.82rem" }}
              >
                Load Synthetic Demo Case to Preview
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: Assessment & Benchmarks */}
              {activeTab === "analysis" && (
                <div>
                  {/* Top Verdict Banner (P0-1: No legal ruling claims) */}
                  <div className={`verdict ${noticeTimelinePrecludes ? "good" : indicativeSlabPct === 0 ? "good" : "info"}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <div className="big" style={{ fontSize: "1.15rem" }}>
                          {noticeTimelinePrecludes
                            ? "Indicative Finding: Notice Timeline May Preclude Increase"
                            : indicativeSlabPct === 0
                            ? "Indicative Benchmark: 0% Permitted Increase"
                            : `Indicative Benchmark: Up to ${fmtPct(indicativeSlabPct, 0)} Increase`}
                        </div>
                        <div style={{ marginTop: "0.3rem", fontSize: "0.88rem" }}>
                          {noticeTimelinePrecludes ? (
                            <span>
                              Notice recorded <strong>{noticeAudit.daysNotice} days</strong> before expiry (statutory default is 90 days unless contract specified otherwise).
                              Indicative renewal figure remains current rent of <strong>{fmtAed(numCurrentRent)}</strong>.
                            </span>
                          ) : rentResult ? (
                            <span>
                              Landlord proposed <strong>{fmtAed(numProposedRent)}</strong>.
                              Indicative benchmark ceiling under Decree 43/2013 slabs is <strong>{fmtAed(indicativeCeiling)}</strong>.
                            </span>
                          ) : (
                            <span>Insufficient comparable Ejari records in this cell. Please check the official Smart Rental Index.</span>
                          )}
                        </div>
                      </div>
                      {diffVsIndicative > 0 && (
                        <div style={{ textAlign: "right" }}>
                          <span className="chip warn" style={{ fontSize: "0.8rem", padding: "0.25rem 0.55rem" }}>
                            Amount above benchmark: {fmtAed(diffVsIndicative)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notice & Slab Breakdown */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
                    <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}>
                      <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                        Notice Timeline (Law 33/2008 Art 14)
                      </div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.2rem" }}>
                        {noticeAudit.daysNotice} Days Notice
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                        {noticeAudit.isCompliant
                          ? "Meets statutory timeline."
                          : `Less than ${noticeAudit.requiredDays} days required by default.`}
                      </div>
                    </div>

                    <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}>
                      <div style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                        Decree 43/2013 Slabs (Open Data)
                      </div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.2rem" }}>
                        {fmtPct(indicativeSlabPct, 0)} Indicative Bracket
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                        {rentResult ? `Current rent is ${(Math.abs(rentResult.belowMarketPct) * 100).toFixed(0)}% vs median.` : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Benchmark Numbers */}
                  {rentResult && (
                    <ul className="list mt">
                      <li><span>Current Annual Rent</span><strong>{fmtAed(numCurrentRent)}</strong></li>
                      <li><span>Landlord Proposed Rent</span><strong>{fmtAed(numProposedRent)}</strong></li>
                      <li><span>Indicative Benchmark Ceiling</span><strong>{fmtAed(indicativeCeiling)}</strong></li>
                      <li><span>Registered Ejari Median</span><strong>{fmtAed(rentResult.marketMedian)}</strong></li>
                      <li><span>Registered Evidence Count</span><strong>{fmtInt(rentResult.bench.n)} contracts ({rentResult.levelLabel})</strong></li>
                      <li><span>Typical Range (p25–p75)</span><strong>{fmtAed(rentResult.marketLow)} to {fmtAed(rentResult.marketHigh)}</strong></li>
                    </ul>
                  )}

                  {/* Eviction Notice Formalities Check */}
                  {facts.threatenedEviction && (
                    <div className="callout mt" style={{ background: "#fef3c7", borderColor: "#f59e0b", color: "#92400e", fontSize: "0.82rem" }}>
                      <strong>Eviction Formalities Requirement (Law 33/2008 Art 25):</strong>
                      <p style={{ margin: "0.2rem 0 0" }}>
                        If a landlord requests property recovery for sale, renovation, or personal use upon lease expiry,
                        Article 25(2) requires a 12-month notice served specifically through the <strong>Dubai Notary Public or registered mail</strong>.
                        Informal digital correspondence does not meet this statutory standard.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Draft Negotiation Letter with Invalidation Gate (P0-4) */}
              {activeTab === "script" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Negotiation Preparation Draft</span>
                    <span className="chip muted" style={{ fontSize: "0.75rem" }}>Human Review Gate</span>
                  </div>

                  <textarea
                    value={negotiationDraft}
                    readOnly
                    rows={11}
                    style={{
                      width: "100%",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "0.8rem",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                      background: "#f8fafc",
                      color: "var(--ink)",
                      lineHeight: 1.45,
                    }}
                  />

                  {/* Human-in-the-Loop Review Gate */}
                  <div style={{ marginTop: "1rem", padding: "0.85rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--line)" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                      Mandatory Review Gate (Must Re-Confirm If Any Input Changes)
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", marginBottom: "0.3rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={acknowledgedFacts}
                        onChange={(e) => setAcknowledgedFacts(e.target.checked)}
                      />
                      I have verified my contract dates and rent amounts against my official Ejari certificate.
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", marginBottom: "0.4rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={acknowledgedDisclaimer}
                        onChange={(e) => setAcknowledgedDisclaimer(e.target.checked)}
                      />
                      I understand this draft is an indicative negotiation aid, not formal legal representation.
                    </label>

                    <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.6rem", alignItems: "center" }}>
                      <button
                        onClick={() => {
                          if (!acknowledgedFacts || !acknowledgedDisclaimer) {
                            alert("Please check both verification boxes to confirm your review.");
                            return;
                          }
                          setApprovedAction(true);
                        }}
                        className="btn"
                        style={{ background: approvedAction ? "var(--good)" : "var(--brand-2)", fontSize: "0.85rem" }}
                      >
                        {approvedAction ? "✓ Draft Approved" : "Approve Draft for Personal Use"}
                      </button>

                      <button
                        onClick={handleCopyScript}
                        disabled={!approvedAction}
                        className="btn secondary"
                        style={{ fontSize: "0.85rem", opacity: approvedAction ? 1 : 0.5, cursor: approvedAction ? "pointer" : "not-allowed" }}
                      >
                        {copiedScript ? "✓ Copied to Clipboard!" : "Copy Draft to Clipboard"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RDC Escalation Roadmap */}
              {activeTab === "roadmap" && (
                <div>
                  <h3 style={{ fontSize: "0.95rem", marginBottom: "0.4rem" }}>Dispute Prevention Roadmap: Next Steps if Renewal is Contested</h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 0.8rem 0" }}>
                    If discussions cannot be resolved amicably, Dubai law provides official reconciliation procedures:
                  </p>

                  <div style={{ display: "grid", gap: "0.6rem" }}>
                    <div style={{ padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", fontSize: "0.82rem" }}>
                      <strong>1. Official DLD Smart Rental Index Check</strong>
                      <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>
                        Verify your building&apos;s specific star rating and official benchmark on the Dubai REST app.
                      </p>
                    </div>
                    <div style={{ padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", fontSize: "0.82rem" }}>
                      <strong>2. Written Proposal via Traceable Channel</strong>
                      <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>
                        Share your proposal citing statutory articles via email or registered communication. Keep delivery receipts.
                      </p>
                    </div>
                    <div style={{ padding: "0.65rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", fontSize: "0.82rem" }}>
                      <strong>3. RDC &quot;Offer and Deposit&quot; Procedure</strong>
                      <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>
                        If the landlord refuses cheques at the legally determined rate, deposit the renewal cheques with the Rental Dispute Center.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
