import { redirect } from "next/navigation";
import { Gift, ReceiptText, Sparkles, WalletCards } from "lucide-react";
import { signOut } from "../actions/auth";
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

export default async function CustomerPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) redirect("/");

  const { data: customer } = await supabase
    .from("customers")
    .select("id, first_name, surname, other_names, phone, email, address, date_of_birth, referral_code, created_at")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!customer) redirect("/");

  const [purchasesResult, creditsResult, cycleResult, rewardsResult, referralsResult] =
    await Promise.all([
      supabase
        .from("purchases")
        .select("id, reference, subtotal_amount, reward_discount_amount, purchased_at, status")
        .eq("customer_id", customer.id)
        .eq("status", "completed")
        .order("purchased_at", { ascending: false }),
      supabase
        .from("credit_transactions")
        .select("amount, transaction_type")
        .eq("customer_id", customer.id),
      supabase
        .from("loyalty_cycles")
        .select("cycle_number, accumulated_amount, target_amount, status")
        .eq("customer_id", customer.id)
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("rewards")
        .select("id, reward_type, status, maximum_value, unlocked_at, redeemed_at")
        .eq("customer_id", customer.id)
        .order("unlocked_at", { ascending: false }),
      supabase
        .from("referrals")
        .select("id, status, created_at")
        .eq("referrer_customer_id", customer.id)
        .order("created_at", { ascending: false }),
    ]);

  const purchases = purchasesResult.data ?? [];
  const credits = creditsResult.data ?? [];
  const cycle = cycleResult.data;
  const rewards = rewardsResult.data ?? [];
  const referrals = referralsResult.data ?? [];
  const availableRewards = rewards.filter((reward) => reward.status === "available");
  const creditBalance = credits.reduce((total, transaction) => {
    const increase =
      transaction.transaction_type === "deposit" ||
      transaction.transaction_type === "adjustment_increase";
    return total + (increase ? transaction.amount : -transaction.amount);
  }, 0);
  const fullName = [customer.first_name, customer.other_names, customer.surname]
    .filter(Boolean)
    .join(" ");
  const hasUnlockedGift = availableRewards.some(
    (reward) => reward.reward_type === "loyalty_meal",
  );
  const journeyProgress = hasUnlockedGift
    ? 100
    : cycle
      ? Math.max(6, Math.min(94, Math.round((cycle.accumulated_amount / cycle.target_amount) * 100)))
      : 6;

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-black">
      <header className="border-b border-[#deded9] bg-white">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:h-20 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center bg-[#ff4800] text-xs font-bold text-white">SW8</span>
            <div>
              <p className="text-sm font-semibold">SW8 Kitchen</p>
              <p className="mt-0.5 text-xs text-[#777771]">Customer account</p>
            </div>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-sm font-semibold text-[#b83500] hover:text-black">Sign out</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-5 py-7 sm:px-7 sm:py-10">
        <div>
          <p className="text-sm font-semibold text-[#008d44]">Welcome back</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{fullName}</h1>
          <p className="mt-2 text-sm text-[#686864]">{customer.phone}</p>
        </div>

        <section className="reward-stage mt-7 overflow-hidden bg-black px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[#ffb132]">
                <Sparkles className="size-4" />
                <p className="text-xs font-semibold uppercase">Your reward journey</p>
              </div>
              <h2 className="mt-3 max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">
                {hasUnlockedGift ? "You made it. Your next meal gift is ready." : "Every visit moves your gift a little closer."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                {hasUnlockedGift ? "Ask an attendant to include it with your next purchase." : `${naira(cycle?.accumulated_amount ?? 0)} collected on this journey so far.`}
              </p>
            </div>
            {hasUnlockedGift ? <p className="hidden shrink-0 text-right text-sm font-semibold text-[#7ce5a8] sm:block">Gift value<br /><span className="text-2xl">{naira(500000)}</span></p> : null}
          </div>

          <div className="relative mt-10 pb-2 pt-8">
            <div className="absolute inset-x-0 top-10 h-1 bg-white/15" />
            <div className="absolute left-0 top-10 h-1 bg-[#ff4800] transition-[width] duration-700" style={{ width: `${journeyProgress}%` }} />
            <div className="absolute left-0 top-[34px] size-4 border-4 border-black bg-[#ff4800]" />
            <div className="absolute top-[31px] size-5 -translate-x-1/2 border-4 border-black bg-[#ffb132] transition-[left] duration-700" style={{ left: `${journeyProgress}%` }} />
            <div className="gift-dangle absolute right-0 top-0 flex flex-col items-center">
              <span className="h-5 w-px bg-white/40" />
              <span className={`grid size-12 place-items-center border ${hasUnlockedGift ? "border-[#7ce5a8] bg-[#008d44] text-white" : "border-white/20 bg-[#181818] text-[#ffb132]"}`}>
                <Gift className="size-6" />
              </span>
            </div>
            <div className="flex justify-between pt-8 text-[11px] font-semibold uppercase text-white/45">
              <span>Journey started</span>
              <span>{hasUnlockedGift ? "Gift unlocked" : "Gift ahead"}</span>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Account summary">
          <Summary icon={<ReceiptText className="size-5" />} label="Purchase progress" value={naira(cycle?.accumulated_amount ?? 0)} note="Current reward journey" color="border-[#ff4800]" />
          <Summary icon={<WalletCards className="size-5" />} label="Available credit" value={naira(creditBalance)} note="Change left with SW8 Kitchen" color="border-[#ffb132]" />
          <Summary icon={<Gift className="size-5" />} label="Available rewards" value={String(availableRewards.length)} note="Ready for your next purchase" color="border-[#008d44]" />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div className="space-y-6">
            <section className="border border-[#deded9] bg-white">
              <SectionTitle>Recent purchases</SectionTitle>
              {purchases.length === 0 ? (
                <Empty>No purchases recorded yet.</Empty>
              ) : (
                <div className="divide-y divide-[#eeeeea]">
                  {purchases.slice(0, 8).map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between gap-5 px-5 py-4 sm:px-6">
                      <div>
                        <p className="font-mono text-xs font-semibold">{purchase.reference}</p>
                        <p className="mt-1 text-xs text-[#777771]">{formatDate(purchase.purchased_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{naira(purchase.subtotal_amount)}</p>
                        {purchase.reward_discount_amount > 0 ? <p className="mt-1 text-xs text-[#008d44]">Reward applied</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="border border-[#deded9] bg-white">
              <SectionTitle>Reward history</SectionTitle>
              {rewards.length === 0 ? (
                <Empty>No rewards earned yet.</Empty>
              ) : (
                <div className="divide-y divide-[#eeeeea]">
                  {rewards.map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between gap-5 px-5 py-4 sm:px-6">
                      <div>
                        <p className="text-sm font-semibold">{reward.reward_type === "loyalty_meal" ? "Meal gift" : "Referral side"}</p>
                        <p className="mt-1 text-xs text-[#777771]">Earned {formatDate(reward.unlocked_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{naira(reward.maximum_value)}</p>
                        <p className={`mt-1 text-xs font-medium capitalize ${reward.status === "available" ? "text-[#008d44]" : "text-[#777771]"}`}>{reward.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="border border-[#deded9] bg-white">
              <SectionTitle>Referral code</SectionTitle>
              <div className="p-5">
                <p className="font-mono text-2xl font-semibold text-[#b83500]">{customer.referral_code}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#eeeeea] pt-5">
                  <Stat value={referrals.length} label="People referred" />
                  <Stat value={referrals.filter((referral) => referral.status === "rewarded").length} label="Rewards earned" />
                </div>
              </div>
            </section>

            <section className="border border-[#deded9] bg-white">
              <SectionTitle>Profile details</SectionTitle>
              <dl className="divide-y divide-[#eeeeea] px-5">
                <Detail label="Phone" value={customer.phone} />
                <Detail label="Email" value={customer.email ?? "Not added"} />
                <Detail label="Date of birth" value={customer.date_of_birth ? formatDate(customer.date_of_birth) : "Not added"} />
                <Detail label="Address" value={customer.address} />
                <Detail label="Member since" value={formatDate(customer.created_at)} />
              </dl>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Summary({ icon, label, value, note, color }: { icon: React.ReactNode; label: string; value: string; note: string; color: string }) {
  return (
    <article className={`premium-panel border border-[#deded9] border-t-4 ${color} bg-white p-5`}>
      <div className="flex items-center justify-between"><p className="text-sm font-medium text-[#686864]">{label}</p><span className="text-black">{icon}</span></div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-[#8a8a84]">{note}</p>
    </article>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-[#e5e5e0] px-5 py-4 sm:px-6"><h2 className="text-base font-semibold">{children}</h2></div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-12 text-center text-sm text-[#777771]">{children}</p>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-[#777771]">{label}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="py-4"><dt className="text-xs font-medium text-[#777771]">{label}</dt><dd className="mt-1 text-sm leading-6">{value}</dd></div>;
}
