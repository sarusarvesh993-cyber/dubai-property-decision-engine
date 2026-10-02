# Data quality report

_Generated 2026-10-02T08:45:59+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 166,828 rows, 2026-01-01 to 2026-10-02 |
| Rent contracts loaded | PASS | 626,082 rows, 2026-01-01 to 2026-10-01 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.25% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.19% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.1% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.84% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.7% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.4% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,521 vs median 3,000 |

## Profile

```json
{
  "transactions": {
    "rows": 166828,
    "sales": 121431,
    "mortgages": 35116,
    "areas": 250,
    "projects": 3178,
    "offplan_share_of_sales": 0.6820745938022416,
    "procedures": {
      "Sell - Pre registration": 82825,
      "Sale": 29358,
      "Mortgage Registration": 23738,
      "Delayed Sell": 8963,
      "Grant": 5212,
      "Delayed Mortgage": 3368,
      "Portfolio Mortgage Registration": 3133,
      "Development Registration Pre-Registration": 1819,
      "Modify Mortgage": 1333,
      "Portfolio Mortgage Modification": 1097
    }
  },
  "rents": {
    "rows": 626082,
    "renewal_share": 0.558564213633358,
    "areas": 196,
    "usage": {
      "Residential": 472460,
      "Commercial": 149456,
      "Industrial": 1220,
      "Storage": 117,
      "Educational facility": 95,
      "Health Facility": 79
    },
    "sub_types": {
      "Flat": 409534,
      "Office": 86193,
      "Shop": 46729,
      "Villa": 41422,
      "Labor Camps": 14784,
      "Warehouse": 6502,
      "Hotel": 5158,
      "Studio ": 4779
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.