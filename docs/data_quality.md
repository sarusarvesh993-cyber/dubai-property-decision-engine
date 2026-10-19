# Data quality report

_Generated 2026-10-19T10:59:31+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 175,584 rows, 2026-01-01 to 2026-10-19 |
| Rent contracts loaded | PASS | 678,587 rows, 2026-01-01 to 2026-10-18 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.23% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.14% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.76% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,472 vs median 2,967 |

## Profile

```json
{
  "transactions": {
    "rows": 175584,
    "sales": 127129,
    "mortgages": 37403,
    "areas": 250,
    "projects": 3258,
    "offplan_share_of_sales": 0.6799471403063031,
    "procedures": {
      "Sell - Pre registration": 86441,
      "Sale": 30980,
      "Mortgage Registration": 25186,
      "Delayed Sell": 9411,
      "Grant": 5639,
      "Delayed Mortgage": 3572,
      "Portfolio Mortgage Registration": 3292,
      "Development Registration Pre-Registration": 1947,
      "Modify Mortgage": 1595,
      "Portfolio Mortgage Modification": 1189
    }
  },
  "rents": {
    "rows": 678587,
    "renewal_share": 0.5559301902335294,
    "areas": 196,
    "usage": {
      "Residential": 513841,
      "Commercial": 160264,
      "Industrial": 1324,
      "Storage": 122,
      "Educational facility": 107,
      "Health Facility": 86
    },
    "sub_types": {
      "Flat": 445652,
      "Office": 92566,
      "Shop": 49898,
      "Villa": 44899,
      "Labor Camps": 15940,
      "Warehouse": 7005,
      "Hotel": 5544,
      "Studio ": 5228
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.