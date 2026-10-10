"use client";

import { useState, useMemo } from "react";
import type { RentBenchmark } from "@/lib/types";
import { rentCheck, sizeBandOf } from "@/lib/engine";
import { fmtAed, fmtInt, fmtPct, fmtDate } from "@/lib/format";

interface RenewalAgentProps {
  benchmarks: RentBenchmark[];
  asOf: string;
  windowMonths: number;
}

interface TenancyFacts {
  area: string;
  subType: string;
  sizeSqft: number;
  currentRent: number;
  proposedRent: number;
  contractExpiry: string;
  noticeDate: string;
  noticeMethod: "email" | "whatsapp" | "notary" | "verbal" | "none";
  landlordReason: "market" | "sale" | "renovation" | "personal_use" | "unspecified";
  threatenedEviction: boolean;
}

const PRESET_SCENARIOS: Array<{
  id: string;
  title: string;
  subtitle: string;
  data: TenancyFacts;
}> = [
  {
    id: "untimely-notice",
    title: "Scenario 1: Untimely Notice (60-day violation)",
    subtitle: "Dubai Marina 1BR • Landlord asks +15% but sent notice 60 days before expiry",
    data: {
      area: "Dubai Marina",
      subType: "Flat",
      sizeSqft: 850,
      currentRent: 85000,
      proposedRent: 98000,
      contractExpiry: "2026-12-15",
      noticeDate: "2026-10-18", // ~58 days out
      noticeMethod: "email",
      landlordReason: "market",
      threatenedEviction: false,
    },
  },
  {
    id: "marina-zero-increase",
    title: "Scenario 2: Within 10% of Market Median",
    subtitle: "Dubai Marina 1BR • Landlord asks AED 105k (+19%) but legal cap is 0%",
    data: {
      area: "Dubai Marina",
      subType: "Flat",
      sizeSqft: 850,
      currentRent: 88000,
      proposedRent: 105000,
      contractExpiry: "2027-02-01",
      noticeDate: "2026-10-01", // >90 days
      noticeMethod: "email",
      landlordReason: "market",
      threatenedEviction: false,
    },
  },
  {
    id: "eviction-threat-sale",
    title: "Scenario 3: Fake Eviction Threat (Sale Claim)",
    subtitle: "Business Bay • Landlord says: 'Pay +20% or vacate for sale' via WhatsApp",
    data: {
      area: "Business Bay",
      subType: "Flat",
      sizeSqft: 750,
      currentRent: 72000,
      proposedRent: 86400,
      contractExpiry: "2027-02-15",
      noticeDate: "2026-10-05",
      noticeMethod: "whatsapp",
      landlordReason: "sale",
      threatenedEviction: true,
    },
  },
  {
    id: "jvc-moderate-increase",
    title: "Scenario 4: Partial Increase Allowed (10% Cap)",
    subtitle: "JVC 1BR • Rent 26% below market • Slabs allow 10%, landlord demands 35%",
    data: {
      area: "Jumeirah Village Circle",
      subType: "Flat",
      sizeSqft: 800,
      currentRent: 48000,
      proposedRent: 65000,
      contractExpiry: "2027-03-01",
      noticeDate: "2026-10-10",
      noticeMethod: "email",
      landlordReason: "market",
      threatenedEviction: false,
    },
  },
  {
    id: "above-market-reduction",
    title: "Scenario 5: Rent Above Market Median",
    subtitle: "Downtown Dubai • Current rent is above median • Tenant reduction case",
    data: {
      area: "Burj Khalifa",
      subType: "Flat",
      sizeSqft: 1100,
      currentRent: 215000,
      proposedRent: 230000,
      contractExpiry: "2027-02-28",
      noticeDate: "2026-10-01",
      noticeMethod: "email",
      landlordReason: "market",
      threatenedEviction: false,
    },
  },
];

export default function RenewalAgent({ benchmarks, asOf, windowMonths }: RenewalAgentProps) {
  // Available communities
  const areas = useMemo(() => Array.from(new Set(benchmarks.map((b) => b.area))).sort(), [benchmarks]);

  // Form State
  const [facts, setFacts] = useState<TenancyFacts>(PRESET_SCENARIOS[0].data);

  // Dynamic property types for selected area
  const subTypes = useMemo(() => {
    const list = Array.from(new Set(benchmarks.filter((b) => b.area === facts.area).map((b) => b.sub_type))).sort();
    return list.length ? list : ["Flat", "Villa", "Studio"];
  }, [benchmarks, facts.area]);

  // Execution & approval states
  const [activeTab, setActiveTab] = useState<"analysis" | "script" | "roadmap">("analysis");
  const [acknowledgedFacts, setAcknowledgedFacts] = useState(false);
  const [acknowledgedDisclaimer, setAcknowledgedDisclaimer] = useState(false);
  const [approvedAction, setApprovedAction] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showPlanBreakdown, setShowPlanBreakdown] = useState(true);

  // Calculated properties
  const effSub = subTypes.includes(facts.subType) ? facts.subType : subTypes[0] ?? "Flat";

  // Days Notice Calculation
  const noticeCalculation = useMemo(() => {
    if (!facts.contractExpiry || !facts.noticeDate) {
      return { daysNotice: null, isCompliant: false, isMissingData: true };
    }
    const expiry = new Date(facts.contractExpiry);
    const notice = new Date(facts.noticeDate);
    const diffTime = expiry.getTime() - notice.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      daysNotice: diffDays,
      isCompliant: diffDays >= 90,
      isMissingData: false,
      isNegative: diffDays < 0,
    };
  }, [facts.contractExpiry, facts.noticeDate]);

  // Rent Check Engine Calculation
  const rentResult = useMemo(() => {
    return rentCheck(benchmarks, {
      area: facts.area,
      subType: effSub,
      sizeSqft: facts.sizeSqft,
      currentRent: facts.currentRent,
      isRenewal: true,
    });
  }, [benchmarks, facts.area, effSub, facts.sizeSqft, facts.currentRent]);

  // Notice rule override: If notice was served less than 90 days before expiry, Law 33/2008 Art 14 bars any increase
  const noticeBarred = noticeCalculation.isCompliant === false && !noticeCalculation.isMissingData;
  const effectiveMaxIncreasePct = noticeBarred ? 0 : rentResult ? rentResult.slabPct : 0;
  const effectiveMaxNewRent = noticeBarred ? facts.currentRent : rentResult ? rentResult.maxNewRent : facts.currentRent;
  const demandIncreasePct = facts.currentRent > 0 ? (facts.proposedRent - facts.currentRent) / facts.currentRent : 0;
  const excessDemandAed = Math.max(0, facts.proposedRent - effectiveMaxNewRent);
  const isDemandUnlawful = facts.proposedRent > effectiveMaxNewRent;

  // Eviction validity
  const isEvictionThreatActive = facts.threatenedEviction || facts.landlordReason === "sale" || facts.landlordReason === "personal_use" || facts.landlordReason === "renovation";
  const isNotaryNoticeServed = facts.noticeMethod === "notary";

  // Handle Preset Load
  const loadScenario = (scenarioId: string) => {
    const sc = PRESET_SCENARIOS.find((s) => s.id === scenarioId);
    if (sc) {
      setFacts(sc.data);
      setApprovedAction(false);
      setCopiedScript(false);
      setAcknowledgedFacts(false);
      setAcknowledgedDisclaimer(false);
    }
  };

  // Generate Formal Landlord Communication Script
  const negotiationDraft = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const expiryFormatted = facts.contractExpiry
      ? new Date(facts.contractExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "[Expiry Date]";
    const noticeFormatted = facts.noticeDate
      ? new Date(facts.noticeDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "[Notice Date]";

    let proceduralParagraph = "";
    if (noticeBarred) {
      proceduralParagraph = `1. Statutory Notice Period (Law No. 33 of 2008, Article 14):
Your notice dated ${noticeFormatted} was received ${noticeCalculation.daysNotice} days prior to the tenancy expiration date (${expiryFormatted}). Under Article 14 of Law No. 26 of 2007 (as amended by Law No. 33 of 2008), any amendment to the tenancy terms or rental value requires a minimum of 90 days' written notice prior to contract expiry. As this statutory notice deadline was not met, the tenancy renews at the existing rental rate of ${fmtAed(facts.currentRent)}.`;
    } else {
      proceduralParagraph = `1. Notice Period:
We acknowledge receipt of your notice on ${noticeFormatted} regarding the tenancy expiring on ${expiryFormatted}.`;
    }

    let rentalCapParagraph = "";
    if (rentResult) {
      const belowPctAbs = Math.abs(rentResult.belowMarketPct * 100).toFixed(1);
      if (noticeBarred) {
        rentalCapParagraph = `2. Rental Index Evaluation (Decree No. 43 of 2013):
Notwithstanding the notice timeline, the current rent of ${fmtAed(facts.currentRent)} is within the permissible benchmark. Under Decree No. 43 of 2013, the maximum permitted increase based on official registered Ejari contracts (median: ${fmtAed(rentResult.marketMedian)} across ${fmtInt(rentResult.bench.n)} comparable registrations in ${facts.area}) is ${fmtPct(rentResult.slabPct, 0)}. However, due to the statutory notice timeline, the existing rate applies.`;
      } else if (rentResult.slabPct === 0) {
        rentalCapParagraph = `2. Rental Index Evaluation (Decree No. 43 of 2013):
According to the official registered market benchmarks for ${facts.area} (${rentResult.bench.sub_type}, size band ${rentResult.bench.size_band}, based on ${fmtInt(rentResult.bench.n)} registered Ejari contracts, median ${fmtAed(rentResult.marketMedian)}), the current annual rent of ${fmtAed(facts.currentRent)} sits ${rentResult.belowMarketPct < 0 ? "above" : "within 10% of"} the market median (gap: ${belowPctAbs}%). Under Article 1 of Decree No. 43 of 2013, landlords are permitted a 0% increase. The requested amount of ${fmtAed(facts.proposedRent)} exceeds the legal ceiling by ${fmtAed(excessDemandAed)}.`;
      } else {
        rentalCapParagraph = `2. Rental Index Evaluation (Decree No. 43 of 2013):
Based on the registered market benchmark for ${facts.area} (median: ${fmtAed(rentResult.marketMedian)} across ${fmtInt(rentResult.bench.n)} registered Ejari contracts), the current annual rent of ${fmtAed(facts.currentRent)} is ${belowPctAbs}% below the registered median. Under Decree No. 43 of 2013, the permitted increase bracket is strictly capped at ${fmtPct(rentResult.slabPct, 0)}, establishing a legal ceiling of ${fmtAed(rentResult.maxNewRent)}. The requested amount of ${fmtAed(facts.proposedRent)} exceeds this statutory cap by ${fmtAed(excessDemandAed)}.`;
      }
    } else {
      rentalCapParagraph = `2. Rental Evaluation:
The proposed rental increase of ${fmtAed(facts.proposedRent)} exceeds the established market standard. We refer to the official Dubai Land Department / RERA Smart Rental Index guidelines.`;
    }

    let evictionParagraph = "";
    if (isEvictionThreatActive) {
      evictionParagraph = `\n3. Eviction Notice Requirements (Law No. 33 of 2008, Article 25):
Regarding the mention of property vacation for ${facts.landlordReason === "sale" ? "sale" : facts.landlordReason === "personal_use" ? "personal use" : "renovation"}, please note that under Article 25(2) of Law No. 33 of 2008, eviction upon contract expiry requires a formal 12 months' written notice served exclusively through the Dubai Notary Public or by registered mail. Ordinary digital correspondence or WhatsApp does not constitute valid legal notice. Furthermore, in the event of personal recovery, the law restricts re-leasing the premises to third parties for a mandatory period of two years.`;
    }

    return `Subject: Tenancy Contract Renewal - Unit in ${facts.area} (Ejari Reference)

Date: ${todayStr}

Dear Landlord / Property Management Team,

Thank you for your correspondence regarding the renewal of our tenancy contract for the unit in ${facts.area}, scheduled to expire on ${expiryFormatted}.

I am writing to formally confirm my intention to renew the lease for the forthcoming 12-month period. Having reviewed the proposed renewal terms in accordance with the regulatory framework governing landlord-tenant relations in the Emirate of Dubai, I wish to highlight the following points:

${proceduralParagraph}

${rentalCapParagraph}
${evictionParagraph}

Proposed Resolution:
In accordance with Dubai Land Department regulations, I respectfully propose renewing the contract at the legally compliant rate of ${fmtAed(effectiveMaxNewRent)} per annum, maintaining the existing payment terms and conditions.

I kindly request that you prepare the updated renewal contract and Ejari registration documents reflecting this amount so that we may execute the renewal and provide the rental cheques in a timely manner.

Thank you for your understanding and continuous cooperation.

Sincerely,
[Tenant Name]
[Contact Number / Email]
[Unit Number]`;
  }, [facts, noticeCalculation, rentResult, noticeBarred, effectiveMaxNewRent, excessDemandAed, isEvictionThreatActive]);

  const handleCopyScript = () => {
    if (!approvedAction) {
      alert("Please review the facts and check the approval boxes below before copying the draft.");
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span className="chip good">Personal AI Agent</span>
              <span className="chip info">Dubai Tenancy Law Compliant</span>
              <span className="chip muted">DLD Data to {fmtDate(asOf)}</span>
            </div>
            <h1 style={{ margin: "0.2rem 0 0.5rem 0", fontSize: "1.8rem" }}>Dubai Renter Renewal Agent</h1>
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: "750px", fontSize: "0.95rem" }}>
              A goal-driven personal agent that audits your landlord&apos;s rent renewal demand against verified Dubai laws
              (Decree 43/2013 &amp; Law 33/2008), checks the 90-day notice rule, cross-references registered Ejari contracts,
              and generates a legally sound negotiation pack requiring your explicit approval.
            </p>
          </div>
          <button
            onClick={() => setShowPlanBreakdown(!showPlanBreakdown)}
            className="btn secondary"
            style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem" }}
          >
            {showPlanBreakdown ? "Hide Agent Workflow" : "View Agent Workflow"}
          </button>
        </div>

        {/* Visible Agent Reasoning & Plan Execution */}
        {showPlanBreakdown && (
          <div className="agent-plan-box mt" style={{ background: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid var(--line)" }}>
            <h3 style={{ fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--brand)" }}>
              Visible Multi-Step Agent Execution Plan
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem", marginTop: "0.6rem" }}>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 1: Notice Audit</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>Verify 90-day statutory deadline under Law 33/2008 Art 14.</p>
              </div>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 2: Statutory Cap</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>Apply Decree 43/2013 slabs (0%, 5%, 10%, 15%, 20%).</p>
              </div>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 3: Ground Evidence</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>Pull {rentResult ? rentResult.bench.n : "registered"} Ejari contracts &amp; highlight SRI star ratings.</p>
              </div>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 4: Eviction Defense</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>Screen Law 33/2008 Art 25 12-month Notary Public notice.</p>
              </div>
              <div style={{ padding: "0.6rem", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.82rem" }}>
                <strong>Step 5: Human Approval</strong>
                <p style={{ margin: "0.2rem 0 0", color: "var(--muted)" }}>User reviews facts, approves script, prevents unintended actions.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Quick Loader */}
      <div className="card mb" style={{ background: "#fff" }}>
        <h3 style={{ fontSize: "0.9rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Load Test Scenarios (1-Click Evaluation)
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
          {PRESET_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => loadScenario(sc.id)}
              className="chip-btn"
              style={{
                background: facts.contractExpiry === sc.data.contractExpiry && facts.currentRent === sc.data.currentRent ? "var(--brand)" : "#f1f5f9",
                color: facts.contractExpiry === sc.data.contractExpiry && facts.currentRent === sc.data.currentRent ? "#fff" : "var(--ink)",
                border: "1px solid var(--line)",
                textAlign: "left",
                padding: "0.4rem 0.75rem",
              }}
            >
              <strong>{sc.title}</strong>
              <div style={{ fontSize: "0.75rem", opacity: 0.85 }}>{sc.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Tenancy Facts vs Agent Output */}
      <div className="grid two">
        {/* Left Column: Tenancy Facts Input */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
            <h2>1. Tenancy &amp; Notice Facts</h2>
            <span className="chip info">Renter Inputs</span>
          </div>

          <div className="form">
            <label className="field">
              Community / Area
              <select value={facts.area} onChange={(e) => setFacts({ ...facts, area: e.target.value })}>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>

            <label className="field">
              Property Type
              <select value={effSub} onChange={(e) => setFacts({ ...facts, subType: e.target.value })}>
                {subTypes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="field">
              Size (sqft)
              <input
                type="number"
                min={100}
                step={10}
                value={facts.sizeSqft}
                onChange={(e) => setFacts({ ...facts, sizeSqft: Number(e.target.value) })}
              />
            </label>

            <label className="field">
              Current Annual Rent (AED)
              <input
                type="number"
                min={5000}
                step={1000}
                value={facts.currentRent}
                onChange={(e) => setFacts({ ...facts, currentRent: Number(e.target.value) })}
              />
            </label>

            <label className="field">
              Landlord&apos;s Proposed Rent (AED)
              <input
                type="number"
                min={5000}
                step={1000}
                value={facts.proposedRent}
                onChange={(e) => setFacts({ ...facts, proposedRent: Number(e.target.value) })}
              />
            </label>

            <label className="field">
              Current Lease Expiry Date
              <input
                type="date"
                value={facts.contractExpiry}
                onChange={(e) => setFacts({ ...facts, contractExpiry: e.target.value })}
              />
            </label>

            <label className="field">
              Notice Date from Landlord
              <input
                type="date"
                value={facts.noticeDate}
                onChange={(e) => setFacts({ ...facts, noticeDate: e.target.value })}
              />
            </label>

            <label className="field">
              Notice Delivery Channel
              <select
                value={facts.noticeMethod}
                onChange={(e) => setFacts({ ...facts, noticeMethod: e.target.value as TenancyFacts["noticeMethod"] })}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp / SMS</option>
                <option value="notary">Notary Public (Official Legal Notice)</option>
                <option value="verbal">Verbal / Phone call</option>
                <option value="none">No formal notice yet</option>
              </select>
            </label>

            <label className="field">
              Landlord Stated Reason
              <select
                value={facts.landlordReason}
                onChange={(e) => setFacts({ ...facts, landlordReason: e.target.value as TenancyFacts["landlordReason"] })}
              >
                <option value="market">Standard Market Rent Adjustment</option>
                <option value="sale">Intention to Sell Property</option>
                <option value="personal_use">Personal Use / First-degree Kin</option>
                <option value="renovation">Major Renovation / Demolition</option>
                <option value="unspecified">Unspecified / Take-it-or-leave-it</option>
              </select>
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  id="threatenedEviction"
                  checked={facts.threatenedEviction}
                  onChange={(e) => setFacts({ ...facts, threatenedEviction: e.target.checked })}
                  style={{ width: "18px", height: "18px" }}
                />
                <label htmlFor="threatenedEviction" style={{ cursor: "pointer", fontSize: "0.88rem", color: "var(--ink)" }}>
                  Landlord threatened eviction if the higher rent is not accepted
                </label>
              </div>
            </label>
          </div>

          {/* Missing data / Clarification Alerts */}
          {noticeCalculation.isMissingData && (
            <div className="callout mt" style={{ background: "#fef3c7", borderColor: "#f59e0b" }}>
              <strong>Clarification Needed:</strong> Please enter your tenancy contract expiry date and notice date to
              verify compliance with the Dubai 90-day statutory notice rule.
            </div>
          )}

          {facts.threatenedEviction && !isNotaryNoticeServed && (
            <div className="callout mt" style={{ background: "#fee2e2", borderColor: "#ef4444", color: "#991b1b" }}>
              <strong>Eviction Threat Warning:</strong> The landlord is threatening eviction without an official Notary Public
              notice. Under Law 33/2008 Art 25, digital or verbal eviction demands are legally null and void.
            </div>
          )}

          <p className="hint mt">
            Data matching: Size band {sizeBandOf(facts.sizeSqft / 10.7639)} sqm in {facts.area}. Benchmarks drawn from {windowMonths} months of registered Ejari renewals (as of {fmtDate(asOf)}).
          </p>
        </div>

        {/* Right Column: Agentic Analysis & Action Pack */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
            <h2>2. Agent Assessment &amp; Action Pack</h2>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              <button
                className={`chip-btn ${activeTab === "analysis" ? "active" : ""}`}
                onClick={() => setActiveTab("analysis")}
                style={{ background: activeTab === "analysis" ? "var(--brand)" : "#f1f5f9", color: activeTab === "analysis" ? "#fff" : "inherit" }}
              >
                Verdict
              </button>
              <button
                className={`chip-btn ${activeTab === "script" ? "active" : ""}`}
                onClick={() => setActiveTab("script")}
                style={{ background: activeTab === "script" ? "var(--brand)" : "#f1f5f9", color: activeTab === "script" ? "#fff" : "inherit" }}
              >
                Negotiation Script
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

          {/* TAB 1: Assessment & Legal Breakdown */}
          {activeTab === "analysis" && (
            <div>
              {/* Top Verdict Banner */}
              <div className={`verdict ${noticeBarred ? "good" : effectiveMaxIncreasePct === 0 ? "good" : isDemandUnlawful ? "warn" : "info"}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div className="big">
                      {noticeBarred
                        ? "Increase Barred: 0% Allowed (Notice Deadline Missed)"
                        : effectiveMaxIncreasePct === 0
                        ? "Maximum Permitted Increase: 0%"
                        : `Maximum Permitted Increase: ${fmtPct(effectiveMaxIncreasePct, 0)}`}
                    </div>
                    <div style={{ marginTop: "0.3rem", fontSize: "0.95rem" }}>
                      {noticeBarred ? (
                        <span>
                          Notice served <strong>{noticeCalculation.daysNotice} days</strong> before expiry (Dubai law requires at least 90 days). The tenancy legally renews at the existing rent of <strong>{fmtAed(facts.currentRent)}</strong>.
                        </span>
                      ) : rentResult ? (
                        <span>
                          Landlord demands <strong>{fmtAed(facts.proposedRent)}</strong> (+{fmtPct(demandIncreasePct, 1)}). Statutory ceiling under Decree 43/2013 is <strong>{fmtAed(effectiveMaxNewRent)}</strong>.
                        </span>
                      ) : (
                        <span>Insufficient comparable Ejari contracts. Recommended: check official RERA Smart Rental Index on Dubai REST app.</span>
                      )}
                    </div>
                  </div>
                  {excessDemandAed > 0 && (
                    <div style={{ textAlign: "right", marginTop: "0.4rem" }}>
                      <span className="chip bad" style={{ fontSize: "0.85rem", padding: "0.25rem 0.6rem" }}>
                        Unlawful Excess: {fmtAed(excessDemandAed)}/yr
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Three Pillar Audit Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
                {/* Notice Pillar */}
                <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)", background: noticeBarred ? "#f0fdf4" : "#fff" }}>
                  <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                    Notice Audit (Law 33/2008 Art 14)
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.2rem", color: noticeBarred ? "var(--good)" : "var(--ink)" }}>
                    {noticeCalculation.isMissingData ? "Incomplete Data" : `${noticeCalculation.daysNotice} Days Notice`}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                    {noticeBarred
                      ? "❌ Non-compliant (<90 days). Rent increase legally void."
                      : "✅ Compliant (>=90 days notice provided)."}
                  </div>
                </div>

                {/* Statutory Slab Pillar */}
                <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}>
                  <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                    Statutory Slab (Decree 43/2013)
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.2rem" }}>
                    {rentResult ? fmtPct(rentResult.slabPct, 0) : "N/A"} Permitted
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                    {rentResult
                      ? `Current rent sits ${(rentResult.belowMarketPct * 100).toFixed(0)}% vs median.`
                      : "No matching cell."}
                  </div>
                </div>
              </div>

              {/* Detailed Numbers Breakdown */}
              {rentResult && (
                <ul className="list mt">
                  <li>
                    <span>Current Annual Rent</span>
                    <strong>{fmtAed(facts.currentRent)}</strong>
                  </li>
                  <li>
                    <span>Landlord&apos;s Proposed Rent</span>
                    <strong className={isDemandUnlawful ? "down" : "flat"}>
                      {fmtAed(facts.proposedRent)} (+{fmtPct(demandIncreasePct, 1)})
                    </strong>
                  </li>
                  <li>
                    <span>Maximum Legal Rent Ceiling</span>
                    <strong style={{ color: "var(--good)" }}>{fmtAed(effectiveMaxNewRent)}</strong>
                  </li>
                  <li>
                    <span>Market Median (Registered Ejari)</span>
                    <strong>{fmtAed(rentResult.marketMedian)}</strong>
                  </li>
                  <li>
                    <span>Ejari Evidence Sample</span>
                    <strong>{fmtInt(rentResult.bench.n)} registered contracts ({rentResult.levelLabel})</strong>
                  </li>
                  <li>
                    <span>Typical Benchmark Range (p25-p75)</span>
                    <strong>{fmtAed(rentResult.marketLow)} to {fmtAed(rentResult.marketHigh)}</strong>
                  </li>
                  <li>
                    <span>Data Freshness / Window</span>
                    <strong>{fmtDate(rentResult.bench.first_date)} to {fmtDate(rentResult.bench.last_date)}</strong>
                  </li>
                </ul>
              )}

              {/* Source Transparency & Building Star Rating Callout */}
              <div className="callout mt" style={{ fontSize: "0.82rem" }}>
                <strong>Important Legal Distinction:</strong> Figures above reflect <em>registered Ejari contracts</em> from Dubai Land Department open data.
                The legally binding benchmark before the Rental Dispute Center (RDC) is the <strong>RERA Smart Rental Index</strong>, which factors in your building&apos;s 1–5 star rating.
                Before sending your response, verify your building&apos;s specific rating on the <strong>Dubai REST App</strong> or DLD website.
              </div>
            </div>
          )}

          {/* TAB 2: Script & Human-In-The-Loop Approval */}
          {activeTab === "script" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Draft Negotiation Email (Ready for Review)</span>
                <span className="chip info">Human-in-the-Loop</span>
              </div>

              <textarea
                value={negotiationDraft}
                readOnly
                rows={12}
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

              {/* Safety & Approval Gate */}
              <div style={{ marginTop: "1rem", padding: "0.85rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.5rem", color: "var(--ink)" }}>
                  Mandatory Renter Verification &amp; Approval Gate
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", marginBottom: "0.4rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={acknowledgedFacts}
                    onChange={(e) => setAcknowledgedFacts(e.target.checked)}
                  />
                  I have verified my contract expiry date and current rent against my official Ejari certificate.
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", marginBottom: "0.4rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={acknowledgedDisclaimer}
                    onChange={(e) => setAcknowledgedDisclaimer(e.target.checked)}
                  />
                  I understand this agent generates negotiation assistance based on open data, not formal legal advice.
                </label>

                <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem", alignItems: "center" }}>
                  <button
                    onClick={() => {
                      if (!acknowledgedFacts || !acknowledgedDisclaimer) {
                        alert("Please check both verification checkboxes to confirm review.");
                        return;
                      }
                      setApprovedAction(true);
                    }}
                    className="btn"
                    style={{ background: approvedAction ? "var(--good)" : "var(--brand-2)", fontSize: "0.85rem" }}
                  >
                    {approvedAction ? "✓ Plan Approved by Renter" : "Approve Negotiation Plan"}
                  </button>

                  <button
                    onClick={handleCopyScript}
                    disabled={!approvedAction}
                    className="btn secondary"
                    style={{ fontSize: "0.85rem", opacity: approvedAction ? 1 : 0.5, cursor: approvedAction ? "pointer" : "not-allowed" }}
                  >
                    {copiedScript ? "✓ Copied to Clipboard!" : "Copy Script to Clipboard"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RDC Escalation Roadmap */}
          {activeTab === "roadmap" && (
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>Escalation Protocol: What if the landlord refuses?</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Follow this 4-step dispute prevention and escalation roadmap established by the Dubai Rental Dispute Center (RDC):
              </p>

              <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.8rem" }}>
                <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}>
                  <strong style={{ fontSize: "0.88rem", color: "var(--brand)" }}>Step 1: Written Notice via Email / Registered Channel</strong>
                  <p style={{ fontSize: "0.82rem", margin: "0.2rem 0 0", color: "var(--muted)" }}>
                    Send the approved negotiation script citing Law 33/2008 and Decree 43/2013. Always keep digital time-stamped proof of delivery.
                  </p>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}>
                  <strong style={{ fontSize: "0.88rem", color: "var(--brand)" }}>Step 2: Building Classification Check (Dubai REST App)</strong>
                  <p style={{ fontSize: "0.82rem", margin: "0.2rem 0 0", color: "var(--muted)" }}>
                    Log into the Dubai REST app to pull your building&apos;s specific Smart Rental Index certificate. This prevents disputes over star-rating tiering.
                  </p>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}>
                  <strong style={{ fontSize: "0.88rem", color: "var(--brand)" }}>Step 3: RDC &quot;Offer and Deposit&quot; Procedure</strong>
                  <p style={{ fontSize: "0.82rem", margin: "0.2rem 0 0", color: "var(--muted)" }}>
                    If the landlord refuses to accept your renewal cheques at the legal rent or refuses to sign Ejari, file an <strong>Offer and Deposit</strong> petition at the Rental Dispute Center. You deposit the renewal cheques with the judge, keeping your tenancy legally protected and preventing lockout.
                  </p>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}>
                  <strong style={{ fontSize: "0.88rem", color: "var(--brand)" }}>Step 4: Formal RDC Case Filing (If Contested)</strong>
                  <p style={{ fontSize: "0.82rem", margin: "0.2rem 0 0", color: "var(--muted)" }}>
                    If the landlord challenges the deposit, the RDC reconciliation department reviews the case. RDC fees are typically 3.5% of the annual rent (minimum AED 500, max AED 20,000). The statutory slabs are binding on the judge.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
