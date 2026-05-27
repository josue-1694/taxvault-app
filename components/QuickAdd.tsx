"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import toast from "react-hot-toast";

const CATEGORIES = ["Revenue", "Software", "Hardware", "Travel", "Marketing", "Meals", "Professional", "Other"];
const DOMAINS = ["UDAS", "LAUW", "REBUILD", "PERSONAL"];

export default function QuickAdd({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
    type: "income",
    category: "Revenue",
    domain: "PERSONAL",
    deductible: true,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    setLoading(true);
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { toast.error("Not logged in"); return; }

      const { error } = await sb.from("transactions").insert({
        user_id: user.id,
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category,
        domain: form.domain,
        deductible: form.deductible,
        source: "manual",
        fiscal_year: new Date(form.date).getFullYear(),
      });
      if (error) throw error;

      // Trigger recalculation
      await fetch("/api/tax-calculate", { method: "POST" });

      toast.success("Transaction added ✓");
      setOpen(false);
      setForm({ ...form, description: "", amount: "" });
      onAdded?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-light shadow-lg"
        style={{ background: "var(--cyan)", color: "#0A0A0F" }}
      >
        +
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-2xl p-6 pb-8"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold">Quick Add</h2>
                <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)" }} className="text-xl">×</button>
              </div>
              <form onSubmit={submit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="col-span-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }} />
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="col-span-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="asset">Asset</option>
                  </select>
                </div>
                <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input type="number" placeholder="Amount (USD)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm num outline-none"
                  style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--cyan)" }} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}
                    className="rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--text)" }}>
                    {DOMAINS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  <input type="checkbox" checked={form.deductible} onChange={e => setForm({ ...form, deductible: e.target.checked })}
                    className="accent-cyan-400" />
                  Deductible expense
                </label>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold mt-1"
                  style={{ background: "var(--cyan)", color: "#0A0A0F", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Saving…" : "Add Transaction"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
