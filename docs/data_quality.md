# Data quality report

_Generated 2026-10-26T07:59:42+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 181,287 rows, 2026-01-01 to 2026-10-26 |
| Rent contracts loaded | PASS | 699,423 rows, 2026-01-01 to 2026-10-25 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.22% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.14% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 86.3% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.84% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 3,084 vs median 3,000 |

## Profile

```json
{
  "transactions": {
    "rows": 181287,
    "sales": 130698,
    "mortgages": 38864,
    "areas": 250,
    "projects": 3285,
    "offplan_share_of_sales": 0.6762995608195994,
    "procedures": {
      "Sell - Pre registration": 88391,
      "Sale": 32242,
      "Mortgage Registration": 26066,
      "Delayed Sell": 9757,
      "Grant": 5952,
      "Delayed Mortgage": 3728,
      "Portfolio Mortgage Registration": 3406,
      "Development Registration Pre-Registration": 1987,
      "Modify Mortgage": 1693,
      "Portfolio Mortgage Modification": 1295
    }
  },
  "rents": {
    "rows": 699423,
    "renewal_share": 0.5548359147468699,
    "areas": 197,
    "usage": {
      "Residential": 530358,
      "Commercial": 164482,
      "Industrial": 1359,
      "Storage": 123,
      "Educational facility": 108,
      "Health Facility": 87
    },
    "sub_types": {
      "Flat": 460020,
      "Office": 94895,
      "Shop": 51255,
      "Villa": 46331,
      "Labor Camps": 16412,
      "Warehouse": 7203,
      "Hotel": 5713,
      "Studio ": 5406
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.