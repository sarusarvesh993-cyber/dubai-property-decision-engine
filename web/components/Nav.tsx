"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Market pulse" },
  { href: "/communities", label: "Communities" },
  { href: "/fair-price", label: "Fair price" },
  { href: "/rent-check", label: "Rent check" },
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
            <Link key={l.href} href={l.href} className={path === l.href ? "active" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
