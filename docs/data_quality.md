# Data quality report

_Generated 2026-11-04T13:11:36+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 187,405 rows, 2026-01-01 to 2026-11-04 |
| Rent contracts loaded | PASS | 730,434 rows, 2026-01-01 to 2026-11-03 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.21% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.24% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 86.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.79% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.2% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,615 vs median 2,988 |

## Profile

```json
{
  "transactions": {
    "rows": 187405,
    "sales": 134628,
    "mortgages": 40467,
    "areas": 250,
    "projects": 3308,
    "offplan_share_of_sales": 0.6724975488011409,
    "procedures": {
      "Sell - Pre registration": 90537,
      "Sale": 33579,
      "Mortgage Registration": 27082,
      "Delayed Sell": 10200,
      "Grant": 6199,
      "Delayed Mortgage": 3883,
      "Portfolio Mortgage Registration": 3612,
      "Development Registration Pre-Registration": 2043,
      "Modify Mortgage": 1772,
      "Grant Pre-Registration": 1330
    }
  },
  "rents": {
    "rows": 730434,
    "renewal_share": 0.5526440444995715,
    "areas": 198,
    "usage": {
      "Residential": 554352,
      "Commercial": 171291,
      "Industrial": 1414,
      "Storage": 126,
      "Educational facility": 116,
      "Health Facility": 89
    },
    "sub_types": {
      "Flat": 480970,
      "Office": 99070,
      "Shop": 53071,
      "Villa": 48322,
      "Labor Camps": 17104,
      "Warehouse": 7485,
      "Hotel": 6029,
      "Studio ": 5667
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.