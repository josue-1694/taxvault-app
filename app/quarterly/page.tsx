"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { calculateTax, formatCurrency, getQuarterlyDueDates, daysUntil } from "@/lib/tax-engine";
import BottomNav from "@/components/BottomNav";

export default function QuarterlyPage() {
  const router = useRouter();
  const [tax, setTax] = useState({ quarterlyPayment: 0, seTax: 0, incomeTax: 0, totalTax: 0 });
  const quarters = getQuarterlyDueDates(2026);

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await sb.from("tax_summaries").select("*").eq("user_id", user.id).eq("fiscal_year", 2026).single();
    if (data) {
      setTax(calculateTax(data.gross_revenue || 0, data.total_deductions || 0));
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-dvh page-content" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold mb-1">Quarterly Payments</h1>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>2026 Estimated Tax Schedule</p>

        {/* Total card */}
        <div className="card card-glow-amber mb-4">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Annual Estimated Tax</p>
          <p className="text-3xl font-bold num" style={{ color: "var(--amber)" }}>{formatCurrency(tax.totalTax)}</p>
          <div className="flex gap-4 mt-2">
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>SE Tax (15.3%)</p>
              <p className="text-base font-semibold num" style={{ color: "var(--red)" }}>{formatCurrency(tax.seTax)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Income Tax</p>
              <p className="text-base font-semibold num" style={{ color: "var(--amber)" }}>{formatCurrency(tax.incomeTax)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Per Quarter</p>
              <p className="text-base font-semibold num" style={{ color: "var(--cyan)" }}>{formatCurrency(tax.quarterlyPayment)}</p>
            </div>
          </div>
        </div>

        {/* Quarter cards */}
        <div className="space-y-3">
          {quarters.map((q, i) => {
            const days = daysUntil(q.due);
            const past = days <= 0;
            const urgent = days > 0 && days < 30;
            return (
              <motion.div
                key={q.quarter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="card"
                style={{ borderColor: urgent ? "rgba(255,77,109,0.4)" : past ? "rgba(255,255,255,0.04)" : "var(--border)" }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold" style={{ color: urgent ? "var(--red)" : past ? "var(--text-muted)" : "var(--cyan)" }}>
                        {q.quarter}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: past ? "rgba(255,255,255,0.06)" : urgent ? "rgba(255,77,109,0.15)" : "rgba(0,245,255,0.1)", color: past ? "var(--text-muted)" : urgent ? "var(--red)" : "var(--cyan)" }}>
                        {past ? "Paid" : urgent ? `${days}d left` : `In ${days}d`}
                      </span>
                    </div>
                    <p className="text-lg font-bold num">{formatCurrency(tax.quarterlyPayment)}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Due {q.label}</p>
                  </div>
                  <span className="text-2xl">{past ? "✅" : urgent ? "⚠️" : "📅"}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="card mt-4" style={{ background: "rgba(255,77,109,0.06)", borderColor: "rgba(255,77,109,0.2)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--red)" }}>📌 Payment Rules</p>
          <ul className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
            <li>• Pay via IRS Direct Pay (irs.gov/payments)</li>
            <li>• FEIE does NOT eliminate SE tax — budget for 15.3% always</li>
            <li>• Underpayment penalty if less than 90% paid by year-end</li>
          </ul>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
