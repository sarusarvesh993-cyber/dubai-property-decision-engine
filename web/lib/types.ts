export type WeeklySales = {
  week: string;
  sales: number;
  sales_value_aed: number;
  mortgages: number;
  offplan_share: number | null;
  n_res_bench: number;
  median_ppsqft_res: number | null;
  median_price_res: number | null;
};

export type WeeklyRents = {
  week: string;
  contracts: number;
  renewal_share: number | null;
  n_res_bench: number;
  median_rent_res: number | null;
  median_rent_psqft_res: number | null;
};

export type Kpi = {
  sales: number;
  value_aed: number;
  mortgages: number;
  offplan_share: number;
  median_ppsqft_res: number;
};

export type Summary = {
  as_of: string;
  rent_as_of: string;
  coverage_from: string;
  built_at_utc: string;
  rows: { transactions: number; rents: number };
  kpi_last4w: Kpi | null;
  kpi_prev4w: Kpi | null;
  rent_kpi_last4w: {
    contracts: number;
    renewal_share: number;
    median_rent_res: number;
    median_rent_psqft_res: number;
  } | null;
  weekly_sales: WeeklySales[];
  weekly_rents: WeeklyRents[];
  params: { min_cell_n: number; sales_months: number; rent_months: number };
};

export type AreaRow = {
  area: string;
  sales_12w: number;
  value_12w: number | null;
  offplan_share_12w: number | null;
  mortgages_12w: number;
  n_bench_12w: number;
  median_ppsqft_12w: number | null;
  median_price_12w: number | null;
  sales_prev_12w: number | null;
  n_bench_prev_12w: number | null;
  median_ppsqft_prev_12w: number | null;
  ppsqft_change_12w: number | null;
  rent_contracts_12w: number | null;
  renewal_share_12w: number | null;
  n_rent_bench_12w: number | null;
  median_rent_12w: number | null;
  median_rent_psqft_12w: number | null;
  gross_yield_est: number | null;
  signal: string;
};

export type AreaMonth = {
  area: string;
  month: string;
  is_offplan: number;
  sales: number;
  sales_value_aed: number | null;
  n_bench: number;
  median_ppsqft: number | null;
  p25_ppsqft: number | null;
  p75_ppsqft: number | null;
};

export type AreasFile = { as_of: string; areas: AreaRow[]; area_month: AreaMonth[] };

export type PriceBand = {
  level: "L0" | "L1" | "L2" | "L3";
  area: string;
  project: string | null;
  sub_type: string | null;
  rooms: string | null;
  is_offplan: number;
  n: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  median_size_sqft: number;
  median_price: number;
  first_date: string;
  last_date: string;
};

export type PriceBandsFile = { as_of: string; window_months: number; min_n: number; bands: PriceBand[] };

export type RentBenchmark = {
  level: "R1" | "R2" | "R3";
  area: string;
  sub_type: string;
  size_band: string | null;
  is_renewal: number | null;
  n: number;
  p25: number;
  median: number;
  p75: number;
  median_rent_psqft: number;
  median_size_sqft: number;
  first_date: string;
  last_date: string;
};

export type RentBenchmarksFile = { as_of: string; window_months: number; min_n: number; benchmarks: RentBenchmark[] };

export type Anomaly = {
  transaction_id: string;
  date: string;
  area: string;
  project: string | null;
  sub_type: string;
  rooms: string;
  is_offplan: number;
  size_sqft: number;
  price_aed: number;
  price_per_sqft: number;
  cell_median_ppsqft: number;
  cell_n: number;
  cell_level: string;
  deviation_pct: number;
  direction: "above" | "below";
};

export type AnomaliesFile = { as_of: string; total: number; items: Anomaly[] };

export type ProjectRow = {
  project: string;
  area: string;
  sales: number;
  value_aed: number | null;
  offplan_share: number | null;
  n_bench: number;
  median_ppsqft: number | null;
};

export type ProjectsFile = { as_of: string; projects: ProjectRow[] };

export type MarketNote = {
  generated_at_utc: string;
  as_of: string;
  source: string;
  text: string;
};

export type QualityCheck = { check: string; status: "PASS" | "WARN"; detail: string };
export type QualityFile = { generated_at_utc: string; checks: QualityCheck[]; warnings: number };

export type CrosswalkRow = {
  district: string;
  community: string;
  method: string;
  projects: number | null;
  contracts: number | null;
  share: number | null;
};
export type CrosswalkFile = { as_of: string; mappings: CrosswalkRow[] };
