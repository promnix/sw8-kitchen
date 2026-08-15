"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreditAdjustmentState = { error: string };

export async function adjustCredit(
  customerId: string,
  _state: CreditAdjustmentState,
  formData: FormData,
): Promise<CreditAdjustmentState> {
  const amount = Math.round((Number(String(formData.get("amount") ?? "").replace(/,/g, "")) || 0) * 100);
  const direction = String(formData.get("direction") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (amount <= 0) return { error: "Enter an amount greater than zero." };
  if (!["increase", "decrease"].includes(direction)) return { error: "Choose an adjustment type." };
  if (!description) return { error: "Add a short reason for this adjustment." };

  const sessionClient = await createClient();
  const { data: authData } = await sessionClient.auth.getUser();
  if (!authData.user) return { error: "Your session has ended. Sign in again." };
  const { data: admin } = await sessionClient.from("admin_profiles").select("id").eq("id", authData.user.id).maybeSingle();
  if (!admin) return { error: "You do not have permission to adjust credit." };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Credit adjustments require SUPABASE_SERVICE_ROLE_KEY." };
  }

  const { data: customer } = await supabase.from("customers").select("id").eq("id", customerId).maybeSingle();
  if (!customer) return { error: "Customer profile not found." };
  const { data: transactions } = await supabase.from("credit_transactions").select("amount, transaction_type").eq("customer_id", customerId);
  const balance = (transactions ?? []).reduce((total, transaction) => {
    const increase = transaction.transaction_type === "deposit" || transaction.transaction_type === "adjustment_increase";
    return total + (increase ? transaction.amount : -transaction.amount);
  }, 0);
  if (direction === "decrease" && amount > balance) return { error: "The decrease cannot exceed the customer’s available credit." };

  const transactionType = direction === "increase" ? "adjustment_increase" : "adjustment_decrease";
  const { error } = await supabase.from("credit_transactions").insert({
    customer_id: customerId,
    recorded_by: admin.id,
    transaction_type: transactionType,
    amount,
    description,
  });
  if (error) return { error: "Unable to save the credit adjustment." };

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin.id,
    customer_id: customerId,
    action: "credit_adjusted",
    entity_type: "credit_transaction",
    new_data: { amount, direction, description },
  });

  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}?credit=updated`);
}
