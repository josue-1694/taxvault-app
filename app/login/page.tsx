"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("josue-1694@hotmail.com");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const sb = createClient();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error sending link");
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

        {!sent ? (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
                placeholder="you@example.com"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold"
              style={{ background: "var(--cyan)", color: "#0A0A0F", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Sending…" : "Send Magic Link →"}
            </motion.button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card text-center py-8"
          >
            <p className="text-4xl mb-3">📬</p>
            <p className="font-semibold mb-1">Check your email</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Magic link sent to <span style={{ color: "var(--cyan)" }}>{email}</span>
            </p>
          </motion.div>
        )}

        <p className="text-xs text-center mt-6" style={{ color: "var(--text-muted)" }}>
          Private. Encrypted. Your data only.
        </p>
      </motion.div>
    </div>
  );
}
