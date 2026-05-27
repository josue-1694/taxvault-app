"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { calculateTax, formatCurrency, getQuarterlyDueDates, daysUntil, TAX_CONSTANTS } from "@/lib/tax-engine";
import MetricCard from "@/components/MetricCard";
import TaxWaterfall from "@/components/TaxWaterfall";
import QuickAdd from "@/components/QuickAdd";
import BottomNav from "@/components/BottomNav";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(true);
  const [summary, setSummary] = useState({ grossRevenue: 0, totalDeductions: 0 });

  const loadData = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const year = new Date().getFullYear();
    const { data } = await sb.from("tax_summaries").select("*").eq("user_id", user.id).eq("fiscal_year", year).single();
    if (data) {
      setSummary({ grossRevenue: data.gross_revenue || 0, totalDeductions: data.total_deductions || 0 });
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const tax = calculateTax(summary.grossRevenue, summary.totalDeductions);
  const quarters = getQuarterlyDueDates(2026);
  const nextQ = quarters.find(q => daysUntil(q.due) > 0) || quarters[3];
  const daysLeft = daysUntil(nextQ.due);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="pulse-glow text-2xl" style={{ color: "var(--cyan)" }}>⚡</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh page-content" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-2 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cyan)" }}>TaxVault 2026</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Dr. Frank García</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full pulse-glow" style={{ background: "var(--green)" }} />
          <button onClick={() => setLocked(!locked)} className="text-xl">
            {locked ? "🔒" : "🔓"}
          </button>
        </div>
      </div>

      {/* 2×2 Metric Grid */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Gross Revenue" value={summary.grossRevenue} glow="cyan"
            sub={`${new Date().getFullYear()} YTD`} />
          <MetricCard label="Deductions" value={summary.totalDeductions} glow="green"
            sub="All categories" />
          <MetricCard label="Net Taxable" value={tax.netTaxable} glow="violet"
            sub="After deductions" />
          <MetricCard label="Est. Tax" value={tax.totalTax} glow="amber"
            private locked={locked} sub={`${(tax.effectiveRate * 100).toFixed(1)}% eff. rate`} />
        </div>

        {/* Private Reserve Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card card-glow-red mt-3 relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span>🔒</span>
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Private Reserve
                </span>
              </div>
              <p className="text-3xl font-bold num" style={{ color: "var(--red)" }}>
                {locked ? "••••••" : formatCurrency(tax.totalTax)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Reserve{" "}
                <span style={{ color: "var(--amber)" }}>
                  {locked ? "••••" : formatCurrency(tax.quarterlyPayment / 3)}/mo
                </span>{" "}
                from DR accounts
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Quarterly</p>
              <p className="text-xl font-bold num" style={{ color: "var(--amber)" }}>
                {locked ? "••••" : formatCurrency(tax.quarterlyPayment)}
              </p>
            </div>
          </div>
          <p className="text-xs mt-2 pt-2" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
            ⚠ Illustrative until CPA-verified · No US-DR tax treaty
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Next Q Payment", value: locked ? "••••" : formatCurrency(tax.quarterlyPayment), color: "var(--amber)" },
            { label: "Days to " + nextQ.label, value: daysLeft > 0 ? daysLeft + "d" : "Past", color: daysLeft < 30 ? "var(--red)" : "var(--green)" },
            { label: "SE Tax Rate", value: "15.3%", color: "var(--cyan)" },
          ].map(s => (
            <div key={s.label} className="card text-center" style={{ padding: "10px 8px" }}>
              <p className="text-base font-bold num" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Waterfall Chart */}
        <TaxWaterfall
          grossRevenue={summary.grossRevenue}
          totalDeductions={summary.totalDeductions}
          seTax={tax.seTax}
          incomeTax={tax.incomeTax}
        />

        {/* SE Tax Guardrail Banner */}
        <div className="card mt-3" style={{ background: "rgba(255,77,109,0.06)", borderColor: "rgba(255,77,109,0.2)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--red)" }}>📌 Key Guardrails</p>
          <ul className="text-xs mt-1.5 space-y-0.5" style={{ color: "var(--text-muted)" }}>
            <li>• FEIE removes income tax only — SE tax {formatCurrency(tax.seTax)} still due</li>
            <li>• QBI 20% deduction reduces income tax only</li>
            <li>• S-Corp requires reasonable compensation</li>
          </ul>
        </div>
      </div>

      <QuickAdd onAdded={loadData} />
      <BottomNav />
    </div>
  );
}
