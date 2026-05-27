"use client";
import { motion } from "framer-motion";
import { useState } from "react";

interface Props {
  label: string;
  emoji: string;
  color: string;
  pack: string;
  size?: "normal" | "large";
}

export default function ExportButton({ label, emoji, color, pack, size = "normal" }: Props) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export/${pack}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taxvault-${pack}-2026.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={download}
      disabled={loading}
      className="w-full flex items-center justify-between px-5 rounded-2xl font-semibold"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
        height: size === "large" ? 72 : 56,
        fontSize: size === "large" ? 16 : 14,
        opacity: loading ? 0.7 : 1,
      }}
    >
      <span className="flex items-center gap-3">
        <span className="text-xl">{emoji}</span>
        {label}
      </span>
      <span className="text-lg">{loading ? "⟳" : "↓"}</span>
    </motion.button>
  );
}
