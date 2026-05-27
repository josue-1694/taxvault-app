"use client";
import { motion } from "framer-motion";
import { TAX_CONSTANTS } from "@/lib/tax-engine";

interface Props { daysAbroad: number; }

export default function FeieTracker({ daysAbroad }: Props) {
  const required = TAX_CONSTANTS.FEIE_DAYS_REQUIRED;
  const pct = Math.min(100, (daysAbroad / required) * 100);
  const remaining = Math.max(0, required - daysAbroad);
  const qualified = daysAbroad >= required;

  return (
    <div className="card mt-3">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          FEIE — Physical Presence
        </p>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: qualified ? "rgba(0,255,136,0.15)" : "rgba(255,184,0,0.15)", color: qualified ? "var(--green)" : "var(--amber)" }}>
          {qualified ? "✓ Qualified" : `${remaining} days left`}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl font-bold num" style={{ color: qualified ? "var(--green)" : "var(--amber)" }}>
          {daysAbroad}
        </span>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>/ {required} days</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: qualified ? "var(--green)" : "var(--amber)" }}
        />
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        ⚠ FEIE removes income tax only — SE tax still applies
      </p>
    </div>
  );
}
