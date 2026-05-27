"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatCurrency, TAX_CONSTANTS } from "@/lib/tax-engine";
import BottomNav from "@/components/BottomNav";

const DEDUCTION_LAYERS = [
  { id: "business", label: "Business Expenses", emoji: "💼", irc: "IRC §162", color: "var(--cyan)" },
  { id: "home_office", label: "Home Office", emoji: "🏠", irc: "IRC §280A", color: "var(--violet)" },
  { id: "vehicle", label: "Vehicle / Travel", emoji: "🚗", irc: "IRC §179", color: "var(--green)" },
  { id: "section_179", label: "Section 179 Assets", emoji: "⚙", irc: "IRC §179", color: "var(--amber)" },
  { id: "retirement", label: "Retirement (Solo 401k)", emoji: "🏦", irc: "IRC §401", color: "var(--cyan)" },
  { id: "health", label: "Health Insurance SE", emoji: "🏥", irc: "IRC §162(l)", color: "var(--green)" },
  { id: "qbi", label: "QBI 20% Deduction", emoji: "📉", irc: "IRC §199A", color: "var(--violet)" },
  { id: "other", label: "Other Deductions", emoji: "📋", irc: "Misc", color: "var(--text-muted)" },
];

export default function DeductionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [grossRevenue, setGrossRevenue] = useState(0);

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const year = new Date().getFullYear();

    const { data: txs } = await sb.from("transactions").select("*")
      .eq("user_id", user.id).eq("deductible", true).eq("type", "expense").eq("fiscal_year", year);

    const { data: summary } = await sb.from("tax_summaries").select("gross_revenue")
      .eq("user_id", user.id).eq("fiscal_year", year).single();

    const grouped: Record<string, number> = {};
    let tot = 0;
    for (const tx of txs || []) {
      const cat = tx.category?.toLowerCase().replace(/\s+/g, "_") || "other";
      grouped[cat] = (grouped[cat] || 0) + Number(tx.amount);
      tot += Number(tx.amount);
    }
    setByCategory(grouped);
    setTotal(tot);
    setGrossRevenue(summary?.gross_revenue || 0);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const qbi = Math.max(0, (grossRevenue - total) * TAX_CONSTANTS.QBI_RATE);
  const retirementMax = TAX_CONSTANTS.RETIREMENT_MAX_2026;

  if (loading) return <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}><div className="pulse-glow text-2xl" style={{ color: "var(--cyan)" }}>⚡</div></div>;

  return (
    <div className="min-h-dvh page-content" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold mb-1">Deductions</h1>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>8-Layer Tracker · 2026</p>

        {/* Total banner */}
        <div className="card card-glow-green mb-4">
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Deductions</p>
          <p className="text-3xl font-bold num mt-1" style={{ color: "var(--green)" }}>{formatCurrency(total)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {grossRevenue > 0 ? ((total / grossRevenue) * 100).toFixed(1) : 0}% of gross revenue
          </p>
        </div>

        {/* Layers */}
        <div className="space-y-2">
          {DEDUCTION_LAYERS.map((layer, i) => {
            const key = layer.id;
            let amount = byCategory[key] || 0;
            // Special computed layers
            if (layer.id === "qbi") amount = qbi;
            const pct = total > 0 ? (amount / total) * 100 : 0;

            return (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{layer.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{layer.label}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{layer.irc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold num" style={{ color: layer.color }}>{formatCurrency(amount)}</p>
                    {layer.id === "retirement" && amount < retirementMax && (
                      <p className="text-xs" style={{ color: "var(--amber)" }}>
                        {formatCurrency(retirementMax - amount)} room left
                      </p>
                    )}
                    {layer.id === "qbi" && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>income tax only</p>
                    )}
                  </div>
                </div>
                {amount > 0 && (
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, pct)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                      className="h-full rounded-full"
                      style={{ background: layer.color }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* QBI guardrail */}
        <div className="card mt-4" style={{ background: "rgba(124,58,237,0.06)", borderColor: "rgba(124,58,237,0.2)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--violet)" }}>📌 QBI Guardrail</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            QBI 20% deduction reduces income tax only — SE tax of 15.3% still applies in full.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
