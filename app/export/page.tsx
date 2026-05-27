"use client";
import { motion } from "framer-motion";
import ExportButton from "@/components/ExportButton";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";
import toast from "react-hot-toast";

const PACKS = [
  { label: "US Federal Pack",       emoji: "🇺🇸", color: "#00F5FF", pack: "us-federal"   },
  { label: "State Tax Pack",        emoji: "🗺️",  color: "#7C3AED", pack: "state"        },
  { label: "Dominican Republic",    emoji: "🌴",  color: "#00FF88", pack: "dr"           },
  { label: "Expat Evidence",        emoji: "✈️",  color: "#FFB800", pack: "expat"        },
  { label: "FBAR / FATCA",          emoji: "🏦",  color: "#FF4D6D", pack: "fbar"         },
  { label: "S-Corp Strategy",       emoji: "🏢",  color: "#6B7FFF", pack: "scorp"        },
  { label: "Decision Log",          emoji: "📓",  color: "#6B6B80", pack: "decisions"    },
];

export default function ExportPage() {
  const [downloadingAll, setDownloadingAll] = useState(false);

  async function downloadAll() {
    setDownloadingAll(true);
    try {
      for (const p of PACKS) {
        const res = await fetch(`/api/export/${p.pack}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `taxvault-${p.pack}-2026.txt`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 300));
      }
      toast.success("All 8 packs downloaded ✓");
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloadingAll(false);
    }
  }

  return (
    <div className="min-h-dvh page-content" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">Tax Season Ready</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            One-touch download · All packs · No steps
          </p>
        </motion.div>

        {/* Individual packs */}
        <div className="space-y-2.5 mb-4">
          {PACKS.map((p, i) => (
            <motion.div
              key={p.pack}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ExportButton {...p} />
            </motion.div>
          ))}
        </div>

        {/* COMPLETE ZIP — largest button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={downloadAll}
          disabled={downloadingAll}
          className="w-full flex items-center justify-between px-6 rounded-2xl font-bold"
          style={{
            height: 80,
            fontSize: 18,
            background: "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(124,58,237,0.2))",
            border: "1px solid rgba(0,245,255,0.4)",
            color: "var(--cyan)",
            opacity: downloadingAll ? 0.7 : 1,
          }}
        >
          <span className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            {downloadingAll ? "Generating all packs…" : "COMPLETE ZIP — All 8 Packs"}
          </span>
          <span className="text-2xl">{downloadingAll ? "⟳" : "↓"}</span>
        </motion.button>

        <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
          Generated from your live TaxVault data · 2026 · For CPA review
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
