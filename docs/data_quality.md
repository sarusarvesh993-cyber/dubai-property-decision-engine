# Data quality report

_Generated 2026-10-11T09:09:08+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 171,244 rows, 2026-01-01 to 2026-10-11 |
| Rent contracts loaded | PASS | 655,049 rows, 2026-01-01 to 2026-10-10 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.24% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.16% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.77% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.7% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.4% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,907 vs median 2,988 |

## Profile

```json
{
  "transactions": {
    "rows": 171244,
    "sales": 124395,
    "mortgages": 36235,
    "areas": 250,
    "projects": 3217,
    "offplan_share_of_sales": 0.6810080791028579,
    "procedures": {
      "Sell - Pre registration": 84714,
      "Sale": 30195,
      "Mortgage Registration": 24449,
      "Delayed Sell": 9194,
      "Grant": 5424,
      "Delayed Mortgage": 3468,
      "Portfolio Mortgage Registration": 3159,
      "Development Registration Pre-Registration": 1838,
      "Modify Mortgage": 1562,
      "Portfolio Mortgage Modification": 1097
    }
  },
  "rents": {
    "rows": 655049,
    "renewal_share": 0.557205644157918,
    "areas": 196,
    "usage": {
      "Residential": 495411,
      "Commercial": 155284,
      "Industrial": 1281,
      "Storage": 120,
      "Educational facility": 100,
      "Health Facility": 85
    },
    "sub_types": {
      "Flat": 429633,
      "Office": 89641,
      "Shop": 48399,
      "Villa": 43306,
      "Labor Camps": 15425,
      "Warehouse": 6789,
      "Hotel": 5370,
      "Studio ": 5010
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.