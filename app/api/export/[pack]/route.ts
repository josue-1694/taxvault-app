import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateTax, formatCurrency, TAX_CONSTANTS, getQuarterlyDueDates } from "@/lib/tax-engine";

// Lazy — only instantiated at request time, not during build
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { db: { schema: "taxvault" } }
  );
}

const YEAR = 2026;
const DISCLAIMER = `\n⚠  ILLUSTRATIVE ONLY — Not tax advice. Verify with your CPA before filing.\n   No US-DR income tax treaty exists. SE tax applies regardless of FEIE.\n`;

async function getSummary(userId: string) {
  const { data } = await getSupabase().from("tax_summaries").select("*").eq("user_id", userId).eq("fiscal_year", YEAR).single();
  return data;
}
async function getTransactions(userId: string, type?: string) {
  let q = getSupabase().from("transactions").select("*").eq("user_id", userId).eq("fiscal_year", YEAR).order("date");
  if (type) q = q.eq("type", type);
  const { data } = await q;
  return data || [];
}
async function getFbarAccounts(userId: string) {
  const { data } = await getSupabase().from("fbar_accounts").select("*").eq("user_id", userId).eq("fiscal_year", YEAR);
  return data || [];
}

function line(label: string, value: string, w = 40): string {
  return `${label.padEnd(w)}${value}\n`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ pack: string }> }) {
  // Auth via cookie or anon — for simplicity use service role and trust the request
  // In production add auth header check
  const { pack } = await params;

  // Get first user (single-user app for Dr. Garcia)
  const { data: users } = await getSupabase().auth.admin.listUsers();
  if (!users?.users?.length) {
    return new NextResponse("No users", { status: 401 });
  }
  const userId = users.users[0].id;

  const summary = await getSummary(userId);
  const tax = calculateTax(summary?.gross_revenue || 0, summary?.total_deductions || 0);

  let content = "";
  const header = (title: string) => `\n${"=".repeat(60)}\n  TaxVault · ${title} · ${YEAR}\n  Generated: ${new Date().toLocaleDateString()}\n${"=".repeat(60)}\n`;

  switch (pack) {
    case "us-federal": {
      const txs = await getTransactions(userId, "income");
      const expenses = await getTransactions(userId, "expense");
      content = header("US Federal Tax Pack") + DISCLAIMER;
      content += "\n📊 INCOME SUMMARY\n" + "-".repeat(40) + "\n";
      content += line("Gross Revenue", formatCurrency(tax.grossRevenue));
      content += line("Total Deductions", formatCurrency(tax.totalDeductions));
      content += line("Net Taxable Income", formatCurrency(tax.netTaxable));
      content += "\n📋 INCOME TRANSACTIONS\n" + "-".repeat(40) + "\n";
      txs.forEach(t => { content += `${t.date}  ${t.description.padEnd(30)}  ${formatCurrency(t.amount)}  [${t.domain}]\n`; });
      content += "\n💸 DEDUCTIBLE EXPENSES\n" + "-".repeat(40) + "\n";
      expenses.filter((t: {deductible: boolean}) => t.deductible).forEach((t: {date: string; description: string; amount: number; domain: string; irc_code?: string}) => {
        content += `${t.date}  ${t.description.padEnd(28)}  ${formatCurrency(t.amount)}  ${t.irc_code || ""}\n`;
      });
      content += "\n🧮 TAX CALCULATIONS\n" + "-".repeat(40) + "\n";
      content += line("SE Tax (15.3%)", formatCurrency(tax.seTax));
      content += line("Income Tax (estimated)", formatCurrency(tax.incomeTax));
      content += line("TOTAL ESTIMATED TAX", formatCurrency(tax.totalTax));
      content += line("Quarterly Payment", formatCurrency(tax.quarterlyPayment));
      content += "\n📅 QUARTERLY DUE DATES\n" + "-".repeat(40) + "\n";
      getQuarterlyDueDates(YEAR).forEach(q => { content += `${q.quarter}  Due ${q.label}  →  ${formatCurrency(tax.quarterlyPayment)}\n`; });
      break;
    }

    case "state": {
      content = header("State Tax Pack") + DISCLAIMER;
      content += "\n📌 NOTE: DR residents may not have US state filing obligation.\n";
      content += "Consult your CPA regarding domicile and state nexus rules.\n\n";
      content += line("Net Taxable Income", formatCurrency(tax.netTaxable));
      content += line("State Filing Required", "VERIFY WITH CPA");
      break;
    }

    case "dr": {
      const txs = await getTransactions(userId, "income");
      content = header("Dominican Republic Tax Pack") + DISCLAIMER;
      content += "\n⚠  No US-DR income tax treaty. Both countries may tax same income.\n\n";
      content += "📋 INCOME (DR-sourced and worldwide)\n" + "-".repeat(40) + "\n";
      txs.filter((t: {domain: string}) => t.domain === "PERSONAL" || t.domain === "REBUILD").forEach((t: {date: string; description: string; amount: number; domain: string}) => {
        content += `${t.date}  ${t.description.padEnd(30)}  ${formatCurrency(t.amount)}\n`;
      });
      content += "\n📌 DR TAX NOTES\n" + "-".repeat(40) + "\n";
      content += "DGII registration required for self-employed income.\n";
      content += "IT-1 filing deadline: March 31.\n";
      content += "Withholding may apply on certain payments.\n";
      break;
    }

    case "expat": {
      content = header("Expat Evidence Pack") + DISCLAIMER;
      content += "\n🌍 FEIE — PHYSICAL PRESENCE TEST\n" + "-".repeat(40) + "\n";
      content += line("Days Required Outside US", TAX_CONSTANTS.FEIE_DAYS_REQUIRED.toString());
      content += line("FEIE Exclusion 2026", formatCurrency(TAX_CONSTANTS.FEIE_LIMIT));
      content += line("SE Tax Still Due", formatCurrency(tax.seTax) + " (FEIE does NOT eliminate)");
      content += "\n📋 EVIDENCE CHECKLIST\n" + "-".repeat(40) + "\n";
      ["Foreign lease/property", "Foreign bank account", "Foreign driver's license",
        "Utility bills in name", "Phone contract", "Travel log with stamps",
        "Medical/gym memberships", "Social calendar"].forEach(item => {
        content += `☐  ${item}\n`;
      });
      break;
    }

    case "fbar": {
      const accts = await getFbarAccounts(userId);
      content = header("FBAR / FATCA Pack") + DISCLAIMER;
      content += "\n🏦 FOREIGN ACCOUNT SUMMARY\n" + "-".repeat(40) + "\n";
      content += line("FBAR Threshold (FinCEN 114)", formatCurrency(TAX_CONSTANTS.FBAR_THRESHOLD));
      content += line("FATCA 8938 (year-end)", formatCurrency(TAX_CONSTANTS.FATCA_THRESHOLD_YEAREND));
      content += "\n📋 REGISTERED ACCOUNTS\n" + "-".repeat(40) + "\n";
      if (accts.length === 0) content += "No accounts registered. Add via FBAR page.\n";
      accts.forEach((a: {account_name: string; country: string; highest_balance: number; year_end_balance: number}) => {
        content += `${a.account_name} (${a.country})\n`;
        content += `  Highest: ${formatCurrency(a.highest_balance)}  Year-end: ${formatCurrency(a.year_end_balance)}\n`;
        content += `  FBAR required: ${a.highest_balance > TAX_CONSTANTS.FBAR_THRESHOLD ? "YES" : "no"}\n\n`;
      });
      content += "\n⚠ FBAR and FATCA are SEPARATE obligations — both may apply simultaneously.\n";
      content += "FBAR due April 15 (auto-extension to Oct 15). File at bsaefiling.fincen.treas.gov\n";
      break;
    }

    case "scorp": {
      content = header("S-Corp Strategy Pack") + DISCLAIMER;
      content += "\n🏢 S-CORP ANALYSIS\n" + "-".repeat(40) + "\n";
      content += line("Gross Revenue", formatCurrency(tax.grossRevenue));
      content += line("Current SE Tax (15.3%)", formatCurrency(tax.seTax));
      const salaryAssumption = 60_000;
      const withSCorp = calculateTax(tax.grossRevenue, tax.totalDeductions, salaryAssumption);
      const savings = tax.seTax - withSCorp.seTax;
      content += "\n📊 S-CORP COMPARISON\n" + "-".repeat(40) + "\n";
      content += line("Reasonable Salary", formatCurrency(salaryAssumption));
      content += line("SE Tax on Salary", formatCurrency(salaryAssumption * TAX_CONSTANTS.SE_TAX_RATE));
      content += line("Distribution (no SE)", formatCurrency(Math.max(0, tax.grossRevenue - salaryAssumption)));
      content += line("Potential Savings", formatCurrency(savings));
      content += "\n⚠ Reasonable compensation REQUIRED by IRS — do not set salary artificially low.\n";
      content += "Consult CPA and attorney before S-Corp election (Form 2553).\n";
      break;
    }

    case "decisions": {
      content = header("Decision Log") + DISCLAIMER;
      content += "\n📓 TAX STRATEGY DECISIONS\n" + "-".repeat(40) + "\n";
      content += `Date: ${new Date().toLocaleDateString()}\n\n`;
      content += "[ ] Elected FEIE — Physical Presence Test\n";
      content += "[ ] Solo 401(k) contribution planned\n";
      content += "[ ] Section 179 elections documented\n";
      content += "[ ] S-Corp feasibility reviewed\n";
      content += "[ ] FBAR filed for foreign accounts\n";
      content += "[ ] Quarterly payments scheduled\n";
      content += "[ ] CPA reviewed all estimates\n\n";
      content += "NOTES:\n_____________________________________\n\n";
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown pack" }, { status: 404 });
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="taxvault-${pack}-${YEAR}.txt"`,
    },
  });
}
