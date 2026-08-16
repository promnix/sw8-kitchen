import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/api/auth";
import { sendNotifications } from "@/lib/email/send-notifications";

type PurchaseBody = {
  subtotalAmount?: number;
  creditUsedAmount?: number;
  rewardCreditUsedAmount?: number;
  changeLeftAmount?: number;
  rewardId?: string | null;
  rewardUsedAmount?: number;
  notes?: string | null;
};

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/customers/[id]/purchases">,
) {
  const { supabase, user, admin } = await getAuthenticatedAdmin();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: PurchaseBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { id } = await params;
  const subtotal = body.subtotalAmount;
  const creditUsed = body.creditUsedAmount ?? 0;
  const rewardCreditUsed = body.rewardCreditUsedAmount ?? 0;
  const changeLeft = body.changeLeftAmount ?? 0;
  const rewardUsed = body.rewardUsedAmount ?? 0;

  if (!Number.isSafeInteger(subtotal) || (subtotal ?? 0) <= 0) {
    return NextResponse.json({ error: "subtotalAmount must be a positive integer in kobo." }, { status: 422 });
  }
  if (!Number.isSafeInteger(creditUsed) || creditUsed < 0) {
    return NextResponse.json({ error: "creditUsedAmount must be a non-negative integer in kobo." }, { status: 422 });
  }
  if (!Number.isSafeInteger(changeLeft) || changeLeft < 0) {
    return NextResponse.json({ error: "changeLeftAmount must be a non-negative integer in kobo." }, { status: 422 });
  }
  if (!Number.isSafeInteger(rewardCreditUsed) || rewardCreditUsed < 0) {
    return NextResponse.json({ error: "rewardCreditUsedAmount must be a non-negative integer in kobo." }, { status: 422 });
  }
  if (!Number.isSafeInteger(rewardUsed) || rewardUsed < 0) {
    return NextResponse.json({ error: "rewardUsedAmount must be a non-negative integer in kobo." }, { status: 422 });
  }

  const { data, error } = await supabase.rpc("record_customer_purchase", {
    p_customer_id: id,
    p_subtotal_amount: subtotal,
    p_credit_used_amount: creditUsed,
    p_change_left_amount: changeLeft,
    p_reward_id: body.rewardId || null,
    p_reward_used_amount: rewardUsed,
    p_reward_credit_used_amount: rewardCreditUsed,
    p_notes: body.notes?.trim() || null,
  });

  if (error) {
    const missingFunction = error.message.includes("Could not find the function");
    return NextResponse.json(
      {
        error: missingFunction
          ? "Purchase function is not installed. Run database-update-001-purchases.sql."
          : error.message,
      },
      { status: missingFunction ? 503 : 422 },
    );
  }

  const purchaseResult = data as { unlocked_reward_ids?: string[] } | null;
  const unlockedRewardIds = purchaseResult?.unlocked_reward_ids ?? [];
  const delivery = unlockedRewardIds.length > 0
    ? await sendNotifications({
        supabase,
        statuses: ["pending"],
        rewardIds: unlockedRewardIds,
      })
    : { processed: 0, sent: 0, failed: 0, skipped: 0 };

  return NextResponse.json({ data, delivery }, { status: 201 });
}
