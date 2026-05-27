"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",     icon: "⌂",  label: "Home" },
  { href: "/transactions",  icon: "↕",  label: "Transactions" },
  { href: "/deductions",    icon: "✂",  label: "Deductions" },
  { href: "/fbar",          icon: "🌐", label: "FBAR" },
  { href: "/export",        icon: "↓",  label: "Export", highlight: true },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-around h-14">
        {NAV.map((item) => {
          const active = path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-4 py-1">
              <span
                className="text-lg leading-none"
                style={{ color: item.highlight ? "var(--cyan)" : active ? "var(--text)" : "var(--text-muted)" }}
              >
                {item.icon}
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: item.highlight ? "var(--cyan)" : active ? "var(--text)" : "var(--text-muted)" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
