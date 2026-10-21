# Data quality report

_Generated 2026-10-21T07:55:10+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 176,701 rows, 2026-01-01 to 2026-10-21 |
| Rent contracts loaded | PASS | 686,161 rows, 2026-01-01 to 2026-10-20 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.22% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.14% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.74% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,518 vs median 2,967 |

## Profile

```json
{
  "transactions": {
    "rows": 176701,
    "sales": 127859,
    "mortgages": 37700,
    "areas": 250,
    "projects": 3266,
    "offplan_share_of_sales": 0.6798113546954067,
    "procedures": {
      "Sell - Pre registration": 86920,
      "Sale": 31186,
      "Mortgage Registration": 25413,
      "Delayed Sell": 9456,
      "Grant": 5690,
      "Delayed Mortgage": 3602,
      "Portfolio Mortgage Registration": 3296,
      "Development Registration Pre-Registration": 1948,
      "Modify Mortgage": 1609,
      "Portfolio Mortgage Modification": 1194
    }
  },
  "rents": {
    "rows": 686161,
    "renewal_share": 0.5559803019990935,
    "areas": 197,
    "usage": {
      "Residential": 519970,
      "Commercial": 161682,
      "Industrial": 1338,
      "Storage": 123,
      "Educational facility": 107,
      "Health Facility": 87
    },
    "sub_types": {
      "Flat": 450994,
      "Office": 93232,
      "Shop": 50432,
      "Villa": 45423,
      "Labor Camps": 16107,
      "Warehouse": 7087,
      "Hotel": 5593,
      "Studio ": 5308
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.