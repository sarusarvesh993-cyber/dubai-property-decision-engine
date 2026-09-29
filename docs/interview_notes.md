# Interview notes: talking about this project

Two-minute version, then the questions that usually follow. Keep the numbers current by checking the live site before an interview.

## The two-minute version

"I built a daily-refreshed decision product on Dubai Land Department open data. It answers four questions people actually have:
is this asking price fair, can my landlord raise my rent and by how much, which communities are heating up or cooling down, and
which registered sales look mispriced. The pipeline is Python and DuckDB on GitHub Actions, the site is Next.js on Vercel, and
the whole thing runs on free services. What I am proudest of is the discipline around the numbers: every figure traces to one SQL
model, fourteen data-quality checks run on every refresh, and the fair-price engine is back-tested out of sample every day, with
the error published on the site rather than claimed once. There is also a question box that uses a language model, but the model
is only allowed to rewrite an answer the rules already produced, and a guard rejects any reply that introduces a number that is not
in the facts."

## Likely questions

**Why hierarchical medians instead of a regression or a machine-learning model?**
Because the users need an explanation more than an extra point of accuracy. "Percentile 76 of 41 comparable sales in the same
community, type and bedroom count, last 6 months" is something a buyer, a broker and a valuer can all argue with. A hedonic
regression would be the next step, and the back-test harness already exists to prove whether it helps. The current engine roughly
halves the error of a naive citywide median, and project-level cells bring the median error to a few percent.

**How do you know the fair-price estimate is any good?**
The back-test. Each refresh re-prices the last four weeks of registered residential sales using only earlier data and the same
fallback rules the site applies. It reports coverage, median absolute percentage error, and the share of actual prices inside the
published bands, split by matching level and by off-plan or ready, next to a naive baseline. The numbers are on the methodology page.

**What was the hardest data problem?**
Community names. Sales use popular names, Ejari uses district names, and nothing in the feeds joins them. I derived a crosswalk
from projects that appear in both feeds, on top of a verified seed list, published it for audit, and raised the share of sales with
a rent benchmark from 43% to 74%. Second hardest: the rental feed has no bedroom count for 96% of contracts, so rent benchmarks
had to be built on size bands.

**Why not just use an LLM to answer questions from the raw data?**
Because a wrong number in a property decision is expensive and unverifiable. The Ask box does retrieval first: parse the question,
fetch the exact benchmark cells, write a deterministic answer. The model only rewrites the prose, every number in its reply must
already exist in the facts (a guard checks), and the facts are shown under the answer. A 27-question evaluation set runs in CI.

**Free models change all the time. How does that not break the product?**
The router discovers the available models at run time from each provider, ranks them, cools down rate-limited ones for five
minutes, blacklists retired ones for a day, and falls back to the next provider and finally to a rules-based writer. Adding a new
provider is one dictionary entry. The product works with zero keys; keys only improve the prose.

**What would you tell a bank or a developer that wanted to use this?**
Read every median with its sample size and its off-plan share. Registered prices lag agreements, pre-registrations reflect
developer price lists, and the tool is indicative rather than a valuation. For rent increases, the official RERA index is binding;
this prepares the conversation. Then: the marts are parquet and can feed Power BI directly, and the JSON files are an open API.

**How is data quality handled?**
Fourteen checks on every run: freshness, duplicates, completeness of key fields, eligibility rates, outlier rate, crosswalk coverage,
and volume sanity against the recent history. Results are written to a report and the job summary, so a silent break shows up the
same morning. Unit tests cover the deterministic rules, including the back-test on synthetic data.

**What would you do next with two more weeks?**
A hedonic model tested against the same back-test; pre-2026 history from the Dubai Pulse bulk files so the momentum signal covers
a full cycle; per-community pages; a Power BI model for teams that live there.

## Numbers to have ready (check the live site the day before)

* Sales, value and mortgage count for the last four weeks; median residential AED/sqft; off-plan share.
* Rent contracts in the last four weeks; renewal share; median residential rent.
* Back-test: coverage, median error overall and at project level, band calibration, baseline error.
* Crosswalk: 43% to 74% rent-benchmark coverage. Tests: 21 pytest, 29 eval questions, 17 quality checks. Back-test on the full history: median error 6.2% against 20.5% for a citywide median, 99.8% coverage, 8,350 sales.

## Question: what did the full history reveal that the first two weeks did not?

Three things, each now a rule with a test. First, land plots share the "Residential" usage label, so plot prices were sitting in
apartment yields (20% gross yields in two communities). Second, partial-share transfers: the procedure area is a fraction of the
unit and the price covers that fraction, which halves the apparent AED/sqft; 76 of them on one day made honest studio sales in
International City look 195% overpriced on the anomaly monitor. Third, portfolio blocks: a whole building sold in one lot and
registered unit by unit at a single AED/sqft (218 flats in Majan at exactly 851). The general lesson I would give a stakeholder is
that a registration is not a market sale until you have checked what was transferred, to whom, and alongside what else.

## Question: how do you keep the copilot honest?

The model never sees raw data and never computes. The question is parsed, the benchmark cells are retrieved, a rules answer is
written, and the model may only rewrite it. A guard compares every number in the reply with the facts and discards the reply if
any number is new. The status box on the Ask page shows which model answered, and the same 29 questions run in CI without a model.
