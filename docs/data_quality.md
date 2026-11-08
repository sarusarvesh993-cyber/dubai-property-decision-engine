# Data quality report

_Generated 2026-11-08T12:04:10+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 189,203 rows, 2026-01-01 to 2026-11-08 |
| Rent contracts loaded | PASS | 742,496 rows, 2026-01-01 to 2026-11-07 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.21% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.25% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 86.2% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.80% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.4% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.2% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 2,615 vs median 2,988 |

## Profile

```json
{
  "transactions": {
    "rows": 189203,
    "sales": 135812,
    "mortgages": 40943,
    "areas": 250,
    "projects": 3315,
    "offplan_share_of_sales": 0.6720540158454333,
    "procedures": {
      "Sell - Pre registration": 91273,
      "Sale": 33902,
      "Mortgage Registration": 27417,
      "Delayed Sell": 10325,
      "Grant": 6271,
      "Delayed Mortgage": 3937,
      "Portfolio Mortgage Registration": 3619,
      "Development Registration Pre-Registration": 2064,
      "Modify Mortgage": 1788,
      "Grant Pre-Registration": 1353
    }
  },
  "rents": {
    "rows": 742496,
    "renewal_share": 0.5523302482437615,
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
      "Flat": 488871,
      "Office": 100817,
      "Shop": 53857,
      "Villa": 49030,
      "Labor Camps": 17380,
      "Warehouse": 7592,
      "Hotel": 6159,
      "Studio ": 5761
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.