# Dubai Property Decision Engine & Renter Renewal Agent

[![CI](https://github.com/sarusarvesh993-cyber/dubai-property-decision-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/sarusarvesh993-cyber/dubai-property-decision-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Site](https://img.shields.io/badge/Live-Vercel-success)](https://dubai-property-decision-engine.vercel.app)

An open-source, evidence-led residential decision engine and personal tenant agent built on official Dubai Land Department (DLD) open data and statutory Dubai tenancy legislation (Decree 43/2013 and Law 26/2007 as amended by Law 33/2008). 

The platform combines an automated daily transaction and Ejari analytics pipeline with an interactive multi-step **Renter Renewal Agent & Copilot** (`/renewal-agent`), providing tenants with indicative preparation estimates, formal notice timeline audits, eviction formality screening, and human-in-the-loop counter-offer generation.

---

## Core Capabilities

| Capability | Route | Description & Methodology |
|---|---|---|
| **Renter Renewal Agent** | `/renewal-agent` | Interactive multi-step personal tenant copilot. Audits notice timeliness against the 90-day statutory default (or custom agreed notice periods), verifies delivery methods (registered mail, Notary Public, email), calculates indicative Decree 43/2013 increase brackets, screens eviction formalities under Law 33/2008 Art. 25, and provides an editable counter-letter draft with strict human-in-the-loop approval invalidation on input changes. |
| **Fair Price Calculator** | `/fair-price` | Evaluates asking AED/sqft inside the p10–p90 range of comparable registered sales. Employs hierarchical matching (project $\rightarrow$ community + type + bedrooms $\rightarrow$ community + type $\rightarrow$ community) with daily out-of-sample backtesting. Generates downloadable negotiation briefs. |
| **Rent Check Engine** | `/rent-check` | Benchmarks existing rents against official registered Ejari contracts, mapping the variance to statutory Decree 43/2013 caps (0%, 5%, 10%, 15%, 20%) alongside links to the official DLD Smart Rental Index. |
| **Community Analytics** | `/communities` | 12-week rolling median price/sqft vs. prior 12-week period, transaction volumes, off-plan vs. ready ratios, median Ejari rents, and gross yield estimates across all active Dubai communities. |
| **Market Pulse & Anomalies** | `/market-pulse`, `/anomalies` | Weekly transaction indicators, trend tracking, and anomaly detection flagging sales deviating $>35\%$ from comparable cell medians. Includes a weekly market commentary generated with an AST-guarded number-checker. |
| **Ask the Data (Copilot)** | `/ask` & Home | Natural language question parsing for residential queries. Extracts community entities, property types, bedrooms, and rents to retrieve verified DLD benchmark facts and deliver deterministic, evidence-backed answers. |

---

## Technical Architecture & Agent Design

```
├── pipeline/                 Python 3.12 Analytical Data Pipeline
│   ├── extract.py            Pulls DLD transaction & Ejari feeds via weekly windows
│   ├── clean.py              Deduplication, unit conversion, size bands, bulk-deal flags
│   ├── crosswalk.py          Reconciles sales community names with Ejari district names
│   ├── sql/marts.sql         DuckDB analytical data marts (weekly series, price bands, rent benchmarks)
│   ├── backtest.py           Out-of-sample fair price model calibration (6.2% MAPE)
│   ├── quality.py            17 automated data quality gates (writes docs/data_quality.md)
│   ├── market_note.py        Guarded LLM commentary generator with local fallback
│   └── export_web.py         Emits pre-computed JSON artefacts to web/public/data/
│
├── web/                      Next.js 15 App Router + TypeScript + Tailwind
│   ├── app/renewal-agent/    Multi-step Personal Renter Agent UI
│   ├── components/           RenewalAgent.tsx (state machine, timeline, reactive draft generator)
│   ├── lib/engine.ts         Deterministic pricing and statutory Decree 43 rent check logic
│   ├── lib/ask.ts            Natural language question parser and benchmark retrieval
│   ├── lib/guard.ts          AST-level number guard (rejects hallucinated or unverified numbers)
│   ├── lib/llm.ts            Multi-provider free LLM router with automatic local rules fallback
│   ├── eval/                 Automated test sets (ask_eval.json, renewal_agent_eval.json)
│   └── scripts/              CLI runners (eval_ask.ts: 29 cases, eval_renewal_agent.ts: 12 cases)
│
└── docs/                     Documentation, methodology, and competition dossiers
    ├── DUBAI_RENTER_AGENT_COMPETITION_DOSSIER.md  Championship architecture & evaluation dossier
    ├── usability_report.md   Synthetic persona protocol & simulated usability benchmarks
    ├── methodology.md        Statistical methodology & data modeling rules
    └── data_dictionary.md    Field-level schema definitions
```

---

## Data Privacy & Guardrails

1. **Client-Side Privacy:** The Renter Renewal Agent runs all statutory calculations, timeline checks, and draft generation 100% locally in the user's browser. Tenant lease details, landlord names, phone numbers, and contract amounts are never transmitted to external AI APIs or third-party servers.
2. **Serverless Ask Endpoint Privacy:** The `/api/ask` endpoint processes queries statelessly without storing session logs or personally identifiable information (PII). Questions are truncated to 300 characters, matched against pre-aggregated public DLD benchmark tables, and passed to language models solely for prose formatting.
3. **AST Number Guard:** Every response generated by an external language model is validated against the exact set of verified input numbers via `lib/guard.ts`. If an external model hallucinates or invents a numerical value not present in the verified facts, the output is rejected and the system automatically falls back to deterministic rule-based output.
4. **Legal & Preparation Disclaimers:** All agent findings are prominently designated as **"indicative preparation estimates — not an official rent-increase result"**. Direct links to the official Dubai Land Department Smart Rental Index calculator and the Rental Dispute Center (RDC) are provided for binding statutory determinations.

---

## Quality Assurance & CI Workflows

Continuous Integration runs on every pull request and push to `main` via `.github/workflows/ci.yml`:
* **Pipeline Unit Tests:** `pytest -q tests` verifying deterministic data transformation rules.
* **TypeScript Typechecking:** `npm run typecheck` across all web components and routes.
* **Copilot Ask Evaluation:** `npm run eval:ask` executing a 29-case benchmark testing natural language parsing, entity recognition, and numerical precision (100% passing).
* **Renewal Agent Evaluation:** `npm run eval:renewal` executing a 12-case benchmark covering 89/90/91-day notice boundaries, custom contract notice periods, delivery methods (registered mail, Notary Public), invalid dates, Decree 43 slabs, and missing fact handling (100% passing).
* **Production Build:** `npm run build` validating full static and dynamic route compilation.

---

## Running Locally

### 1. Web Application
```bash
cd web
npm install
npm run dev
# Open http://localhost:3000 or http://localhost:3000/renewal-agent
```

### 2. Run Evaluations
```bash
cd web
npm run eval:ask       # 29 natural language parsing and calculation cases
npm run eval:renewal   # 12 renewal agent boundary and statutory logic cases
```

### 3. Pipeline (Python 3.12)
```bash
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r pipeline/requirements.txt
python pipeline/run.py --mode smoke   # Pulls last 14 days and runs local DuckDB marts
pytest -q tests
```

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
