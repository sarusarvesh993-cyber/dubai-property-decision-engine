# Data quality report

_Generated 2026-10-22T10:23:59+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 177,817 rows, 2026-01-01 to 2026-10-22 |
| Rent contracts loaded | PASS | 690,194 rows, 2026-01-01 to 2026-10-21 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.22% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.14% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.73% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,520 vs median 2,967 |

## Profile

```json
{
  "transactions": {
    "rows": 177817,
    "sales": 128561,
    "mortgages": 38016,
    "areas": 250,
    "projects": 3277,
    "offplan_share_of_sales": 0.6793195448075233,
    "procedures": {
      "Sell - Pre registration": 87334,
      "Sale": 31415,
      "Mortgage Registration": 25659,
      "Delayed Sell": 9515,
      "Grant": 5723,
      "Delayed Mortgage": 3636,
      "Portfolio Mortgage Registration": 3303,
      "Development Registration Pre-Registration": 1954,
      "Modify Mortgage": 1623,
      "Portfolio Mortgage Modification": 1196
    }
  },
  "rents": {
    "rows": 690194,
    "renewal_share": 0.5555727809862154,
    "areas": 197,
    "usage": {
      "Residential": 522968,
      "Commercial": 162695,
      "Industrial": 1346,
      "Storage": 123,
      "Educational facility": 107,
      "Health Facility": 87
    },
    "sub_types": {
      "Flat": 453530,
      "Office": 93848,
      "Shop": 50692,
      "Villa": 45677,
      "Labor Camps": 16276,
      "Warehouse": 7139,
      "Hotel": 5647,
      "Studio ": 5338
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.