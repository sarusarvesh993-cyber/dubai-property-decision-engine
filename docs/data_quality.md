# Data quality report

_Generated 2026-11-14T09:11:43+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 197,550 rows, 2026-01-01 to 2026-11-14 |
| Rent contracts loaded | PASS | 784,215 rows, 2026-01-01 to 2026-11-13 |
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
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 5,070 vs median 3,071 |

## Profile

```json
{
  "transactions": {
    "rows": 197550,
    "sales": 141104,
    "mortgages": 43078,
    "areas": 250,
    "projects": 3324,
    "offplan_share_of_sales": 0.6680250028347885,
    "procedures": {
      "Sell - Pre registration": 94261,
      "Sale": 35542,
      "Mortgage Registration": 28831,
      "Delayed Sell": 10985,
      "Grant": 6843,
      "Delayed Mortgage": 4164,
      "Portfolio Mortgage Registration": 3806,
      "Development Registration Pre-Registration": 2114,
      "Modify Mortgage": 1874,
      "Grant Pre-Registration": 1512
    }
  },
  "rents": {
    "rows": 784215,
    "renewal_share": 0.5511473256696187,
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
      "Flat": 516605,
      "Office": 106681,
      "Shop": 56449,
      "Villa": 51721,
      "Labor Camps": 18300,
      "Warehouse": 7991,
      "Hotel": 6612,
      "Studio ": 6123
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.