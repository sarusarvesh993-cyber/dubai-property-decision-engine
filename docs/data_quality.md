# Data quality report

_Generated 2026-10-29T11:40:41+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 183,694 rows, 2026-01-01 to 2026-10-29 |
| Rent contracts loaded | PASS | 711,720 rows, 2026-01-01 to 2026-10-28 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.21% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.12% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 86.3% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.83% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.2% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 3,088 vs median 3,000 |

## Profile

```json
{
  "transactions": {
    "rows": 183694,
    "sales": 132244,
    "mortgages": 39502,
    "areas": 250,
    "projects": 3292,
    "offplan_share_of_sales": 0.6749871449744412,
    "procedures": {
      "Sell - Pre registration": 89263,
      "Sale": 32745,
      "Mortgage Registration": 26529,
      "Delayed Sell": 9926,
      "Grant": 6039,
      "Delayed Mortgage": 3796,
      "Portfolio Mortgage Registration": 3438,
      "Development Registration Pre-Registration": 2037,
      "Modify Mortgage": 1724,
      "Portfolio Mortgage Modification": 1295
    }
  },
  "rents": {
    "rows": 711720,
    "renewal_share": 0.5538779295228461,
    "areas": 198,
    "usage": {
      "Residential": 539836,
      "Commercial": 167201,
      "Industrial": 1389,
      "Storage": 123,
      "Educational facility": 110,
      "Health Facility": 89
    },
    "sub_types": {
      "Flat": 468294,
      "Office": 96517,
      "Shop": 51998,
      "Villa": 47135,
      "Labor Camps": 16660,
      "Warehouse": 7319,
      "Hotel": 5856,
      "Studio ": 5515
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.