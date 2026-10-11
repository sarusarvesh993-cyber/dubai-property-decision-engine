# Dubai Renter Renewal Agent: Synthetic Persona Evaluation Protocol

**Author:** Sarvesh  
**Project:** Dubai Property Decision Engine (Dubai Renter Renewal Agent)  
**Protocol Date:** October 2026  
**Status:** Synthetic Persona Simulation & Usability Benchmark Protocol (Pre-Championship Simulation)  
**Target Category:** Best Personal AI Agent | Create AI Agents Championship  

---

## 1. Protocol Notice & Integrity Disclosure

> **Transparency Statement:** This evaluation report documents a **synthetic persona evaluation protocol** designed to stress-test usability, calculation accuracy, boundary condition handling, and draft generation. It is **not** an empirical clinical field trial with human subjects, nor does it claim verified actual financial savings in live tenant bank accounts. Prior draft claims of observed money saved and anecdotal quotes have been removed in accordance with competition evidence standards. Live human usability trials are planned post-prototype deployment in collaboration with Dubai tenant advisory groups.

---

## 2. Objective & Protocol Methodology

The objective of this protocol is to benchmark the **Dubai Renter Renewal Agent & Copilot** against five realistic synthetic tenant scenarios representing common rental friction points in Dubai:
1. **Untimely Notice (<90 Days):** Statutory 90-day notification timeline violation under Law 33/2008 Article 14.
2. **Timely Notice with Rent at Median:** Timely notice where existing rent is within 10% of median (0% increase slab under Decree 43/2013).
3. **Eviction Formality Defect:** Landlord citing sale or personal use via informal channels (WhatsApp/email) without Dubai Notary Public notice or 12-month statutory timeline under Law 33/2008 Article 25.
4. **Statutory Partial Increase:** Rent substantially below registered median qualifying for a partial statutory increase slab (10%).
5. **Above-Market Lease:** Rent exceeding registered open-data median, requiring preparation for zero-increase confirmation or downward adjustment.

### Evaluated Workflow Stages:
* **Step 1: Fact Input & Validation:** Entering lease expiry, notice date, delivery method, and agreed contract notice period (testing date validation and custom agreement terms).
* **Step 2: Rule-Based Evaluation:** Deterministic verification against Decree 43/2013 slabs and statutory notice timelines.
* **Step 3: Indicative Preparation Estimate:** Presenting findings as preparation estimates rather than definitive legal rulings, complete with direct links to the official DLD Smart Rental Index calculator.
* **Step 4: Draft Generation & Approval Cycle:** Human-in-the-loop review, editing, and verification that any subsequent input mutation immediately revokes prior approval.

---

## 3. Synthetic Persona Matrix

| Persona ID | Community | Unit Type | Contract Expiry | Current Rent | Landlord Proposed | Notice Date | Delivery Method | Scenario Core Condition |
|---|---|---|---|---|---|---|---|---|
| **SIM-01** | Dubai Marina | 1BR Flat (850 sqft) | 15 Dec 2026 | AED 85,000 | AED 98,000 (+15.3%) | 18 Oct 2026 | Email | Notice served 58 days prior (<90 days statutory) |
| **SIM-02** | Dubai Marina | 1BR Flat (850 sqft) | 01 Nov 2026 | AED 88,000 | AED 105,000 (+19.3%) | 04 Jul 2026 | Email | Timely notice (120 days); rent within 10% of median (0% slab) |
| **SIM-03** | Business Bay | Studio (480 sqft) | 15 Nov 2026 | AED 55,000 | AED 68,000 (+23.6%) | 15 Jul 2026 | WhatsApp | Landlord cites sale; lacks Dubai Notary Public service |
| **SIM-04** | Jumeirah Village Circle | 1BR Flat (800 sqft) | 01 Nov 2026 | AED 48,000 | AED 65,000 (+35.4%) | 01 Jul 2026 | Registered Mail | Rent 26% below median; qualifies for 10% statutory slab |
| **SIM-05** | Burj Khalifa | 1BR Flat (1,100 sqft)| 01 Nov 2026 | AED 215,000 | AED 230,000 (+7.0%) | 01 Jul 2026 | Email | Rent above registered median; 0% increase permitted |

---

## 4. Synthetic Walkthrough Findings & Edge Case Identification

### Scenario SIM-01: Dubai Marina (Untimely Notice)
* **Simulated Path:** User enters notice received 58 days prior to lease expiry.
* **Engine Evaluation:** Identifies timeline shortfall of 32 days below the standard 90-day statutory default (Law 33/2008 Art. 14).
* **Language Precision:** Flagged as *"Notice timeline appears precluded under standard 90-day statutory rule — unless your tenancy contract specifies a shorter agreed notice period."*
* **Draft Output:** Generates a polite, firm draft citing contract dates and statutory timeline while recommending verification of the physical tenancy contract agreement.

### Scenario SIM-02: Dubai Marina (Timely Notice, At-Market Rent)
* **Simulated Path:** Timely notice served 120 days out. Current rent AED 88,000; landlord proposes AED 105,000.
* **Engine Evaluation:** Matches 1,380 registered Ejari renewal contracts (median AED 86,669). Rent is within 10% of registered benchmark. Under Decree 43/2013, the statutory increase bracket is 0%.
* **Indicative Estimate:** Maximum indicative renewal rent: AED 88,000. Difference between demand and indicative ceiling: AED 17,000/year.
* **Official Source Link:** Displays explicit prompt linking to DLD Smart Rental Index calculator for official building-star verification.

### Scenario SIM-03: Business Bay (Informal Eviction Notice)
* **Simulated Path:** Landlord claims unit will be sold and requests tenant vacate, delivered via WhatsApp.
* **Engine Evaluation:** Triggers eviction formalities screening under Law 33/2008 Article 25.
* **Advisory Output:** Explains that an eviction notice for sale or personal use requires a 12-month notice period served through the **Dubai Notary Public** or registered mail. WhatsApp messages do not meet formal statutory eviction requirements. Refrains from declaring notice "legally void", advising official RDC / DLD confirmation.

### Scenario SIM-04: Jumeirah Village Circle (Statutory Partial Increase)
* **Simulated Path:** Current rent AED 48,000; registered median AED 65,000. Current rent is 26% below median.
* **Engine Evaluation:** Falls into the 21%–30% below-market band under Decree 43/2013, permitting up to a 10% increase (AED 4,800).
* **Indicative Estimate:** Indicative renewal ceiling is AED 52,800 (not AED 65,000). The agent highlights that while an increase is permissible, the requested excess is AED 12,200.
* **Draft Output:** Professional counter-offer accepting the statutory 10% adjustment while declining the requested 35% increase.

### Scenario SIM-05: Burj Khalifa (Above-Market Lease)
* **Simulated Path:** Current rent AED 215,000; registered benchmark median AED 205,000.
* **Engine Evaluation:** Current rent is ~5% above registered median. Decree 43/2013 permits 0% increase.
* **Draft Output:** Respectful response noting that the current contract rent already exceeds prevailing registered medians, proposing renewal at unchanged terms.

---

## 5. Architectural & UX Fixes Implemented from Protocol Observations

The synthetic walkthrough revealed six critical UX and legal safety defects that were immediately addressed in code:

1. **Elimination of Legal Ruling Wording:**
   * *Problem:* Early mockups used definitive legal terms like *"unlawful"*, *"legally void"*, and *"maximum legal rent"*.
   * *Fix:* Replaced throughout with *"indicative preparation estimate — not an official rent-increase result"* and *"timeline appears precluded under standard statutory defaults unless otherwise agreed"*.
2. **Blank Initial State & Fact Independence:**
   * *Problem:* Preset demo facts persisted when users intended to test their own case.
   * *Fix:* Initialized all case input fields completely blank (`""` or `0`). Synthetic scenarios are explicitly opt-in and labeled *"Synthetic demo scenario — not a real tenant case"*.
3. **Date Validation & Chronological Integrity:**
   * *Problem:* Users could inadvertently enter a notice date occurring after the lease expiry date.
   * *Fix:* Added client-side and engine validation requiring `noticeDate <= contractExpiry`. All synthetic scenario dates anchored to non-future realistic dates (2026).
4. **"Unless Otherwise Agreed" Contract Terms:**
   * *Problem:* Law 33/2008 Art. 14 notice period defaults to 90 days "unless otherwise agreed".
   * *Fix:* Added a selector allowing tenants to specify if their contract specifies a custom notice period (e.g., 60 days).
5. **Formal Delivery Channel Support:**
   * *Problem:* Missing "Registered Mail" as a recognized delivery option alongside Notary Public and email.
   * *Fix:* Added Registered Mail to notice delivery options and evaluation rules.
6. **Strict Draft Approval Invalidation:**
   * *Problem:* Modifying a rent amount or notice date after approving a draft left the draft in an "Approved" state.
   * *Fix:* Added strict reactive state invalidation: mutating any tenancy input immediately resets `draftApproved` to `false` and prompts re-review.

---

## 6. Continuous Integration & Verification

To prevent regression across these scenarios, the evaluation suite is integrated directly into the repository CI pipeline (`.github/workflows/ci.yml`) via `npm run eval:renewal`:
* 12 deterministic test cases covering 89/90/91-day boundary limits, custom contract periods, delivery methods, date validation, Decree 43 slabs, and fallback handling.
* Zero external model dependencies during calculation (100% deterministic local TypeScript execution).
