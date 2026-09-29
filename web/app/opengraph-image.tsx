import { ImageResponse } from "next/og";
import summary from "@/public/data/summary.json";

export const runtime = "nodejs";
export const alt = "Dubai Property Decision Engine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const s = summary as { as_of: string; rows: { transactions: number; rents: number } };
  const fmt = (n: number) => n.toLocaleString("en-US");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>Official DLD open data, refreshed every morning</div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, marginTop: 12, lineHeight: 1.1 }}>Dubai Property Decision Engine</div>
          <div style={{ display: "flex", fontSize: 32, marginTop: 24, opacity: 0.95 }}>Fair price checker, rent check with RERA slabs, market pulse, anomaly monitor and a copilot that only quotes published benchmarks.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, opacity: 0.9 }}>
          <div style={{ display: "flex" }}>{fmt(s.rows.transactions)} registered transactions</div>
          <div style={{ display: "flex" }}>{fmt(s.rows.rents)} Ejari contracts</div>
          <div style={{ display: "flex" }}>data to {s.as_of}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
