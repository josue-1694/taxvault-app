import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "taxvault" } }
  );
}

/** Single-user app — get owner user_id once per request */
async function getOwnerId(): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb.auth.admin.listUsers({ perPage: 1 });
  return data?.users?.[0]?.id ?? null;
}

function detectDomain(raw?: string): string {
  if (!raw) return "REBUILD";
  const d = raw.toUpperCase();
  if (d.includes("UDAS")) return "UDAS";
  if (d.includes("LAUW")) return "LAUW";
  return "REBUILD";
}

async function recalc(userId: string) {
  const sb = getSupabase();
  const year = new Date().getFullYear();

  const [{ data: inc }, { data: ded }] = await Promise.all([
    sb.from("transactions").select("amount").eq("user_id", userId).eq("type", "income").eq("fiscal_year", year),
    sb.from("transactions").select("amount").eq("user_id", userId).eq("type", "expense").eq("deductible", true).eq("fiscal_year", year),
  ]);

  const gross = (inc ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
  const deductions = (ded ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
  const net = Math.max(0, gross - deductions);
  const seTax = net * 0.153;
  const incomeTax = net * 0.12;
  const total = seTax + incomeTax;

  await sb.from("tax_summaries").upsert({
    user_id: userId, fiscal_year: year,
    gross_revenue: gross, total_deductions: deductions, net_taxable: net,
    se_tax_estimate: seTax, income_tax_estimate: incomeTax,
    total_estimate: total, quarterly_payment: total / 4,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,fiscal_year" });
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const HANDLED = [
    "payment_intent.succeeded",
    "invoice.paid",
    "charge.refunded",
    "customer.subscription.created",
    "customer.subscription.deleted",
  ];
  if (!HANDLED.includes(event.type)) {
    return NextResponse.json({ received: true });
  }

  const userId = await getOwnerId();
  if (!userId) {
    console.error("TaxVault: no owner user found");
    return NextResponse.json({ received: true });
  }

  const sb = getSupabase();
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const year = now.getFullYear();

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    await sb.from("transactions").insert({
      user_id: userId, date, fiscal_year: year,
      description: pi.description || `Payment ${pi.id.slice(0, 8)}`,
      amount: pi.amount_received / 100,
      type: "income", category: "Revenue",
      domain: detectDomain(pi.metadata?.domain),
      deductible: false, source: "stripe_auto",
    });
  }

  if (event.type === "invoice.paid") {
    const inv = event.data.object as Stripe.Invoice;
    await sb.from("transactions").insert({
      user_id: userId, date, fiscal_year: year,
      description: inv.description || `Invoice ${inv.id.slice(0, 8)}`,
      amount: (inv.amount_paid ?? 0) / 100,
      type: "income", category: "Revenue",
      domain: detectDomain(inv.metadata?.domain),
      deductible: false, source: "stripe_auto",
    });
  }

  if (event.type === "charge.refunded") {
    const ch = event.data.object as Stripe.Charge;
    await sb.from("transactions").insert({
      user_id: userId, date, fiscal_year: year,
      description: `Refund ${ch.id.slice(0, 8)}`,
      amount: -(ch.amount_refunded / 100),
      type: "expense", category: "Refunds",
      domain: detectDomain(ch.metadata?.domain),
      deductible: false, source: "stripe_auto",
    });
  }

  if (event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    await sb.from("transactions").insert({
      user_id: userId, date, fiscal_year: year,
      description: `New subscription ${sub.id.slice(0, 8)}`,
      amount: 0,
      type: "income", category: "Revenue",
      domain: detectDomain(sub.metadata?.domain),
      deductible: false, source: "stripe_auto",
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    console.info(`TaxVault: subscription cancelled ${sub.id}`);
  }

  await recalc(userId);
  return NextResponse.json({ received: true });
}
