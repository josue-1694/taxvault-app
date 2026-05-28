import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel cron: runs at 09:00 UTC on 1st of every month (see vercel.json)
// Protected by CRON_SECRET header

const HETZNER_COSTS = [
  { description: "Hetzner Core Node — UDAS share",    amount: 122, domain: "UDAS"    },
  { description: "Hetzner Core Node — LAUW share",    amount: 122, domain: "LAUW"    },
  { description: "Hetzner Core Node — REBUILD share", amount: 121, domain: "REBUILD" },
];

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "taxvault" } }
  );

  // Get owner
  const { data: users } = await sb.auth.admin.listUsers({ perPage: 1 });
  const userId = users?.users?.[0]?.id;
  if (!userId) return NextResponse.json({ error: "No owner" }, { status: 500 });

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const year = now.getFullYear();

  // Check if already inserted this month (idempotency)
  const monthStart = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: existing } = await sb
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "cron_monthly")
    .gte("date", monthStart)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ skipped: "already inserted this month" });
  }

  const rows = HETZNER_COSTS.map((c) => ({
    user_id: userId,
    date,
    fiscal_year: year,
    description: c.description,
    amount: c.amount,
    type: "expense",
    category: "Hosting",
    domain: c.domain,
    deductible: true,
    irc_code: "IRC §162",
    source: "cron_monthly",
  }));

  const { error } = await sb.from("transactions").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalculate tax summary
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tax-calculate`, { method: "POST" });

  return NextResponse.json({ inserted: rows.length, date, costs: HETZNER_COSTS });
}
