"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendNotifications } from "@/lib/email/send-notifications";
import { createClient } from "@/lib/supabase/server";

export type RecordPurchaseState = { error: string };

function toKobo(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export async function recordPurchase(
  customerId: string,
  _state: RecordPurchaseState,
  formData: FormData,
): Promise<RecordPurchaseState> {
  const subtotal = toKobo(formData.get("subtotal"));
  const creditUsed = toKobo(formData.get("creditUsed"));
  const rewardCreditUsed = toKobo(formData.get("rewardCreditUsed"));
  const changeLeft = toKobo(formData.get("changeLeft"));
  const rewardId = String(formData.get("rewardId") ?? "").trim() || null;
  const rewardUsed = toKobo(formData.get("rewardUsed"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!subtotal || subtotal <= 0) return { error: "Enter a purchase amount greater than zero." };
  if (creditUsed === null) return { error: "Enter a valid credit amount." };
  if (rewardCreditUsed === null) return { error: "Enter a valid reward balance amount." };
  if (changeLeft === null) return { error: "Enter a valid amount for change left behind." };
  if (rewardUsed === null) return { error: "Enter a valid reward amount." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_customer_purchase", {
    p_customer_id: customerId,
    p_subtotal_amount: subtotal,
    p_credit_used_amount: creditUsed,
    p_change_left_amount: changeLeft,
    p_reward_id: rewardId,
    p_reward_used_amount: rewardUsed,
    p_reward_credit_used_amount: rewardCreditUsed,
    p_notes: notes,
  });

  if (error) {
    if (error.message.includes("Could not find the function")) {
      return { error: "Run database-update-001-purchases.sql in Supabase before recording purchases." };
    }
    return { error: error.message };
  }

  const purchaseResult = data as { unlocked_reward_ids?: string[] } | null;
  const unlockedRewardIds = purchaseResult?.unlocked_reward_ids ?? [];
  if (unlockedRewardIds.length > 0) {
    await sendNotifications({
      supabase,
      statuses: ["pending"],
      rewardIds: unlockedRewardIds,
    });
  }

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/customers/${customerId}?purchase=created`);
}
