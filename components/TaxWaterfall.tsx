"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/tax-engine";

interface Props {
  grossRevenue: number;
  totalDeductions: number;
  seTax: number;
  incomeTax: number;
}

export default function TaxWaterfall({ grossRevenue, totalDeductions, seTax, incomeTax }: Props) {
  const net = Math.max(0, grossRevenue - totalDeductions);
  const data = [
    { label: "Gross", value: grossRevenue, fill: "#00F5FF" },
    { label: "Deductions", value: totalDeductions, fill: "#00FF88" },
    { label: "Net", value: net, fill: "#7C3AED" },
    { label: "SE Tax", value: seTax, fill: "#FFB800" },
    { label: "Income Tax", value: incomeTax, fill: "#FF4D6D" },
    { label: "Keep", value: Math.max(0, net - seTax - incomeTax), fill: "#00FF88" },
  ];

  return (
    <div className="card mt-4">
      <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
        Tax Waterfall 2026
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: "#6B6B80", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#F0F0F5", fontSize: 12 }}
            formatter={(v) => [formatCurrency(Number(v ?? 0)), ""]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
