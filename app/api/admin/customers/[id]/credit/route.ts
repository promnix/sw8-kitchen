import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/api/auth";

type CreditBody = {
  direction?: "increase" | "decrease";
  amount?: number;
  description?: string;
};

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/customers/[id]/credit">,
) {
  const { supabase, user, admin } = await getAuthenticatedAdmin();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: CreditBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { id } = await params;
  const amount = body.amount;
  const description = body.description?.trim() ?? "";

  if (!body.direction || !["increase", "decrease"].includes(body.direction)) {
    return NextResponse.json({ error: "direction must be increase or decrease." }, { status: 422 });
  }
  if (!Number.isSafeInteger(amount) || (amount ?? 0) <= 0) {
    return NextResponse.json({ error: "amount must be a positive integer in kobo." }, { status: 422 });
  }
  if (!description) {
    return NextResponse.json({ error: "description is required." }, { status: 422 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const { data: transactions, error: transactionError } = await supabase
    .from("credit_transactions")
    .select("amount, transaction_type")
    .eq("customer_id", id);
  if (transactionError) return NextResponse.json({ error: "Unable to read customer credit." }, { status: 500 });

  const balance = (transactions ?? []).reduce((total, transaction) => {
    const increase = transaction.transaction_type === "deposit" || transaction.transaction_type === "adjustment_increase";
    return total + (increase ? transaction.amount : -transaction.amount);
  }, 0);
  if (body.direction === "decrease" && (amount as number) > balance) {
    return NextResponse.json({ error: "Decrease exceeds the available credit balance." }, { status: 422 });
  }

  const transactionType = body.direction === "increase" ? "adjustment_increase" : "adjustment_decrease";
  const { data, error } = await supabase
    .from("credit_transactions")
    .insert({
      customer_id: id,
      recorded_by: admin.id,
      transaction_type: transactionType,
      amount,
      description,
    })
    .select("id, customer_id, transaction_type, amount, description, created_at")
    .single();
  if (error) return NextResponse.json({ error: "Unable to save credit adjustment." }, { status: 500 });

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin.id,
    customer_id: id,
    action: "credit_adjusted",
    entity_type: "credit_transaction",
    entity_id: data.id,
    new_data: { amount, direction: body.direction, description },
  });

  return NextResponse.json({ data }, { status: 201 });
}
