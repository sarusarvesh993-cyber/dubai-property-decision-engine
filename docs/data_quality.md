# Data quality report

_Generated 2026-11-01T09:29:28+00:00. Regenerated on every pipeline run._

| Check | Status | Detail |
|---|---|---|
| Transactions loaded | PASS | 185,010 rows, 2026-01-01 to 2026-11-01 |
| Rent contracts loaded | PASS | 721,001 rows, 2026-01-01 to 2026-10-31 |
| Transactions fresh within 3 days | PASS | latest registration 0 day(s) old |
| Rents fresh within 3 days | PASS | latest registration 0 day(s) old |
| Transaction duplicates < 0.5% (outside multi-unit deals) | PASS | 0.00% duplicate rows on id+price+size+procedure among single-unit transactions |
| No land plots in the pricing universe | PASS | 0.00% of eligible sales are land plots |
| Partial-share transfers excluded from benchmarks (< 3% of sales) | PASS | 1.21% of sales transfer only a share of the unit (procedure area below unit area); kept in volumes, out of benchmarks |
| Portfolio blocks excluded from benchmarks (< 3% of sales) | PASS | 1.24% of sales sit in same-day blocks of 10+ ready units at one AED/sqft; kept in volumes, out of benchmarks |
| Sale price completeness >= 99% | PASS | 0.00% sales without price |
| Sale size completeness >= 95% | PASS | 0.00% sales without size |
| Benchmark-eligible share of sales 60-100% | PASS | 86.3% of sales eligible after bulk/plausibility/outlier filters |
| Sales outlier rate < 5% | PASS | 1.82% flagged by robust z-score |
| Rents ROOMS null (known gateway gap; size bands used instead) | PASS | 96% null |
| Bulk leases share < 15% | PASS | 5.6% of contracts cover >1 property |
| Benchmark-eligible share of residential rents >= 60% | PASS | 88.5% eligible |
| Sales in communities with rent coverage >= 70% (after crosswalk) | PASS | 74.1% of sales can be matched to Ejari benchmarks |
| Weekly volume within 50-200% of median (last full week) | PASS | last full week 3,088 vs median 3,000 |

## Profile

```json
{
  "transactions": {
    "rows": 185010,
    "sales": 133197,
    "mortgages": 39765,
    "areas": 250,
    "projects": 3298,
    "offplan_share_of_sales": 0.6736337905508383,
    "procedures": {
      "Sell - Pre registration": 89726,
      "Sale": 33160,
      "Mortgage Registration": 26718,
      "Delayed Sell": 10000,
      "Grant": 6095,
      "Delayed Mortgage": 3824,
      "Portfolio Mortgage Registration": 3438,
      "Development Registration Pre-Registration": 2042,
      "Modify Mortgage": 1740,
      "Portfolio Mortgage Modification": 1295
    }
  },
  "rents": {
    "rows": 721001,
    "renewal_share": 0.5528563760660526,
    "areas": 198,
    "usage": {
      "Residential": 547115,
      "Commercial": 169155,
      "Industrial": 1402,
      "Storage": 123,
      "Educational facility": 111,
      "Health Facility": 89
    },
    "sub_types": {
      "Flat": 474680,
      "Office": 97716,
      "Shop": 52525,
      "Villa": 47696,
      "Labor Camps": 16885,
      "Warehouse": 7402,
      "Hotel": 5942,
      "Studio ": 5592
    }
  }
}
```

## Known limitations of the public gateway

* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.
* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.
* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.
* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward.