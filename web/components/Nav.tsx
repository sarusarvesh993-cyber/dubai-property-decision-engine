"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Market pulse" },
  { href: "/renewal-agent", label: "✨ Renter Agent (New)" },
  { href: "/rent-check", label: "Rent check" },
  { href: "/fair-price", label: "Fair price" },
  { href: "/ask", label: "Ask" },
  { href: "/communities", label: "Communities" },
  { href: "/anomalies", label: "Anomalies" },
  { href: "/methodology", label: "Methodology" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden />
          Dubai Property Decision Engine
        </Link>
        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={path === l.href ? "active" : undefined}
              style={l.href === "/renewal-agent" ? { fontWeight: 700, color: "#fff", background: "rgba(200, 162, 74, 0.3)" } : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
