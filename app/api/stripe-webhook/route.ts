import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Only handle payment events
  if (!["payment_intent.succeeded", "invoice.paid"].includes(event.type)) {
    return NextResponse.json({ received: true });
  }

  const obj = event.data.object as Stripe.PaymentIntent | Stripe.Invoice;
  const amount = ("amount_received" in obj ? obj.amount_received : obj.amount_paid) / 100;
  const description = ("description" in obj && obj.description) ? obj.description : "Stripe payment";
  const metadata = obj.metadata || {};
  const domain = (metadata.domain as string) || "PERSONAL";
  const userId = metadata.user_id as string;
  const now = new Date();

  if (!userId) {
    // Log but don't fail — webhook received without user mapping
    console.warn("Stripe webhook missing user_id in metadata");
    return NextResponse.json({ received: true });
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    date: now.toISOString().slice(0, 10),
    description,
    amount,
    type: "income",
    category: "Revenue",
    domain,
    deductible: false,
    source: "stripe_auto",
    fiscal_year: now.getFullYear(),
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Trigger tax recalculation
  await supabase.rpc("recalculate_tax_summary", { p_user_id: userId, p_year: now.getFullYear() }).maybeSingle();

  return NextResponse.json({ received: true });
}
