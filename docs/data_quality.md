# Data quality report

_Generated 2026-10-25T09:58:34+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 181,210 rows, 2026-01-01 to 2026-10-25 |
| Rent contracts loaded | PASS | 698,636 rows, 2026-01-01 to 2026-10-24 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.22% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.14% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 86.3% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.84% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 3,179 vs median 2,988 |

## Profile

```json
{
  "transactions": {
    "rows": 181210,
    "sales": 130656,
    "mortgages": 38834,
    "areas": 250,
    "projects": 3284,
    "offplan_share_of_sales": 0.6764021552779819,
    "procedures": {
      "Sell - Pre registration": 88376,
      "Sale": 32224,
      "Mortgage Registration": 26045,
      "Delayed Sell": 9748,
      "Grant": 5951,
      "Delayed Mortgage": 3725,
      "Portfolio Mortgage Registration": 3406,
      "Development Registration Pre-Registration": 1987,
      "Modify Mortgage": 1690,
      "Portfolio Mortgage Modification": 1295
    }
  },
  "rents": {
    "rows": 698636,
    "renewal_share": 0.5548454416892344,
    "areas": 197,
    "usage": {
      "Residential": 529627,
      "Commercial": 164426,
      "Industrial": 1359,
      "Storage": 123,
      "Educational facility": 108,
      "Health Facility": 87
    },
    "sub_types": {
      "Flat": 459383,
      "Office": 94874,
      "Shop": 51233,
      "Villa": 46249,
      "Labor Camps": 16403,
      "Warehouse": 7201,
      "Hotel": 5703,
      "Studio ": 5404
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.