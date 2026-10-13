# Data quality report

_Generated 2026-10-13T12:52:15+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 172,617 rows, 2026-01-01 to 2026-10-13 |
| Rent contracts loaded | PASS | 660,191 rows, 2026-01-01 to 2026-10-12 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.23% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.16% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.77% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,433 vs median 2,975 |

## Profile

```json
{
  "transactions": {
    "rows": 172617,
    "sales": 125203,
    "mortgages": 36642,
    "areas": 250,
    "projects": 3230,
    "offplan_share_of_sales": 0.6807424742218637,
    "procedures": {
      "Sell - Pre registration": 85231,
      "Sale": 30419,
      "Mortgage Registration": 24680,
      "Delayed Sell": 9260,
      "Grant": 5530,
      "Delayed Mortgage": 3502,
      "Portfolio Mortgage Registration": 3268,
      "Development Registration Pre-Registration": 1859,
      "Modify Mortgage": 1573,
      "Portfolio Mortgage Modification": 1097
    }
  },
  "rents": {
    "rows": 660191,
    "renewal_share": 0.5572326796336212,
    "areas": 196,
    "usage": {
      "Residential": 499616,
      "Commercial": 156189,
      "Industrial": 1286,
      "Storage": 120,
      "Educational facility": 100,
      "Health Facility": 86
    },
    "sub_types": {
      "Flat": 433306,
      "Office": 90134,
      "Shop": 48711,
      "Villa": 43680,
      "Labor Camps": 15505,
      "Warehouse": 6822,
      "Hotel": 5400,
      "Studio ": 5066
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.