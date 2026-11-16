# Data quality report

_Generated 2026-11-16T10:00:39+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 198,003 rows, 2026-01-01 to 2026-11-16 |
| Rent contracts loaded | PASS | 786,138 rows, 2026-01-01 to 2026-11-15 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.19% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.28% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 82.6% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.72% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.4% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.3% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,446 vs median 3,036 |

## Profile

```json
{
  "transactions": {
    "rows": 198003,
    "sales": 141470,
    "mortgages": 43152,
    "areas": 250,
    "projects": 3326,
    "offplan_share_of_sales": 0.6682123418392593,
    "procedures": {
      "Sell - Pre registration": 94532,
      "Sale": 35618,
      "Mortgage Registration": 28893,
      "Delayed Sell": 11004,
      "Grant": 6851,
      "Delayed Mortgage": 4170,
      "Portfolio Mortgage Registration": 3806,
      "Development Registration Pre-Registration": 2114,
      "Modify Mortgage": 1877,
      "Grant Pre-Registration": 1515
    }
  },
  "rents": {
    "rows": 786138,
    "renewal_share": 0.5510457451490706,
    "areas": 198,
    "usage": {
      "Residential": 563412,
      "Commercial": 174203,
      "Industrial": 1434,
      "Storage": 126,
      "Educational facility": 116,
      "Health Facility": 89
    },
    "sub_types": {
      "Flat": 517991,
      "Office": 106873,
      "Shop": 56543,
      "Villa": 51879,
      "Labor Camps": 18316,
      "Warehouse": 7998,
      "Hotel": 6641,
      "Studio ": 6144
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.