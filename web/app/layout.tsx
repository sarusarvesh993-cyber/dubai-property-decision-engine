import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

const SITE_URL = "https://dubai-property-decision-engine.vercel.app";
const DESCRIPTION =
  "Daily-refreshed fair-price, rent-check and market-pulse analytics built on official Dubai Land Department open data, with a copilot that answers questions from the published benchmarks.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Dubai Property Decision Engine", template: "%s" },
  description: DESCRIPTION,
  applicationName: "Dubai Property Decision Engine",
  keywords: ["Dubai property", "DLD open data", "Ejari", "fair price", "rent check", "RERA rent increase", "market pulse", "data analytics"],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Dubai Property Decision Engine",
    title: "Dubai Property Decision Engine",
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Dubai Property Decision Engine" }],
  },
  twitter: { card: "summary_large_image", title: "Dubai Property Decision Engine", description: DESCRIPTION, images: ["/opengraph-image"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="container">{children}</main>
        <footer className="footer">
          Built on Dubai Land Department open data (registered transactions and Ejari contracts). Analytics are indicative
          and not a valuation, legal or investment advice. Rent-increase limits follow Decree 43/2013 slabs; the official RERA
          calculator is authoritative.
        </footer>
      </body>
    </html>
  );
}
