"use client";
import { TAX_CONSTANTS, formatCurrency } from "@/lib/tax-engine";

interface Props { highestBalance: number; yearEndBalance: number; }

export default function FbarAlert({ highestBalance, yearEndBalance }: Props) {
  const fbar = highestBalance > TAX_CONSTANTS.FBAR_THRESHOLD;
  const fatca = yearEndBalance > TAX_CONSTANTS.FATCA_THRESHOLD_YEAREND;

  return (
    <div className="space-y-2 mt-3">
      <div className="card flex items-center justify-between"
        style={{ borderColor: fbar ? "rgba(255,77,109,0.3)" : "rgba(0,255,136,0.2)" }}>
        <div>
          <p className="text-xs font-semibold" style={{ color: fbar ? "var(--red)" : "var(--green)" }}>
            FBAR {fbar ? "REQUIRED" : "not required"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Highest: {formatCurrency(highestBalance)} — Threshold: {formatCurrency(TAX_CONSTANTS.FBAR_THRESHOLD)}
          </p>
        </div>
        <span className="text-xl">{fbar ? "🚨" : "✅"}</span>
      </div>
      <div className="card flex items-center justify-between"
        style={{ borderColor: fatca ? "rgba(255,77,109,0.3)" : "rgba(0,255,136,0.2)" }}>
        <div>
          <p className="text-xs font-semibold" style={{ color: fatca ? "var(--red)" : "var(--green)" }}>
            FATCA 8938 {fatca ? "REQUIRED" : "not required"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Year-end: {formatCurrency(yearEndBalance)} — Threshold: {formatCurrency(TAX_CONSTANTS.FATCA_THRESHOLD_YEAREND)}
          </p>
        </div>
        <span className="text-xl">{fatca ? "🚨" : "✅"}</span>
      </div>
      <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
        ⚠ FBAR and FATCA are separate — both may apply simultaneously
      </p>
    </div>
  );
}
