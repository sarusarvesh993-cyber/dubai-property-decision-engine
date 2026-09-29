# Data quality report

_Generated 2026-09-29T06:13:35+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 163,262 rows, 2026-01-01 to 2026-09-28 |
| Rent contracts loaded | PASS | 607,326 rows, 2026-01-01 to 2026-09-27 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 1 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.25% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 0.78% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.8% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.87% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.7% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.4% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 73.9% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,321 vs median 3,000 |

## Profile

```json
{
  "transactions": {
    "rows": 163262,
    "sales": 119105,
    "mortgages": 34275,
    "areas": 250,
    "projects": 3012,
    "offplan_share_of_sales": 0.6862684186222241,
    "procedures": {
      "Sell - Pre registration": 81738,
      "Sale": 28764,
      "Mortgage Registration": 23164,
      "Delayed Sell": 8319,
      "Grant": 5022,
      "Delayed Mortgage": 3267,
      "Portfolio Mortgage Registration": 3088,
      "Development Registration Pre-Registration": 1661,
      "Modify Mortgage": 1289,
      "Portfolio Mortgage Modification": 1073
    }
  },
  "rents": {
    "rows": 607326,
    "renewal_share": 0.561441466362382,
    "areas": 196,
    "usage": {
      "Residential": 457489,
      "Commercial": 145790,
      "Industrial": 1190,
      "Storage": 117,
      "Educational facility": 84,
      "Health Facility": 79
    },
    "sub_types": {
      "Flat": 396655,
      "Office": 84071,
      "Shop": 45731,
      "Villa": 40071,
      "Labor Camps": 14245,
      "Warehouse": 6349,
      "Hotel": 4908,
      "Studio ": 4626
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.