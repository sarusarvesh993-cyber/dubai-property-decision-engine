# Data quality report

_Generated 2026-10-17T09:33:48+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 175,135 rows, 2026-01-01 to 2026-10-16 |
| Rent contracts loaded | PASS | 676,120 rows, 2026-01-01 to 2026-10-16 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.23% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.14% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.77% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.4% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,433 vs median 2,975 |

## Profile

```json
{
  "transactions": {
    "rows": 175135,
    "sales": 126831,
    "mortgages": 37302,
    "areas": 250,
    "projects": 3254,
    "offplan_share_of_sales": 0.680015138254843,
    "procedures": {
      "Sell - Pre registration": 86247,
      "Sale": 30890,
      "Mortgage Registration": 25108,
      "Delayed Sell": 9397,
      "Grant": 5620,
      "Delayed Mortgage": 3561,
      "Portfolio Mortgage Registration": 3292,
      "Development Registration Pre-Registration": 1945,
      "Modify Mortgage": 1591,
      "Portfolio Mortgage Modification": 1189
    }
  },
  "rents": {
    "rows": 676120,
    "renewal_share": 0.5561276104833461,
    "areas": 196,
    "usage": {
      "Residential": 511763,
      "Commercial": 159880,
      "Industrial": 1319,
      "Storage": 122,
      "Educational facility": 107,
      "Health Facility": 86
    },
    "sub_types": {
      "Flat": 443822,
      "Office": 92318,
      "Shop": 49795,
      "Villa": 44725,
      "Labor Camps": 15894,
      "Warehouse": 6992,
      "Hotel": 5530,
      "Studio ": 5209
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.