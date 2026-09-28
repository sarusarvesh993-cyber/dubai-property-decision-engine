"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AreaMonth, WeeklyRents, WeeklySales } from "@/lib/types";

const short = (w: string) => {
  const d = new Date(w);
  return Number.isNaN(d.getTime()) ? w : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export function WeeklySalesChart({ data }: { data: WeeklySales[] }) {
  const rows = data.map((d) => ({ ...d, label: short(d.week), value_bn: d.sales_value_aed / 1e9 }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
        <Tooltip
          formatter={(v: number, name: string) =>
            name === "Median AED/sqft" ? [Math.round(v).toLocaleString(), name] : [v.toLocaleString(), name]
          }
        />
        <Legend />
        <Bar yAxisId="left" dataKey="sales" name="Registered sales" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="median_ppsqft_res" name="Median AED/sqft" stroke="#c8a24a" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function WeeklyRentsChart({ data }: { data: WeeklyRents[] }) {
  const rows = data.map((d) => ({ ...d, label: short(d.week) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
        <Tooltip formatter={(v: number, name: string) => [Math.round(v).toLocaleString(), name]} />
        <Legend />
        <Bar yAxisId="left" dataKey="contracts" name="Ejari contracts" fill="#0369a1" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="median_rent_res" name="Median annual rent (AED)" stroke="#c8a24a" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function AreaTrendChart({ rows }: { rows: AreaMonth[] }) {
  const months = Array.from(new Set(rows.map((r) => r.month))).sort();
  const data = months.map((m) => {
    const ready = rows.find((r) => r.month === m && r.is_offplan === 0);
    const off = rows.find((r) => r.month === m && r.is_offplan === 1);
    return { month: m, ready: ready?.median_ppsqft ?? null, offplan: off?.median_ppsqft ?? null, sales: (ready?.sales ?? 0) + (off?.sales ?? 0) };
  });
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
        <Tooltip formatter={(v: number, name: string) => [Math.round(v).toLocaleString(), name]} />
        <Legend />
        <Bar yAxisId="left" dataKey="sales" name="Sales" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="ready" name="Ready AED/sqft" stroke="#1d4ed8" strokeWidth={2} connectNulls />
        <Line yAxisId="right" type="monotone" dataKey="offplan" name="Off-plan AED/sqft" stroke="#c8a24a" strokeWidth={2} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({ data, nameKey, valueKey, color = "#1d4ed8", height = 260, pct = false }: {
  data: Array<Record<string, unknown>>;
  nameKey: string;
  valueKey: string;
  color?: string;
  height?: number;
  pct?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v: number) => (pct ? `${(v * 100).toFixed(0)}%` : v.toLocaleString())} />
        <YAxis type="category" dataKey={nameKey} width={160} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => (pct ? `${(v * 100).toFixed(1)}%` : Math.round(v).toLocaleString())} />
        <Bar dataKey={valueKey} fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
