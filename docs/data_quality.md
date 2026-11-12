# Data quality report

_Generated 2026-11-12T10:04:45+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 196,420 rows, 2026-01-01 to 2026-11-12 |
| Rent contracts loaded | PASS | 778,001 rows, 2026-01-01 to 2026-11-11 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.19% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.29% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 82.5% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.72% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.4% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.3% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 5,069 vs median 3,071 |

## Profile

```json
{
  "transactions": {
    "rows": 196420,
    "sales": 140399,
    "mortgages": 42801,
    "areas": 250,
    "projects": 3320,
    "offplan_share_of_sales": 0.6686942214688139,
    "procedures": {
      "Sell - Pre registration": 93884,
      "Sale": 35285,
      "Mortgage Registration": 28625,
      "Delayed Sell": 10914,
      "Grant": 6733,
      "Delayed Mortgage": 4129,
      "Portfolio Mortgage Registration": 3800,
      "Development Registration Pre-Registration": 2107,
      "Modify Mortgage": 1866,
      "Grant Pre-Registration": 1505
    }
  },
  "rents": {
    "rows": 778001,
    "renewal_share": 0.551401604882256,
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
      "Flat": 512504,
      "Office": 105806,
      "Shop": 56101,
      "Villa": 51301,
      "Labor Camps": 18153,
      "Warehouse": 7916,
      "Hotel": 6524,
      "Studio ": 6074
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.