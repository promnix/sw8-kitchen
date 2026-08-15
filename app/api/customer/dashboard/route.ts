import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id, first_name, surname, other_names, phone, email, address, date_of_birth, referral_code, created_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });

  const [purchasesResult, creditsResult, cycleResult, rewardsResult, referralsResult] = await Promise.all([
    supabase.from("purchases").select("id, reference, subtotal_amount, reward_discount_amount, purchased_at").eq("customer_id", user.id).eq("status", "completed").order("purchased_at", { ascending: false }).limit(20),
    supabase.from("credit_transactions").select("amount, transaction_type").eq("customer_id", user.id),
    supabase.from("loyalty_cycles").select("cycle_number, accumulated_amount, status").eq("customer_id", user.id).order("cycle_number", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("rewards").select("id, reward_type, status, maximum_value, unlocked_at, redeemed_at").eq("customer_id", user.id).order("unlocked_at", { ascending: false }),
    supabase.from("referrals").select("id, status, created_at").eq("referrer_customer_id", user.id).order("created_at", { ascending: false }),
  ]);

  const creditBalance = (creditsResult.data ?? []).reduce((total, transaction) => {
    const increase = transaction.transaction_type === "deposit" || transaction.transaction_type === "adjustment_increase";
    return total + (increase ? transaction.amount : -transaction.amount);
  }, 0);
  const rewards = rewardsResult.data ?? [];
  const referrals = referralsResult.data ?? [];

  return NextResponse.json({
    data: {
      profile: customer,
      purchaseProgress: cycleResult.data?.accumulated_amount ?? 0,
      cycleStatus: cycleResult.data?.status ?? null,
      creditBalance,
      availableRewards: rewards.filter((reward) => reward.status === "available"),
      rewardHistory: rewards,
      referralCount: referrals.length,
      rewardedReferralCount: referrals.filter((referral) => referral.status === "rewarded").length,
      recentPurchases: purchasesResult.data ?? [],
    },
  });
}
