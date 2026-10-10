// Static imports of the pipeline artefacts. Bundled at build time, so both pages and the
// serverless /api/ask function can read them without touching the file system on Vercel.
import anomaliesJson from "@/public/data/anomalies.json";
import areasJson from "@/public/data/areas.json";
import crosswalkJson from "@/public/data/crosswalk.json";
import priceBandsJson from "@/public/data/price_bands.json";
import rentBenchmarksJson from "@/public/data/rent_benchmarks.json";
import summaryJson from "@/public/data/summary.json";
import type { AnomaliesFile, AreasFile, CrosswalkFile, PriceBandsFile, RentBenchmarksFile, Summary } from "./types";

export const DATASET = {
  summary: summaryJson as unknown as Summary,
  areas: areasJson as unknown as AreasFile,
  priceBands: priceBandsJson as unknown as PriceBandsFile,
  rentBenchmarks: rentBenchmarksJson as unknown as RentBenchmarksFile,
  anomalies: anomaliesJson as unknown as AnomaliesFile,
  crosswalk: crosswalkJson as unknown as CrosswalkFile,
};
