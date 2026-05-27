"use client";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/tax-engine";

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

const DOMAIN_COLORS: Record<string, string> = {
  UDAS: "#00F5FF", LAUW: "#7C3AED", REBUILD: "#00FF88", PERSONAL: "#6B6B80",
};

export default function TransactionItem({ tx, onDelete }: { tx: Transaction; onDelete: (id: string) => void }) {
  const isIncome = tx.type === "income";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="card flex items-center gap-3 mb-2"
      style={{ padding: "12px 14px" }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: `${DOMAIN_COLORS[tx.domain] || "#6B6B80"}22`, color: DOMAIN_COLORS[tx.domain] || "#6B6B80" }}>
            {tx.domain}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{tx.category}</span>
        </div>
        <p className="text-sm font-medium truncate">{tx.description}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{tx.date}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-base font-bold num" style={{ color: isIncome ? "var(--green)" : "var(--red)" }}>
          {isIncome ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
        </p>
        {tx.deductible && !isIncome && (
          <span className="text-xs" style={{ color: "var(--green)" }}>deductible</span>
        )}
      </div>
      <button onClick={() => onDelete(tx.id)} className="ml-1 text-lg opacity-40 hover:opacity-100"
        style={{ color: "var(--red)" }}>×</button>
    </motion.div>
  );
}
