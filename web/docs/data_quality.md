# Data quality report

_Generated 2026-10-09T12:03:53+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 170,738 rows, 2026-01-01 to 2026-10-09 |
| Rent contracts loaded | PASS | 649,978 rows, 2026-01-01 to 2026-10-08 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.24% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.17% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.1% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.80% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.7% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.4% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.0% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,907 vs median 2,988 |

## Profile

```json
{
  "transactions": {
    "rows": 170738,
    "sales": 124027,
    "mortgages": 36139,
    "areas": 250,
    "projects": 3216,
    "offplan_share_of_sales": 0.6808759383037565,
    "procedures": {
      "Sell - Pre registration": 84447,
      "Sale": 30113,
      "Mortgage Registration": 24376,
      "Delayed Sell": 9176,
      "Grant": 5412,
      "Delayed Mortgage": 3460,
      "Portfolio Mortgage Registration": 3154,
      "Development Registration Pre-Registration": 1823,
      "Modify Mortgage": 1557,
      "Portfolio Mortgage Modification": 1097
    }
  },
  "rents": {
    "rows": 649978,
    "renewal_share": 0.5575157928422193,
    "areas": 196,
    "usage": {
      "Residential": 491401,
      "Commercial": 154259,
      "Industrial": 1263,
      "Storage": 118,
      "Educational facility": 99,
      "Health Facility": 85
    },
    "sub_types": {
      "Flat": 426096,
      "Office": 89039,
      "Shop": 48113,
      "Villa": 42983,
      "Labor Camps": 15348,
      "Warehouse": 6727,
      "Hotel": 5314,
      "Studio ": 4953
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.