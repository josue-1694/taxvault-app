import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateTax } from "@/lib/tax-engine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Accept optional { user_id, fiscal_year } body; falls back to all users for year
  let userId: string | undefined;
  let year = new Date().getFullYear();
  try {
    const body = await req.json().catch(() => ({}));
    userId = body.user_id;
    if (body.year) year = body.year;
  } catch { /* no body */ }

  // Fetch all income for the year
  let incomeQ = supabase.from("transactions").select("user_id, amount").eq("type", "income").eq("fiscal_year", year);
  let deductQ = supabase.from("transactions").select("user_id, amount").eq("type", "expense").eq("deductible", true).eq("fiscal_year", year);
  if (userId) { incomeQ = incomeQ.eq("user_id", userId); deductQ = deductQ.eq("user_id", userId); }

  const [{ data: incTxs }, { data: dedTxs }] = await Promise.all([incomeQ, deductQ]);

  // Group by user
  const incByUser: Record<string, number> = {};
  const dedByUser: Record<string, number> = {};
  for (const tx of incTxs || []) incByUser[tx.user_id] = (incByUser[tx.user_id] || 0) + Number(tx.amount);
  for (const tx of dedTxs || []) dedByUser[tx.user_id] = (dedByUser[tx.user_id] || 0) + Number(tx.amount);

  const users = [...new Set([...Object.keys(incByUser), ...Object.keys(dedByUser)])];
  for (const uid of users) {
    const gross = incByUser[uid] || 0;
    const deductions = dedByUser[uid] || 0;
    const tax = calculateTax(gross, deductions);
    await supabase.from("tax_summaries").upsert({
      user_id: uid,
      fiscal_year: year,
      gross_revenue: gross,
      total_deductions: deductions,
      net_taxable: tax.netTaxable,
      se_tax_estimate: tax.seTax,
      income_tax_estimate: tax.incomeTax,
      total_estimate: tax.totalTax,
      quarterly_payment: tax.quarterlyPayment,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,fiscal_year" });
  }

  return NextResponse.json({ ok: true, updated: users.length, year });
}
