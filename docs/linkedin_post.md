# LinkedIn post (draft)

Dubai publishes every registered property sale and rental contract as open data. Most people never see it at the moment it
matters: when an asking price lands in the inbox, or a renewal letter arrives with a higher rent.

So I built the Dubai Property Decision Engine, a free, daily-refreshed site on official Dubai Land Department data.

What it answers
1. Is this asking price fair? Percentile of the asking AED/sqft against comparable registered sales, with a fair range for the unit's size and a one-page negotiation brief.
2. Can my landlord raise the rent? Market median from Ejari contracts and the permitted increase under the Decree 43/2013 slabs.
3. Which communities are heating up or cooling down? 12-week momentum with sample sizes, off-plan share and yield estimates.
4. What looks mispriced? Registered sales far from their comparable median.
Plus a question box that answers in plain language.

How it is built
Python + DuckDB pipeline on GitHub Actions, static Next.js site on Vercel, all free tiers. Every number traces to one SQL model.
14 data-quality checks and a fair-price back-test run on every refresh, and the error is published on the site.
The AI part is deliberately boring: retrieval first, a rules-based answer, then a free-tier model rewrites the prose. A guard
rejects any reply that introduces a number not in the facts, and a router adapts when free models come and go.

Two things I learned
The two feeds name communities differently; building a crosswalk lifted rent-benchmark coverage from 43% to 76%.
Medians are about what sold. Show the sample size and the off-plan share, or the number misleads.

Live: https://dubai-property-decision-engine.vercel.app
Code and methodology: https://github.com/sarusarvesh993-cyber/dubai-property-decision-engine

Feedback from anyone in Dubai real estate, banking or proptech is very welcome.

#DataAnalytics #Dubai #RealEstate #OpenData #SQL #Python #PowerBI #UAE
