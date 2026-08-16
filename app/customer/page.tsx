import Image from "next/image";
import { redirect } from "next/navigation";
import { Gift, Sparkles, WalletCards } from "lucide-react";
import { signOut } from "../actions/auth";
import { createClient } from "@/lib/supabase/server";
import { Pagination } from "../admin/(workspace)/pagination";
import { CopyReferralButton } from "./copy-referral-button";

const PAGE_SIZE = 10;

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

function formatPurchaseDate(value: string) {
  const date = new Date(value);
  const day = date.getDate();
  const remainder = day % 100;
  const suffix = remainder >= 11 && remainder <= 13 ? "th" : day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";
  const time = new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" }).format(date);
  const rest = new Intl.DateTimeFormat("en-NG", { weekday: "long", month: "long", year: "numeric" }).formatToParts(date);
  const weekday = rest.find((part) => part.type === "weekday")?.value;
  const month = rest.find((part) => part.type === "month")?.value;
  const year = rest.find((part) => part.type === "year")?.value;
  return `${time}, ${weekday}, ${day}${suffix} ${month} ${year}`;
}

export default async function CustomerPage({ searchParams }: PageProps<"/customer">) {
  const { purchasesPage, rewardsPage } = await searchParams;
  const purchasePage = Math.max(1, Number(typeof purchasesPage === "string" ? purchasesPage : "1") || 1);
  const rewardPage = Math.max(1, Number(typeof rewardsPage === "string" ? rewardsPage : "1") || 1);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) redirect("/");

  const { data: customer } = await supabase
    .from("customers")
    .select("id, first_name, surname, other_names, phone, email, address, date_of_birth, referral_code, created_at")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!customer) redirect("/");

  const [purchasesResult, creditsResult, rewardCreditsResult, cycleResult, rewardSummaryResult, rewardsResult, referralsResult] =
    await Promise.all([
      supabase
        .from("purchases")
        .select("id, reference, reward_discount_amount, reward_credit_used_amount, purchased_at, status", { count: "exact" })
        .eq("customer_id", customer.id)
        .eq("status", "completed")
        .order("purchased_at", { ascending: false })
        .range((purchasePage - 1) * PAGE_SIZE, purchasePage * PAGE_SIZE - 1),
      supabase
        .from("credit_transactions")
        .select("amount, transaction_type")
        .eq("customer_id", customer.id),
      supabase
        .from("reward_credit_transactions")
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
        .select("id, reward_type, status")
        .eq("customer_id", customer.id),
      supabase
        .from("rewards")
        .select("id, reward_type, status, maximum_value, unlocked_at, redeemed_at")
        .eq("customer_id", customer.id)
        .order("unlocked_at", { ascending: false })
        .range((rewardPage - 1) * PAGE_SIZE, rewardPage * PAGE_SIZE - 1),
      supabase
        .from("referrals")
        .select("id, status, created_at")
        .eq("referrer_customer_id", customer.id)
        .order("created_at", { ascending: false }),
    ]);

  const purchases = purchasesResult.data ?? [];
  const credits = creditsResult.data ?? [];
  const rewardCredits = rewardCreditsResult.data ?? [];
  const cycle = cycleResult.data;
  const rewards = rewardsResult.data ?? [];
  const rewardSummary = rewardSummaryResult.data ?? [];
  const referrals = referralsResult.data ?? [];
  const availableRewards = rewardSummary.filter((reward) => reward.status === "available");
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
    <div data-app-shell="customer" className="min-h-screen bg-[#f5f5f2] text-black">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[#deded9] bg-white">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:h-20 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-black p-1 shadow-sm">
              <Image src="/brand/sw8-logo.png" alt="SW8 Kitchen" width={40} height={30} className="h-auto w-full" priority />
            </span>
            <div>
              <p className="text-sm font-semibold">SW8 Kitchen</p>
              <p className="mt-0.5 text-xs text-[#777771]">Customer account</p>
            </div>
          </div>
          <form action={signOut}>
            <button type="submit" className="h-10 rounded-md bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-[#ff4800]">Sign out</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-5 pb-7 pt-24 sm:px-7 sm:pb-10 sm:pt-28">
        <div>
          <p className="text-sm font-semibold text-[#008d44]">Welcome back</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{fullName}</h1>
          <p className="mt-2 text-sm text-[#686864]">{customer.phone}</p>
        </div>

        <section className="reward-stage mt-7 overflow-hidden rounded-lg bg-black px-5 py-6 text-white sm:px-8 sm:py-8">
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
                {hasUnlockedGift ? "Ask an attendant to include it with your next purchase." : "Your progress continues quietly with every visit."}
              </p>
            </div>
            {hasUnlockedGift ? <p className="hidden shrink-0 text-right text-sm font-semibold text-[#7ce5a8] sm:block">Reward unlocked<br /><span className="text-xl text-white">Meals on the house</span></p> : null}
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
          <Summary icon={<WalletCards className="size-5" />} label="Cash balance" value={naira(creditBalance)} note="Refundable change left" color="border-[#ffb132]" />
          <Summary icon={<Sparkles className="size-5" />} label="Reward balance" value={naira(rewardCreditBalance)} note="For purchases only" color="border-black" />
          <Summary icon={<Gift className="size-5" />} label="Available rewards" value={String(availableRewards.length)} note="Ready for your next purchase" color="border-[#ff4800]" />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div className="space-y-6">
            <section className="rounded-lg border border-[#deded9] bg-white shadow-[0_10px_30px_rgb(0_0_0_/_4%)]">
              <SectionTitle>Visit history</SectionTitle>
              {purchases.length === 0 ? (
                <Empty>No purchases recorded yet.</Empty>
              ) : (
                <div className="divide-y divide-[#eeeeea]">
                  {purchases.slice(0, 8).map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between gap-5 px-5 py-4 sm:px-6">
                      <div>
                        <p className="font-mono text-xs font-semibold">{purchase.reference}</p>
                        <p className="mt-1 text-xs text-[#777771]">{formatPurchaseDate(purchase.purchased_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold ${purchase.reward_discount_amount > 0 || purchase.reward_credit_used_amount > 0 ? "text-[#008d44]" : "text-[#777771]"}`}>
                          {purchase.reward_discount_amount > 0 || purchase.reward_credit_used_amount > 0 ? "Reward applied" : "No reward applied"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={purchasePage} pageSize={PAGE_SIZE} total={purchasesResult.count ?? 0} pathname="/customer" pageKey="purchasesPage" query={{ rewardsPage: rewardPage > 1 ? rewardPage : undefined }} />
            </section>

            <section className="rounded-lg border border-[#deded9] bg-white shadow-[0_10px_30px_rgb(0_0_0_/_4%)]">
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
              <Pagination page={rewardPage} pageSize={PAGE_SIZE} total={rewardSummary.length} pathname="/customer" pageKey="rewardsPage" query={{ purchasesPage: purchasePage > 1 ? purchasePage : undefined }} />
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-[#deded9] bg-white shadow-[0_10px_30px_rgb(0_0_0_/_4%)]">
              <SectionTitle>Referral code</SectionTitle>
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-2xl font-semibold text-[#b83500]">{customer.referral_code}</p>
                  <CopyReferralButton code={customer.referral_code} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#eeeeea] pt-5">
                  <Stat value={referrals.length} label="People referred" />
                  <Stat value={referrals.filter((referral) => referral.status === "rewarded").length} label="Rewards earned" />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#deded9] bg-white shadow-[0_10px_30px_rgb(0_0_0_/_4%)]">
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
    <article className={`premium-panel rounded-lg border border-[#deded9] border-t-4 ${color} bg-white p-5`}>
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
