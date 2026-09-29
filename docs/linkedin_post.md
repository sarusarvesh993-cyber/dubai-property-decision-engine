# LinkedIn post (final)

Dubai publishes every registered property sale and rental contract as open data. Most people never see it at the moment it
matters: when an asking price lands in the inbox, or a renewal letter arrives with a higher rent.

So I built the Dubai Property Decision Engine: a free site on official Dubai Land Department data, refreshed every morning.

What it answers
1. Is this asking price fair? Percentile of the asking AED/sqft against comparable registered sales, a fair range for the unit's size and a one-page negotiation brief.
2. Can my landlord raise the rent? Market median from Ejari contracts and the permitted increase under the Decree 43/2013 slabs.
3. Which communities are heating up or cooling down? 12-week momentum with sample sizes, off-plan share and like-for-like yield estimates.
4. What looks mispriced? Registered sales far from their comparable median.
Plus a question box that answers in plain language, with the facts it used shown under every answer.

How it is built
Python and DuckDB pipeline on GitHub Actions, static Next.js site on Vercel, all free tiers. Every number traces to one SQL model.
17 data-quality checks and a fair-price back-test run on every refresh, and the error is published on the site: median error 6.2% against 20.5% for a citywide median, measured on 8,350 registered sales.
The AI part is deliberately boring: retrieval first, a rules-based answer, then a free-tier model rewrites the prose. A guard rejects any reply that introduces a number not in the facts, and a router adapts when free models come and go.

Three things the data taught me
A registration is not always a market sale. Half-share transfers and whole buildings registered unit by unit at one price were quietly distorting medians until they were flagged and excluded.
The two feeds name communities differently; a crosswalk lifted rent-benchmark coverage from 43% to 74%.
Medians are about what sold. Show the sample size and the off-plan share, or the number misleads.

Live: https://dubai-property-decision-engine.vercel.app
Code and methodology: https://github.com/sarusarvesh993-cyber/dubai-property-decision-engine

Feedback from anyone in Dubai real estate, banking or proptech is very welcome.

#DataAnalytics #Dubai #RealEstate #OpenData #SQL #Python #UAE #PropTech
