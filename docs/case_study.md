# Case study: Dubai Property Decision Engine

Live site: https://dubai-property-decision-engine.vercel.app
Repository: https://github.com/sarusarvesh993-cyber/dubai-property-decision-engine

## 1. The problem

Dubai publishes every registered property sale, mortgage and rental contract as open data, yet the people who need
those numbers at the moment of a decision rarely see them. A buyer sees an asking price and a broker's opinion. A tenant
receives a renewal letter with a higher figure and does not know whether the law allows it. A bank valuation team or a
developer reads a quarterly PDF that is two months old by the time it lands. The data exists; the decision support does not.

The project turns the official Dubai Land Department (DLD) feeds into four everyday decisions:

| Decision | Who asks it | What the engine returns |
|---|---|---|
| Is this asking price fair? | buyers, brokers, valuers | percentile of the asking AED/sqft inside the comparable registered sales, a p25 to p75 fair range for the unit's size, evidence count and confidence, a negotiation brief |
| Can my landlord raise the rent, and by how much? | tenants, landlords, property managers | market median from Ejari contracts of the same community, type and size band, the permitted increase under Decree 43/2013 slabs, and the resulting ceiling |
| Which communities are heating up or cooling down? | investors, developers, lenders | 12-week versus previous 12-week change in median AED/sqft with sample sizes, off-plan share, rent medians and gross-yield estimates |
| What looks mispriced? | analysts, compliance, valuers | registered sales more than 35% away from their comparable cell median |

A question box ("Ask the data") answers all of the above in plain language, and a weekly market note summarises the period.

## 2. The data

* Source: DLD open-data gateway, transactions (sales, mortgages, gifts) and rent contracts (Ejari), pulled directly with no key.
* Volume: roughly 3,500 to 4,500 registered sales and 30,000 to 36,000 rental contracts in a typical four-week period.
* History: the public gateway serves records from January 2026 onward; the pipeline back-fills from there and re-pulls the last ten days every morning to catch late registrations.
* Three data facts shaped the design:
  1. Identifiers in the public feeds are anonymised, so rows are de-duplicated on the full record rather than on an ID.
  2. The rental feed has no bedroom count for about 96% of contracts, so rent benchmarks use size bands instead of bedrooms.
  3. The two feeds name communities differently: sales use popular names ("Jumeirah Village Circle"), Ejari uses district names ("Al Barsha South Fourth"). Without reconciliation only 43% of sales had a rent benchmark; a crosswalk derived from projects that appear in both feeds, on top of a verified seed list, lifted that to 74% on the full history.

## 3. The method

**Pipeline (Python, DuckDB, GitHub Actions).** Weekly pull windows, monthly parquet partitions, a cleaning layer with explicit
rules (unit conversion, bedroom normalisation, size bands, bulk-deal flags, plausibility limits, robust outlier detection within
community x type x off-plan groups) and a `benchmark_eligible` flag that every downstream number respects. SQL models define the
grain and filters of every mart, so any figure on the site can be traced to one query.

**Fair price.** Hierarchical comparables: the most specific cell with at least 8 eligible sales in the last 6 months, in the order
project, then community x type x bedrooms, then community x type, then community, always within the same off-plan or ready group.
The output is a percentile and a band, not a single number, and the sample size and level are always shown next to the verdict.

**Rent check.** Same idea with Ejari contracts over 12 months: community x type x size band x contract type, falling back to broader
cells. The Decree 43/2013 slabs are applied to the gap between the current rent and the market median: 0% up to 10% below market,
then 5%, 10%, 15% and 20% for gaps of 11 to 20%, 21 to 30%, 31 to 40% and over 40%. The official RERA calculator is stated as binding.

**Market pulse and anomalies.** Weekly series, 12-week momentum with minimum sample sizes, gross-yield estimates where both price
and rent benchmarks exist in the same window, and a list of registered sales more than 35% away from their comparable median.

**Quality gates.** Fourteen data-quality checks run on every refresh (freshness, duplicates, completeness, eligibility rates,
outlier rate, coverage, volume sanity) and are published as a report. Twenty unit tests cover the deterministic parts.

**Back-test.** Every refresh re-prices the most recent four weeks of registered residential sales using only earlier data, with the
same fallback rules the site uses, and publishes coverage, median absolute percentage error, the share of prices inside the
published p25 to p75 and p10 to p90 bands, and the same errors for a naive citywide median. This is the honest answer to
"how good is the fair-price estimate", and it is recomputed daily rather than quoted once.

**AI layer.** A self-adapting router discovers which free-tier language models are available (Groq, Gemini, Cerebras, OpenRouter),
ranks them, cools down rate-limited models and blacklists retired ones, and falls back to a rules-based writer. The model never
computes anything: the Ask box parses the question, retrieves the relevant benchmark cells, writes a deterministic answer, and only
then lets a model rewrite the prose. A number guard rejects any reply that contains a figure not present in the facts. The facts are
shown under every answer. A 27-question evaluation set runs in CI without any model call.

**Delivery.** Static Next.js site on Vercel, rebuilt automatically on every data commit; the only server function is the question
endpoint. The JSON artefacts double as an open API (for example `/data/price_bands.json`). Nothing in the stack costs money.

## 4. Results

Numbers below are from the full 2026 history (registered transactions 1 January to 28 September 2026, 163,262 transactions and
607,326 Ejari contracts); the live site always shows the current figures and the back-test table on the methodology page.

* Coverage: 184 communities with at least one benchmark; 74% of sales matched to a rent benchmark after the crosswalk (43% before).
* Fair-price back-test (28-day window, 8,350 registered residential sales priced only with earlier data): 99.8% matched to a
  comparable cell; median absolute error 6.2% overall against 20.5% for a single citywide median, 4.5% where a project-level cell
  existed; 66% of sales within 10% of the prediction. About 46% of actual prices fell inside the p25 to p75 band and 73% inside
  p10 to p90, close to the 50% and 80% a calibrated band should hold.
* Worked example: a 750 sqft one-bedroom in Business Bay asked at AED 1.5m is 2,000 AED/sqft, percentile 61 of 376 comparable
  registered sales (median 1,816), p25 to p75 for the size AED 1,083,000 to 1,689,000. A 900 sqft Dubai Marina one-bedroom rented
  at AED 90,000 sits within 10% of the AED 86,608 median (1,278 contracts), so no increase is permitted at renewal.
* Copilot evaluation: 29 of 29 questions parsed and answered correctly (threshold 80%), on smoke data and on the live data.
* Operations: daily refresh every morning (06:23 Gulf time), 17 of 17 quality checks passing, site redeploys without manual steps.

## 5. What was hard, and what I would tell a stakeholder

* Medians are mix-dependent. A community whose off-plan launches dominate a week will show a jump that is about what sold, not
  about repricing. The site always shows sample sizes and separates off-plan from ready; a reader should still ask "what sold".
* Registered prices lag agreements by weeks, and pre-registrations of off-plan units reflect developer price lists.
* The rental feed's missing bedrooms mean a two-bedroom and a large one-bedroom of the same size share a benchmark.
* Land plots carry the "Residential" usage label. With the full history loaded they produced gross yields of 20% in two
  communities, because apartment rents were being divided by plot prices. The fix was a residential-unit flag (flats and
  villas that are units or buildings) used by every residential median, yield and anomaly, plus a quality check that fails
  if a land plot ever enters the pricing universe again.
* Registered rows are not all market sales. Two patterns only showed up with the full history: partial-share transfers, where
  the procedure area is a fraction of the unit and the price covers that fraction (76 half-share studios registered on one day
  pulled a community's ready-studio median to 441 AED/sqft against a true 1,142, and the anomaly monitor then flagged the honest
  sales as 195% overpriced); and portfolio blocks, where a whole building changes hands and is registered unit by unit at one
  AED/sqft (218 flats in Majan on a single day at exactly 851). Both are now flagged, counted in volumes and kept out of every
  benchmark, and two quality checks report their share on each refresh (1.25% and 0.78% of sales).
* Yields must be like for like. A community-level rent-per-sqft over price-per-sqft mixed villa rents with flat prices in some
  communities; the estimate now uses the community's dominant sale type and rents of the same type, and shows the type.
* Free-tier language models change monthly. Designing the router to discover and rank models at run time, with a rules
  fallback and a number guard, removed that dependency from the product's reliability.

## 6. Next steps

Per-community pages with shareable links; a Power BI model on the parquet marts for teams that live in Power BI; pre-2026
history from the Dubai Pulse bulk files so the momentum signals cover full cycles; a developer and project launch tracker; a map
view once community coordinates are sourced.
