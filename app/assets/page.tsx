"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatCurrency, TAX_CONSTANTS } from "@/lib/tax-engine";
import BottomNav from "@/components/BottomNav";
import toast from "react-hot-toast";

interface Asset {
  id?: string;
  name: string;
  cost: number;
  purchase_date: string;
  depreciation_method: string;
  business_use_pct: number;
  year_1_deduction: number;
  fiscal_year: number;
}

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Asset>({
    name: "", cost: 0, purchase_date: new Date().toISOString().slice(0, 10),
    depreciation_method: "Section 179", business_use_pct: 100, year_1_deduction: 0, fiscal_year: 2026,
  });

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await sb.from("assets").select("*").eq("user_id", user.id).eq("fiscal_year", 2026).order("created_at", { ascending: false });
    setAssets((data || []) as Asset[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function computeDeduction(cost: number, pct: number, method: string): number {
    const businessCost = cost * (pct / 100);
    if (method === "Section 179") return Math.min(businessCost, TAX_CONSTANTS.SECTION_179_MAX);
    if (method === "Bonus (100%)") return businessCost;
    return businessCost / 5; // Simple 5-yr MACRS Year 1
  }

  function updateForm(partial: Partial<Asset>) {
    const merged = { ...form, ...partial };
    merged.year_1_deduction = computeDeduction(merged.cost, merged.business_use_pct, merged.depreciation_method);
    setForm(merged);
  }

  async function addAsset(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { error } = await sb.from("assets").insert({ ...form, user_id: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Asset added");
    setShowForm(false);
    load();
  }

  const totalCost = assets.reduce((s, a) => s + Number(a.cost), 0);
  const totalDeduction = assets.reduce((s, a) => s + Number(a.year_1_deduction), 0);

  if (loading) return <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}><div className="pulse-glow text-2xl" style={{ color: "var(--cyan)" }}>⚡</div></div>;

  return (
    <div className="min-h-dvh page-content" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-3">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-xl font-bold">Assets</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="text-sm px-3 py-1.5 rounded-xl font-medium"
            style={{ background: "var(--cyan)", color: "#0A0A0F" }}>
            + Add
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Depreciation · Section 179 · 2026</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card card-glow-violet">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Asset Cost</p>
            <p className="text-xl font-bold num" style={{ color: "var(--violet)" }}>{formatCurrency(totalCost)}</p>
          </div>
          <div className="card card-glow-green">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Year 1 Deduction</p>
            <p className="text-xl font-bold num" style={{ color: "var(--green)" }}>{formatCurrency(totalDeduction)}</p>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card mb-4">
            <form onSubmit={addAsset} className="space-y-2">
              <input placeholder="Asset name" value={form.name} onChange={e => updateForm({ name: e.target.value })} required
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Cost (USD)" value={form.cost || ""}
                  onChange={e => updateForm({ cost: +e.target.value })}
                  className="rounded-xl px-3 py-2 text-sm num outline-none"
                  style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--cyan)" }} />
                <input type="number" placeholder="Business use %" value={form.business_use_pct || ""}
                  onChange={e => updateForm({ business_use_pct: +e.target.value })} min={1} max={100}
                  className="rounded-xl px-3 py-2 text-sm num outline-none"
                  style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <select value={form.depreciation_method} onChange={e => updateForm({ depreciation_method: e.target.value })}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }}>
                <option>Section 179</option>
                <option>Bonus (100%)</option>
                <option>MACRS 5-Year</option>
              </select>
              {form.year_1_deduction > 0 && (
                <div className="p-2 rounded-lg text-center" style={{ background: "rgba(0,255,136,0.08)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Year 1 Deduction</p>
                  <p className="text-lg font-bold num" style={{ color: "var(--green)" }}>{formatCurrency(form.year_1_deduction)}</p>
                </div>
              )}
              <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--cyan)", color: "#0A0A0F" }}>Add Asset</button>
            </form>
          </motion.div>
        )}

        {/* Asset list */}
        <div className="space-y-2">
          {assets.length === 0 && <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No assets. Tap + Add to register equipment.</p>}
          {assets.map((a, i) => (
            <motion.div key={a.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.depreciation_method} · {a.business_use_pct}% business</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.purchase_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cost</p>
                  <p className="text-base font-bold num" style={{ color: "var(--violet)" }}>{formatCurrency(a.cost)}</p>
                  <p className="text-xs" style={{ color: "var(--green)" }}>Yr1: {formatCurrency(a.year_1_deduction)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="card mt-4" style={{ background: "rgba(255,184,0,0.06)", borderColor: "rgba(255,184,0,0.2)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--amber)" }}>Section 179 Max 2026</p>
          <p className="text-lg font-bold num mt-0.5" style={{ color: "var(--amber)" }}>{formatCurrency(TAX_CONSTANTS.SECTION_179_MAX)}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Immediate expensing for eligible business property</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
