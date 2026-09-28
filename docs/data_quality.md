# Data quality report

_Generated 2026-09-28T15:03:45+00:00 — regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | ✅ PASS | 7,014 rows, 2026-09-14 -> 2026-09-28 |
| Rent contracts loaded | ✅ PASS | 35,796 rows, 2026-09-15 -> 2026-09-27 |
| Transactions freshness ≤ 3 days | ✅ PASS | latest registration 0 day(s) old |
| Rents freshness ≤ 3 days | ✅ PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% | ✅ PASS | 0.47% duplicate rows on id+price+size+procedure |
| Sale price completeness ≥ 99% | ✅ PASS | 0.00% sales without price |
| Sale size completeness ≥ 95% | ✅ PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60–100% | ✅ PASS | 96.7% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | ✅ PASS | 2.86% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | ✅ PASS | 95% null |
| Bulk leases share < 15% | ✅ PASS | 4.8% of contracts cover >1 property |
| Benchmark-eligible share of residential rents ≥ 60% | ✅ PASS | 88.9% eligible |
| Sales in communities with rent coverage ≥ 70% (after crosswalk) | ✅ PASS | 75.7% of sales can be matched to Ejari benchmarks |

## Profile

```json
{
  "transactions": {
    "rows": 7014,
    "sales": 4598,
    "mortgages": 1942,
    "areas": 184,
    "projects": 1529,
    "offplan_share_of_sales": 0.6246193997390169,
    "procedures": {
      "Sell - Pre registration": 2872,
      "Sale": 1372,
      "Mortgage Registration": 1364,
      "Delayed Sell": 334,
      "Grant": 237,
      "Delayed Mortgage": 205,
      "Portfolio Mortgage Registration": 161,
      "Modify Mortgage": 91,
      "Grant Pre-Registration": 71,
      "Development Registration Pre-Registration": 68
    }
  },
  "rents": {
    "rows": 35796,
    "renewal_share": 0.4931556598502626,
    "areas": 179,
    "usage": {
      "Residential": 28700,
      "Commercial": 6870,
      "Industrial": 49,
      "Storage": 13,
      "Educational facility": 9,
      "Health Facility": 1
    },
    "sub_types": {
      "Flat": 24888,
      "Office": 3813,
      "Villa": 2637,
      "Shop": 2095,
      "Labor Camps": 781,
      "Hotel": 344,
      "Warehouse": 324,
      "Studio ": 283
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.