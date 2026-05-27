"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatCurrency, TAX_CONSTANTS } from "@/lib/tax-engine";
import FbarAlert from "@/components/FbarAlert";
import BottomNav from "@/components/BottomNav";
import toast from "react-hot-toast";

interface FbarAccount {
  id?: string;
  account_name: string;
  country: string;
  highest_balance: number;
  year_end_balance: number;
  fiscal_year: number;
}

export default function FbarPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<FbarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FbarAccount>({
    account_name: "", country: "Dominican Republic", highest_balance: 0, year_end_balance: 0, fiscal_year: 2026,
  });

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await sb.from("fbar_accounts").select("*").eq("user_id", user.id).eq("fiscal_year", 2026);
    setAccounts((data || []) as FbarAccount[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { error } = await sb.from("fbar_accounts").insert({ ...form, user_id: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Account added");
    setForm({ account_name: "", country: "Dominican Republic", highest_balance: 0, year_end_balance: 0, fiscal_year: 2026 });
    load();
  }

  const totalHighest = accounts.reduce((s, a) => s + Number(a.highest_balance), 0);
  const totalYearEnd = accounts.reduce((s, a) => s + Number(a.year_end_balance), 0);

  if (loading) return <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}><div className="pulse-glow text-2xl" style={{ color: "var(--cyan)" }}>⚡</div></div>;

  return (
    <div className="min-h-dvh page-content" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold mb-1">FBAR / FATCA</h1>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Foreign Account Compliance · 2026</p>

        <FbarAlert highestBalance={totalHighest} yearEndBalance={totalYearEnd} />

        {/* Thresholds reference */}
        <div className="card mt-3">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>2026 Thresholds</p>
          <div className="space-y-2">
            {[
              { label: "FBAR — FinCEN 114 (highest balance)", threshold: TAX_CONSTANTS.FBAR_THRESHOLD, current: totalHighest, color: "var(--red)" },
              { label: "FATCA 8938 — Year-end balance", threshold: TAX_CONSTANTS.FATCA_THRESHOLD_YEAREND, current: totalYearEnd, color: "var(--amber)" },
              { label: "FATCA 8938 — Anytime during year", threshold: TAX_CONSTANTS.FATCA_THRESHOLD_ANYTIME, current: totalHighest, color: "var(--amber)" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p className="text-xs font-medium">{row.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Threshold: {formatCurrency(row.threshold)}</p>
                </div>
                <p className="text-sm font-bold num"
                  style={{ color: row.current > row.threshold ? row.color : "var(--green)" }}>
                  {formatCurrency(row.current)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Accounts list */}
        {accounts.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Foreign Accounts</p>
            <div className="space-y-2">
              {accounts.map((acct, i) => (
                <motion.div key={acct.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{acct.account_name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{acct.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Highest</p>
                      <p className="text-sm font-bold num" style={{ color: "var(--amber)" }}>{formatCurrency(acct.highest_balance)}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Year-end: {formatCurrency(acct.year_end_balance)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Add account form */}
        <div className="card mt-4">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Add Foreign Account</p>
          <form onSubmit={addAccount} className="space-y-2">
            <input placeholder="Account name (e.g. BanReservas checking)" value={form.account_name}
              onChange={e => setForm({ ...form, account_name: e.target.value })} required
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }} />
            <input placeholder="Country" value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Highest balance" value={form.highest_balance || ""}
                onChange={e => setForm({ ...form, highest_balance: +e.target.value })}
                className="rounded-xl px-3 py-2 text-sm num outline-none"
                style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--amber)" }} />
              <input type="number" placeholder="Year-end balance" value={form.year_end_balance || ""}
                onChange={e => setForm({ ...form, year_end_balance: +e.target.value })}
                className="rounded-xl px-3 py-2 text-sm num outline-none"
                style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--cyan)" }} />
            </div>
            <button type="submit"
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "var(--cyan)", color: "#0A0A0F" }}>
              Add Account
            </button>
          </form>
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
          FBAR due April 15 · Auto-extension to Oct 15 · No treaty offsets
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
