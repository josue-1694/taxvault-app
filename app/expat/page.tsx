"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { calculateTax, formatCurrency, TAX_CONSTANTS } from "@/lib/tax-engine";
import FeieTracker from "@/components/FeieTracker";
import BottomNav from "@/components/BottomNav";

const DR_CHECKLIST = [
  { label: "Foreign lease or property ownership proof", done: false },
  { label: "DR driver's license or national ID", done: false },
  { label: "Bank account in Dominican Republic", done: false },
  { label: "Phone contract in DR", done: false },
  { label: "Utility bills in DR name", done: false },
  { label: "Medical / gym membership in DR", done: false },
  { label: "Social activities log (calendar)", done: false },
  { label: "Travel log with passport stamps", done: false },
];

export default function ExpatPage() {
  const [daysAbroad, setDaysAbroad] = useState(280);
  const [grossRevenue, setGrossRevenue] = useState(200000);
  const [checklist, setChecklist] = useState(DR_CHECKLIST);

  const withFeie = calculateTax(grossRevenue, 0, 60000, true);
  const withoutFeie = calculateTax(grossRevenue, 0, 60000, false);
  const savingsFromFeie = withoutFeie.incomeTax - withFeie.incomeTax;

  function toggleCheck(i: number) {
    setChecklist(prev => prev.map((c, j) => j === i ? { ...c, done: !c.done } : c));
  }

  return (
    <div className="min-h-dvh page-content" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-3">
        <h1 className="text-xl font-bold mb-1">Expat Module</h1>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>FEIE + Dominican Republic</p>

        {/* Days input */}
        <div className="card mb-3">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Days Outside US in 2026</p>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={365} value={daysAbroad} onChange={e => setDaysAbroad(+e.target.value)}
              className="flex-1" style={{ accentColor: "var(--cyan)" }} />
            <span className="text-2xl font-bold num w-14 text-right" style={{ color: "var(--cyan)" }}>{daysAbroad}</span>
          </div>
        </div>

        <FeieTracker daysAbroad={daysAbroad} />

        {/* FEIE savings calculator */}
        <div className="card mt-3">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>FEIE Savings Calculator</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Gross Revenue:</span>
            <input type="number" value={grossRevenue} onChange={e => setGrossRevenue(+e.target.value)}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm num outline-none"
              style={{ background: "#1a1a24", border: "1px solid var(--border)", color: "var(--cyan)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,77,109,0.08)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Without FEIE</p>
              <p className="text-xl font-bold num" style={{ color: "var(--red)" }}>{formatCurrency(withoutFeie.totalTax)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(0,255,136,0.08)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>With FEIE</p>
              <p className="text-xl font-bold num" style={{ color: "var(--green)" }}>{formatCurrency(withFeie.totalTax)}</p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl text-center" style={{ background: "rgba(0,245,255,0.08)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Income Tax Savings</p>
            <p className="text-2xl font-bold num" style={{ color: "var(--cyan)" }}>{formatCurrency(savingsFromFeie)}</p>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--red)" }}>
            ⚠ SE tax of {formatCurrency(withFeie.seTax)} due regardless of FEIE — no exception
          </p>
        </div>

        {/* FEIE limit */}
        <div className="card mt-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">FEIE Exclusion 2026</p>
            <p className="text-base font-bold num" style={{ color: "var(--cyan)" }}>{formatCurrency(TAX_CONSTANTS.FEIE_LIMIT)}</p>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Income above this limit still taxable</p>
        </div>

        {/* No treaty warning */}
        <div className="card mt-3" style={{ background: "rgba(255,184,0,0.06)", borderColor: "rgba(255,184,0,0.3)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--amber)" }}>⚠ No US-DR Tax Treaty</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            The United States and Dominican Republic have no income tax treaty. You may owe taxes in both countries with limited offset. Consult your CPA.
          </p>
        </div>

        {/* DR Checklist */}
        <div className="card mt-4">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Physical Presence Evidence Checklist
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            {checklist.filter(c => c.done).length}/{checklist.length} items completed
          </p>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <motion.label
                key={i}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => toggleCheck(i)}
              >
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: item.done ? "var(--green)" : "rgba(255,255,255,0.06)", border: item.done ? "none" : "1px solid var(--border)" }}>
                  {item.done && <span className="text-xs text-black font-bold">✓</span>}
                </div>
                <p className="text-sm" style={{ color: item.done ? "var(--text)" : "var(--text-muted)", textDecoration: item.done ? "none" : "none" }}>
                  {item.label}
                </p>
              </motion.label>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
