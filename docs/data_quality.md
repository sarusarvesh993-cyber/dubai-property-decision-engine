# Data quality report

_Generated 2026-10-12T13:22:18+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 171,914 rows, 2026-01-01 to 2026-10-12 |
| Rent contracts loaded | PASS | 655,866 rows, 2026-01-01 to 2026-10-11 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.23% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.16% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.77% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,433 vs median 2,975 |

## Profile

```json
{
  "transactions": {
    "rows": 171914,
    "sales": 124722,
    "mortgages": 36493,
    "areas": 250,
    "projects": 3220,
    "offplan_share_of_sales": 0.6807058898991357,
    "procedures": {
      "Sell - Pre registration": 84899,
      "Sale": 30305,
      "Mortgage Registration": 24565,
      "Delayed Sell": 9226,
      "Grant": 5485,
      "Delayed Mortgage": 3487,
      "Portfolio Mortgage Registration": 3268,
      "Development Registration Pre-Registration": 1842,
      "Modify Mortgage": 1567,
      "Portfolio Mortgage Modification": 1097
    }
  },
  "rents": {
    "rows": 655866,
    "renewal_share": 0.557261696749031,
    "areas": 196,
    "usage": {
      "Residential": 496172,
      "Commercial": 155339,
      "Industrial": 1281,
      "Storage": 120,
      "Educational facility": 100,
      "Health Facility": 85
    },
    "sub_types": {
      "Flat": 430333,
      "Office": 89657,
      "Shop": 48432,
      "Villa": 43361,
      "Labor Camps": 15425,
      "Warehouse": 6794,
      "Hotel": 5371,
      "Studio ": 5014
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.