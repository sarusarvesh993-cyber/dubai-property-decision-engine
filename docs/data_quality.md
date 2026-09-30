# Data quality report

_Generated 2026-09-30T08:31:39+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 164,958 rows, 2026-01-01 to 2026-09-30 |
| Rent contracts loaded | PASS | 616,985 rows, 2026-01-01 to 2026-09-29 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.25% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 0.77% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.4% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.85% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.7% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 73.9% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,521 vs median 3,000 |

## Profile

```json
{
  "transactions": {
    "rows": 164958,
    "sales": 120040,
    "mortgages": 34731,
    "areas": 250,
    "projects": 3156,
    "offplan_share_of_sales": 0.6859963345551483,
    "procedures": {
      "Sell - Pre registration": 82347,
      "Sale": 29028,
      "Mortgage Registration": 23466,
      "Delayed Sell": 8380,
      "Grant": 5152,
      "Delayed Mortgage": 3323,
      "Portfolio Mortgage Registration": 3133,
      "Development Registration Pre-Registration": 1813,
      "Modify Mortgage": 1311,
      "Portfolio Mortgage Modification": 1073
    }
  },
  "rents": {
    "rows": 616985,
    "renewal_share": 0.559854777668825,
    "areas": 196,
    "usage": {
      "Residential": 465306,
      "Commercial": 147567,
      "Industrial": 1204,
      "Storage": 117,
      "Educational facility": 95,
      "Health Facility": 79
    },
    "sub_types": {
      "Flat": 403427,
      "Office": 85103,
      "Shop": 46239,
      "Villa": 40824,
      "Labor Camps": 14440,
      "Warehouse": 6427,
      "Hotel": 5001,
      "Studio ": 4701
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.