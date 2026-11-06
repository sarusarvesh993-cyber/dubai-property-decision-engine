# Data quality report

_Generated 2026-11-06T13:08:04+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 188,685 rows, 2026-01-01 to 2026-11-06 |
| Rent contracts loaded | PASS | 738,127 rows, 2026-01-01 to 2026-11-05 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.20% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.24% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 86.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.79% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.2% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,615 vs median 2,988 |

## Profile

```json
{
  "transactions": {
    "rows": 188685,
    "sales": 135450,
    "mortgages": 40823,
    "areas": 250,
    "projects": 3314,
    "offplan_share_of_sales": 0.6720118124769288,
    "procedures": {
      "Sell - Pre registration": 91024,
      "Sale": 33818,
      "Mortgage Registration": 27327,
      "Delayed Sell": 10296,
      "Grant": 6249,
      "Delayed Mortgage": 3925,
      "Portfolio Mortgage Registration": 3614,
      "Development Registration Pre-Registration": 2064,
      "Modify Mortgage": 1782,
      "Grant Pre-Registration": 1345
    }
  },
  "rents": {
    "rows": 738127,
    "renewal_share": 0.5524767418073042,
    "areas": 198,
    "usage": {
      "Residential": 559971,
      "Commercial": 173296,
      "Industrial": 1432,
      "Storage": 126,
      "Educational facility": 116,
      "Health Facility": 89
    },
    "sub_types": {
      "Flat": 485877,
      "Office": 100265,
      "Shop": 53617,
      "Villa": 48776,
      "Labor Camps": 17302,
      "Warehouse": 7563,
      "Hotel": 6120,
      "Studio ": 5728
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.