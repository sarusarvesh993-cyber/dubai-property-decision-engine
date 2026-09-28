import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Dubai Property Decision Engine",
  description:
    "Daily-refreshed fair-price, rent-check and market-pulse analytics built on official Dubai Land Department open data.",
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
