import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function naira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CustomerProfilePage({
  params,
  searchParams,
}: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  const { purchase, updated, credit } = await searchParams;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, first_name, surname, other_names, phone, email, address, date_of_birth, referral_code, status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const [purchasesResult, creditsResult, rewardCreditsResult, cycleResult, rewardsResult, referralsResult] =
    await Promise.all([
      supabase
        .from("purchases")
        .select("id, reference, subtotal_amount, loyalty_eligible_amount, purchased_at, status")
        .eq("customer_id", id)
        .order("purchased_at", { ascending: false }),
      supabase
        .from("credit_transactions")
        .select("amount, transaction_type")
        .eq("customer_id", id),
      supabase
        .from("reward_credit_transactions")
        .select("amount, transaction_type, reward_id")
        .eq("customer_id", id),
      supabase
        .from("loyalty_cycles")
        .select("cycle_number, target_amount, accumulated_amount, status")
        .eq("customer_id", id)
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("rewards")
        .select("id, reward_type, status, maximum_value, unlocked_at, redeemed_at")
        .eq("customer_id", id)
        .order("unlocked_at", { ascending: false }),
      supabase
        .from("referrals")
        .select("id, referred_customer_id, status, accumulated_amount, qualifying_target_amount, created_at")
        .eq("referrer_customer_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const purchases = purchasesResult.data ?? [];
  const credits = creditsResult.data ?? [];
  const rewardCredits = rewardCreditsResult.data ?? [];
  const cycle = cycleResult.data;
  const rewards = rewardsResult.data ?? [];
  const referrals = referralsResult.data ?? [];
  const rewardIds = rewards.map((reward) => reward.id);
  const { data: rewardRedemptions } = rewardIds.length
    ? await supabase
        .from("purchase_reward_redemptions")
        .select("reward_id, redeemed_value")
        .in("reward_id", rewardIds)
    : { data: [] };
  const redemptionMap = new Map(
    (rewardRedemptions ?? []).map((redemption) => [redemption.reward_id, redemption.redeemed_value]),
  );
  const rewardRemainderMap = new Map(
    rewardCredits
      .filter((transaction) => transaction.transaction_type === "reward_remainder" && transaction.reward_id)
      .map((transaction) => [transaction.reward_id as string, transaction.amount]),
  );
  const referredCustomerIds = referrals.map((referral) => referral.referred_customer_id);
  const { data: referredCustomers } = referredCustomerIds.length
    ? await supabase
        .from("customers")
        .select("id, first_name, surname, phone")
        .in("id", referredCustomerIds)
    : { data: [] };
  const referredCustomerMap = new Map(
    (referredCustomers ?? []).map((referredCustomer) => [referredCustomer.id, referredCustomer]),
  );

  const totalSpent = purchases
    .filter((purchase) => purchase.status === "completed")
    .reduce((total, purchase) => total + purchase.loyalty_eligible_amount, 0);
  const creditBalance = credits.reduce((total, transaction) => {
    const increase =
      transaction.transaction_type === "deposit" ||
      transaction.transaction_type === "adjustment_increase";
    return total + (increase ? transaction.amount : -transaction.amount);
  }, 0);
  const rewardCreditBalance = rewardCredits.reduce((total, transaction) => {
    const increase =
      transaction.transaction_type === "reward_remainder" ||
      transaction.transaction_type === "adjustment_increase";
    return total + (increase ? transaction.amount : -transaction.amount);
  }, 0);
  const progress = cycle
    ? Math.min(100, Math.round((cycle.accumulated_amount / cycle.target_amount) * 100))
    : 0;
  const fullName = [customer.first_name, customer.other_names, customer.surname]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1280px]">
        <Link href="/admin/customers" className="group inline-flex items-center gap-2 text-sm font-semibold text-[#b83500] hover:text-black">
          <ArrowLeft aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Back to customers
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold sm:text-3xl">{fullName}</h1>
              <span className="bg-[#e9f7ef] px-2.5 py-1 text-xs font-semibold capitalize text-[#006b34]">
                {customer.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#686864]">{customer.phone}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-[#fff0e9] px-3 py-2 font-mono text-xs font-semibold text-[#b83500]">
              {customer.referral_code}
            </span>
            <Link
              href={`/admin/customers/${id}/credit`}
              className="inline-flex h-10 items-center border border-[#c9c9c3] bg-white px-4 text-sm font-semibold text-black hover:border-black"
            >
              Adjust credit
            </Link>
            <Link
              href={`/admin/customers/${id}/edit`}
              className="inline-flex h-10 items-center border border-[#c9c9c3] bg-white px-4 text-sm font-semibold text-black hover:border-black"
            >
              Edit profile
            </Link>
            <Link
              href={`/admin/customers/${id}/purchases/new`}
              className="inline-flex h-10 items-center rounded-md bg-[#ff4800] px-4 text-sm font-semibold text-white hover:bg-[#df3e00]"
            >
              Record purchase
            </Link>
          </div>
        </div>

        {purchase === "created" ? (
          <p role="status" className="mt-6 border-l-4 border-[#008d44] bg-[#e9f7ef] px-4 py-3 text-sm text-[#006b34]">
            Purchase recorded and customer progress updated.
          </p>
        ) : null}

        {updated === "1" ? (
          <p role="status" className="mt-6 border-l-4 border-[#008d44] bg-[#e9f7ef] px-4 py-3 text-sm text-[#006b34]">
            Customer profile updated successfully.
          </p>
        ) : null}

        {credit === "updated" ? (
          <p role="status" className="mt-6 border-l-4 border-[#008d44] bg-[#e9f7ef] px-4 py-3 text-sm text-[#006b34]">
            Customer credit updated successfully.
          </p>
        ) : null}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Customer summary">
          <Summary label="Total purchases" value={naira(totalSpent)} note={`${purchases.length} records`} color="border-black" />
          <Summary label="Cash balance" value={naira(creditBalance)} note="Refundable change left" color="border-[#ffb132]" />
          <Summary label="Reward balance" value={naira(rewardCreditBalance)} note="Purchases only, not cash" color="border-[#008d44]" />
          <Summary label="Available rewards" value={String(rewards.filter((reward) => reward.status === "available").length)} note="Ready for redemption" color="border-[#008d44]" />
          <Summary label="Customers referred" value={String(referrals.length)} note={`${referrals.filter((referral) => referral.status === "rewarded").length} rewarded`} color="border-[#ff4800]" />
        </section>

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
          <div className="space-y-6">
            <section className="border border-[#deded9] bg-white">
              <div className="border-b border-[#e5e5e0] px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold">Loyalty progress</h2>
              </div>
              <div className="p-5 sm:p-6">
                {cycle ? (
                  <>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-2xl font-semibold">{naira(cycle.accumulated_amount)}</p>
                        <p className="mt-1 text-xs text-[#777771]">Cycle {cycle.cycle_number} progress</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold capitalize text-[#008d44]">
                          {cycle.status.replaceAll("_", " ")}
                        </p>
                        <p className="mt-1 text-xs text-[#777771]">Target {naira(cycle.target_amount)}</p>
                      </div>
                    </div>
                    <div className="mt-5 h-3 w-full bg-[#ecece7]">
                      <div className="h-full bg-[#ff4800]" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-right text-xs font-semibold text-[#686864]">{progress}%</p>
                  </>
                ) : (
                  <p className="text-sm text-[#777771]">No active loyalty cycle.</p>
                )}
              </div>
            </section>

            <section className="border border-[#deded9] bg-white">
              <div className="border-b border-[#e5e5e0] px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold">Purchase history</h2>
              </div>
              {purchases.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-[#777771]">No purchases recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#e8e8e3] bg-[#fafaf8] text-xs font-semibold text-[#686864]">
                        <th className="px-6 py-3">Reference</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.slice(0, 10).map((purchase) => (
                        <tr key={purchase.id} className="border-b border-[#eeeeea] last:border-0">
                          <td className="px-6 py-4 font-mono text-xs font-semibold">{purchase.reference}</td>
                          <td className="px-4 py-4 text-sm text-[#686864]">{formatDate(purchase.purchased_at)}</td>
                          <td className="px-4 py-4 text-sm capitalize">{purchase.status}</td>
                          <td className="px-6 py-4 text-right text-sm font-semibold">{naira(purchase.subtotal_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-lg border border-[#deded9] bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-[#e5e5e0] px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-semibold">Referred customers</h2>
                  <p className="mt-1 text-xs text-[#777771]">People who registered with this customer&apos;s referral code.</p>
                </div>
                <span className="rounded-md bg-[#fff0e9] px-2.5 py-1 text-xs font-semibold text-[#b83500]">
                  {referrals.length} total
                </span>
              </div>
              {referrals.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-[#777771]">No customers referred yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#e8e8e3] bg-[#fafaf8] text-xs font-semibold text-[#686864]">
                        <th className="px-6 py-3">Customer</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Spend progress</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((referral) => {
                        const referredCustomer = referredCustomerMap.get(referral.referred_customer_id);
                        const referralProgress = Math.min(
                          100,
                          Math.round((referral.accumulated_amount / referral.qualifying_target_amount) * 100),
                        );

                        return (
                          <tr key={referral.id} className="border-b border-[#eeeeea] last:border-0">
                            <td className="px-6 py-4">
                              <Link
                                href={`/admin/customers/${referral.referred_customer_id}`}
                                className="text-sm font-semibold hover:text-[#b83500]"
                              >
                                {referredCustomer
                                  ? `${referredCustomer.first_name} ${referredCustomer.surname}`
                                  : "Unknown customer"}
                              </Link>
                              <p className="mt-1 text-xs text-[#777771]">Referred {formatDate(referral.created_at)}</p>
                            </td>
                            <td className="px-4 py-4 text-sm text-[#686864]">{referredCustomer?.phone ?? "Unavailable"}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-2 w-28 overflow-hidden rounded-full bg-[#ecece7]">
                                  <div className="h-full rounded-full bg-[#ff4800]" style={{ width: `${referralProgress}%` }} />
                                </div>
                                <span className="text-xs font-semibold">{referralProgress}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                                  referral.status === "rewarded"
                                    ? "bg-[#e9f7ef] text-[#006b34]"
                                    : referral.status === "cancelled"
                                      ? "bg-[#f4f4f1] text-[#686864]"
                                      : "bg-[#fff8e8] text-[#7a5913]"
                                }`}
                              >
                                {referral.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="border border-[#deded9] bg-white">
              <div className="border-b border-[#e5e5e0] px-5 py-4">
                <h2 className="text-base font-semibold">Customer details</h2>
              </div>
              <dl className="divide-y divide-[#eeeeea] px-5">
                <Detail label="Phone" value={customer.phone} />
                <Detail label="Email" value={customer.email ?? "Not added"} />
                <Detail label="Date of birth" value={customer.date_of_birth ? formatDate(customer.date_of_birth) : "Not added"} />
                <Detail label="Address" value={customer.address} />
                <Detail label="Joined" value={formatDate(customer.created_at)} />
              </dl>
            </section>

            <section className="border border-[#deded9] bg-white">
              <div className="border-b border-[#e5e5e0] px-5 py-4">
                <h2 className="text-base font-semibold">Rewards</h2>
              </div>
              {rewards.length === 0 ? (
                <p className="px-5 py-8 text-sm text-[#777771]">No rewards earned yet.</p>
              ) : (
                <div className="divide-y divide-[#eeeeea]">
                  {rewards.slice(0, 5).map((reward) => {
                    const redeemed = reward.status === "redeemed";
                    const amountUsed = redemptionMap.get(reward.id) ?? 0;
                    const amountMoved = rewardRemainderMap.get(reward.id) ?? 0;

                    return (
                      <details key={reward.id} className="group px-5 py-4 open:bg-[#fafaf8]">
                        <summary className={`flex items-center justify-between gap-4 list-none ${redeemed ? "cursor-pointer" : "cursor-default"}`}>
                          <div>
                            <p className={`text-sm font-semibold capitalize ${redeemed ? "text-[#8a8a84] line-through decoration-[#d52f1f]" : ""}`}>
                              {reward.reward_type.replaceAll("_", " ")}
                            </p>
                            <p className="mt-1 text-xs text-[#777771]">{formatDate(reward.unlocked_at)}</p>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <div>
                              <p className={`text-sm font-semibold ${redeemed ? "text-[#8a8a84] line-through decoration-[#d52f1f]" : ""}`}>
                                {naira(reward.maximum_value)}
                              </p>
                              <p className={`mt-1 text-xs font-semibold ${redeemed ? "text-[#d52f1f]" : "capitalize text-[#008d44]"}`}>
                                {redeemed ? "Redeemed" : reward.status}
                              </p>
                            </div>
                            {redeemed ? <ChevronDown aria-hidden="true" className="size-4 text-[#777771] transition-transform group-open:rotate-180" /> : null}
                          </div>
                        </summary>
                        {redeemed ? (
                          <div className="mt-4 rounded-md border border-[#e5e5e0] bg-white px-4 py-3">
                            <div className="flex items-center justify-between gap-4 text-sm">
                              <span className="text-[#686864]">Used on purchase</span>
                              <strong>{naira(amountUsed)}</strong>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-4 border-t border-[#eeeeea] pt-3 text-sm">
                              <span className="text-[#686864]">Added to reward balance</span>
                              <strong className="text-[#008d44]">{naira(amountMoved)}</strong>
                            </div>
                            {reward.redeemed_at ? <p className="mt-3 text-xs text-[#8a8a84]">Redeemed {formatDate(reward.redeemed_at)}</p> : null}
                          </div>
                        ) : null}
                      </details>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Summary({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <article className={`border border-[#deded9] border-t-4 ${color} bg-white p-5`}>
      <p className="text-sm font-medium text-[#666660]">{label}</p>
      <p className="mt-4 text-2xl font-semibold text-black">{value}</p>
      <p className="mt-2 text-xs text-[#8a8a84]">{note}</p>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4">
      <dt className="text-xs font-medium text-[#777771]">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-black">{value}</dd>
    </div>
  );
}
