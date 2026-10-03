# Data quality report

_Generated 2026-10-03T10:32:38+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 167,371 rows, 2026-01-01 to 2026-10-03 |
| Rent contracts loaded | PASS | 629,888 rows, 2026-01-01 to 2026-10-02 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.24% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.19% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 88.1% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.84% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.7% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,521 vs median 3,000 |

## Profile

```json
{
  "transactions": {
    "rows": 167371,
    "sales": 121857,
    "mortgages": 35193,
    "areas": 250,
    "projects": 3184,
    "offplan_share_of_sales": 0.6823243638034746,
    "procedures": {
      "Sell - Pre registration": 83146,
      "Sale": 29441,
      "Mortgage Registration": 23802,
      "Delayed Sell": 8985,
      "Grant": 5241,
      "Delayed Mortgage": 3374,
      "Portfolio Mortgage Registration": 3133,
      "Development Registration Pre-Registration": 1819,
      "Modify Mortgage": 1335,
      "Portfolio Mortgage Modification": 1097
    }
  },
  "rents": {
    "rows": 629888,
    "renewal_share": 0.5580912797195692,
    "areas": 196,
    "usage": {
      "Residential": 475531,
      "Commercial": 150168,
      "Industrial": 1227,
      "Storage": 117,
      "Educational facility": 95,
      "Health Facility": 79
    },
    "sub_types": {
      "Flat": 412239,
      "Office": 86650,
      "Shop": 46895,
      "Villa": 41679,
      "Labor Camps": 14851,
      "Warehouse": 6527,
      "Hotel": 5198,
      "Studio ": 4808
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.