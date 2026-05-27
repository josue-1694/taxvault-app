"use client";
import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatCurrency } from "@/lib/tax-engine";
import TransactionItem from "@/components/TransactionItem";
import QuickAdd from "@/components/QuickAdd";
import BottomNav from "@/components/BottomNav";
import toast from "react-hot-toast";

type FilterType = "all" | "income" | "expense";
type FilterDomain = "ALL" | "UDAS" | "LAUW" | "REBUILD" | "PERSONAL";

export default function TransactionsPage() {
  const router = useRouter();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<FilterType>("all");
  const [domain, setDomain] = useState<FilterDomain>("ALL");
  const [loading, setLoading] = useState(true);

  interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: string;
    category: string;
    domain: string;
    deductible: boolean;
  }

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push("/login"); return; }
    let q = sb.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false });
    if (type !== "all") q = q.eq("type", type);
    if (domain !== "ALL") q = q.eq("domain", domain);
    const { data } = await q;
    setTxs((data || []) as Transaction[]);
    setLoading(false);
  }, [router, type, domain]);

  useEffect(() => { load(); }, [load]);

  async function deleteTx(id: string) {
    const sb = createClient();
    const { error } = await sb.from("transactions").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    setTxs(prev => prev.filter(t => t.id !== id));
    await fetch("/api/tax-calculate", { method: "POST" });
    toast.success("Deleted");
  }

  const filtered = txs.filter(t =>
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-dvh page-content" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold mb-1">Transactions</h1>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="card" style={{ padding: "10px 12px" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Income</p>
            <p className="text-base font-bold num" style={{ color: "var(--green)" }}>+{formatCurrency(totalIncome)}</p>
          </div>
          <div className="card" style={{ padding: "10px 12px" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Expenses</p>
            <p className="text-base font-bold num" style={{ color: "var(--red)" }}>-{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        {/* Search */}
        <input
          placeholder="🔍 Search transactions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none mb-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
        />

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(["all", "income", "expense"] as FilterType[]).map(f => (
            <button key={f} onClick={() => setType(f)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: type === f ? "var(--cyan)" : "var(--bg-card)",
                color: type === f ? "#0A0A0F" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <div className="w-px h-5 self-center" style={{ background: "var(--border)" }} />
          {(["ALL", "UDAS", "LAUW", "REBUILD", "PERSONAL"] as FilterDomain[]).map(d => (
            <button key={d} onClick={() => setDomain(d)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: domain === d ? "var(--violet)" : "var(--bg-card)",
                color: domain === d ? "#fff" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4">
        {loading ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No transactions yet. Tap + to add one.</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map(tx => (
              <TransactionItem key={tx.id} tx={tx} onDelete={deleteTx} />
            ))}
          </AnimatePresence>
        )}
      </div>

      <QuickAdd onAdded={load} />
      <BottomNav />
    </div>
  );
}
