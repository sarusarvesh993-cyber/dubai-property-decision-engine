export const fmtInt = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v) ? "n/a" : Math.round(v).toLocaleString("en-AE");

export const fmtAed = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined || Number.isNaN(v) ? "n/a" : `AED ${v.toLocaleString("en-AE", { maximumFractionDigits: digits })}`;

export const fmtBn = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v) ? "n/a" : `AED ${(v / 1e9).toFixed(2)} bn`;

export const fmtMn = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v)
    ? "n/a"
    : v >= 1e9
      ? `AED ${(v / 1e9).toFixed(2)} bn`
      : `AED ${(v / 1e6).toFixed(1)} m`;

export const fmtPct = (v: number | null | undefined, digits = 1, signed = false) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  const s = (v * 100).toFixed(digits);
  return signed && v > 0 ? `+${s}%` : `${s}%`;
};

export const delta = (cur?: number | null, prev?: number | null) =>
  cur === null || cur === undefined || prev === null || prev === undefined || prev === 0 ? null : cur / prev - 1;

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "n/a";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const titleCase = (s: string | null | undefined) => (s ? s : "n/a");

export const SQFT_PER_SQM = 10.7639;
