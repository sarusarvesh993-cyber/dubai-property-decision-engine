# Data quality report

_Generated 2026-11-09T14:06:16+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 193,496 rows, 2026-01-01 to 2026-11-09 |
| Rent contracts loaded | PASS | 763,187 rows, 2026-01-01 to 2026-11-08 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.20% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.27% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 83.4% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.76% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.4% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.3% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 4,718 vs median 3,000 |

## Profile

```json
{
  "transactions": {
    "rows": 193496,
    "sales": 138498,
    "mortgages": 42143,
    "areas": 250,
    "projects": 3316,
    "offplan_share_of_sales": 0.6699952345882251,
    "procedures": {
      "Sell - Pre registration": 92793,
      "Sale": 34700,
      "Mortgage Registration": 28143,
      "Delayed Sell": 10691,
      "Grant": 6450,
      "Delayed Mortgage": 4053,
      "Portfolio Mortgage Registration": 3795,
      "Development Registration Pre-Registration": 2095,
      "Modify Mortgage": 1834,
      "Grant Pre-Registration": 1477
    }
  },
  "rents": {
    "rows": 763187,
    "renewal_share": 0.5516393754086482,
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
      "Flat": 502874,
      "Office": 103699,
      "Shop": 55091,
      "Villa": 50345,
      "Labor Camps": 17824,
      "Warehouse": 7761,
      "Hotel": 6371,
      "Studio ": 5935
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.