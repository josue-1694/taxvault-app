"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import toast from "react-hot-toast";

const INPUT = "w-full rounded-xl px-4 py-3 text-sm outline-none";
const INPUT_STYLE = { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const sb = createClient();
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created — signing you in…");
        const { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Auth error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--cyan)" }}>TaxVault</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Personal Tax Command Center</p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: mode === m ? "var(--cyan)" : "transparent",
                color: mode === m ? "#0A0A0F" : "var(--text-muted)",
              }}
            >
              {m === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={INPUT}
              style={INPUT_STYLE}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className={INPUT}
              style={INPUT_STYLE}
              placeholder="••••••••"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold mt-1"
            style={{ background: "var(--cyan)", color: "#0A0A0F", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "…" : mode === "signin" ? "Sign In →" : "Create Account →"}
          </motion.button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: "var(--text-muted)" }}>
          Private. Encrypted. Your data only.
        </p>
      </motion.div>
    </div>
  );
}
