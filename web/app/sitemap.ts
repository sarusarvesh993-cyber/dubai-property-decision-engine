import type { MetadataRoute } from "next";

const BASE = "https://dubai-property-decision-engine.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/ask", "/communities", "/fair-price", "/rent-check", "/anomalies", "/methodology"].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.8,
  }));
}
