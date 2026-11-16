# Data quality report

_Generated 2026-11-16T13:51:21+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 198,358 rows, 2026-01-01 to 2026-11-16 |
| Rent contracts loaded | PASS | 786,142 rows, 2026-01-01 to 2026-11-15 |
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
    "rows": 198358,
    "sales": 141628,
    "mortgages": 43325,
    "areas": 251,
    "projects": 3327,
    "offplan_share_of_sales": 0.6680317451351427,
    "procedures": {
      "Sell - Pre registration": 94612,
      "Sale": 35678,
      "Mortgage Registration": 28944,
      "Delayed Sell": 11022,
      "Grant": 6867,
      "Delayed Mortgage": 4175,
      "Portfolio Mortgage Registration": 3806,
      "Development Registration Pre-Registration": 2116,
      "Modify Mortgage": 1878,
      "Grant Pre-Registration": 1516
    }
  },
  "rents": {
    "rows": 786142,
    "renewal_share": 0.5510442133863857,
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
      "Flat": 517992,
      "Office": 106874,
      "Shop": 56545,
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