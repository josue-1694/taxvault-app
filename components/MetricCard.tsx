"use client";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/tax-engine";

interface MetricCardProps {
  label: string;
  value: number;
  glow: "cyan" | "green" | "violet" | "amber" | "red";
  prefix?: string;
  suffix?: string;
  private?: boolean;
  locked?: boolean;
  sub?: string;
}

export default function MetricCard({ label, value, glow, private: isPrivate, locked, sub }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`card card-glow-${glow} relative overflow-hidden`}
    >
      {isPrivate && (
        <div className="absolute top-2 right-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {locked ? "🔒" : "👁"}
          </span>
        </div>
      )}
      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold num" style={{ color: `var(--${glow})` }}>
        {isPrivate && locked ? "••••••" : formatCurrency(value)}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}
