import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function naira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}

export default async function ReferralsPage({ searchParams }: PageProps<"/admin/referrals">) {
  const { status } = await searchParams;
  const activeStatus = typeof status === "string" ? status : "all";
  const supabase = await createClient();
  const allReferralsQuery = supabase
    .from("referrals")
    .select("referrer_customer_id, status");
  let query = supabase
    .from("referrals")
    .select("id, referrer_customer_id, referred_customer_id, referral_code_used, accumulated_amount, qualifying_target_amount, status, created_at, qualified_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (["progressing", "rewarded", "cancelled"].includes(activeStatus)) query = query.eq("status", activeStatus);
  const [{ data }, { data: allReferralsData }] = await Promise.all([query, allReferralsQuery]);
  const referrals = data ?? [];
  const allReferrals = allReferralsData ?? [];
  const leaderboard = Array.from(
    allReferrals.reduce((rankings, referral) => {
      const current = rankings.get(referral.referrer_customer_id) ?? {
        customerId: referral.referrer_customer_id,
        total: 0,
        successful: 0,
        progressing: 0,
      };
      current.total += 1;
      if (referral.status === "rewarded") current.successful += 1;
      if (referral.status === "progressing") current.progressing += 1;
      rankings.set(referral.referrer_customer_id, current);
      return rankings;
    }, new Map<string, { customerId: string; total: number; successful: number; progressing: number }>()),
  )
    .map(([, ranking]) => ranking)
    .sort((a, b) => b.successful - a.successful || b.total - a.total);
  const customerIds = [
    ...new Set([
      ...referrals.flatMap((referral) => [referral.referrer_customer_id, referral.referred_customer_id]),
      ...leaderboard.map((ranking) => ranking.customerId),
    ]),
  ];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, first_name, surname, phone").in("id", customerIds)
    : { data: [] };
  const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer]));

  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div><p className="text-sm font-semibold text-[#ff4800]">Referrals</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Referral tracking</h1><p className="mt-2 text-sm text-[#686864]">Monitor referred-customer spending and one-time bonuses.</p></div>
        <section className="mt-7 overflow-hidden rounded-lg border border-[#deded9] bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-[#e5e5e0] px-5 py-4 sm:flex-row sm:items-end sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase text-[#ff4800]">Leaderboard</p>
              <h2 className="mt-1 text-lg font-semibold">Top customer advocates</h2>
              <p className="mt-1 text-xs text-[#777771]">Ranked by successful referrals, then total referrals.</p>
            </div>
            <p className="text-xs font-medium text-[#686864]">{leaderboard.length} active referrers</p>
          </div>
          {leaderboard.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-[#777771]">No referral activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e8e8e3] bg-[#fafaf8] text-xs font-semibold text-[#686864]">
                    <th className="w-20 px-6 py-3">Rank</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">Successful</th>
                    <th className="px-4 py-3 text-center">Progressing</th>
                    <th className="px-6 py-3 text-right">Bonus earned</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((ranking, index) => {
                    const customer = customerMap.get(ranking.customerId);
                    return (
                      <tr key={ranking.customerId} className="border-b border-[#eeeeea] last:border-0">
                        <td className="px-6 py-4">
                          <span className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-[#ffb132] text-black" : "bg-[#f1f1ed] text-[#686864]"}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <Link href={`/admin/customers/${ranking.customerId}`} className="text-sm font-semibold hover:text-[#b83500]">
                            {customer ? `${customer.first_name} ${customer.surname}` : "Unknown customer"}
                          </Link>
                          <p className="mt-1 text-xs text-[#777771]">{customer?.phone}</p>
                        </td>
                        <td className="px-4 py-4 text-center text-sm font-semibold">{ranking.total}</td>
                        <td className="px-4 py-4 text-center text-sm font-semibold text-[#008d44]">{ranking.successful}</td>
                        <td className="px-4 py-4 text-center text-sm font-semibold text-[#b06b00]">{ranking.progressing}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold">{naira(ranking.successful * 100000)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <div className="mt-6 flex flex-wrap gap-2">
          {[{ key: "all", label: "All" }, { key: "progressing", label: "Progressing" }, { key: "rewarded", label: "Rewarded" }, { key: "cancelled", label: "Cancelled" }].map((item) => (
            <Link key={item.key} href={item.key === "all" ? "/admin/referrals" : `/admin/referrals?status=${item.key}`} className={`inline-flex h-9 items-center border px-3 text-sm font-semibold ${activeStatus === item.key ? "border-black bg-black text-white" : "border-[#c9c9c3] bg-white text-[#686864]"}`}>{item.label}</Link>
          ))}
        </div>
        <section className="mt-5 border border-[#deded9] bg-white">
          {referrals.length === 0 ? <p className="px-6 py-14 text-center text-sm text-[#777771]">No referrals found.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left"><thead><tr className="border-b border-[#e8e8e3] bg-[#fafaf8] text-xs font-semibold text-[#686864]"><th className="px-6 py-3">Referrer</th><th className="px-4 py-3">Referred customer</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Code used</th></tr></thead><tbody>
              {referrals.map((referral) => {
                const referrer = customerMap.get(referral.referrer_customer_id);
                const referred = customerMap.get(referral.referred_customer_id);
                const percent = Math.min(100, Math.round((referral.accumulated_amount / referral.qualifying_target_amount) * 100));
                return <tr key={referral.id} className="border-b border-[#eeeeea] last:border-0"><td className="px-6 py-4"><Link href={`/admin/customers/${referral.referrer_customer_id}`} className="text-sm font-semibold hover:text-[#b83500]">{referrer ? `${referrer.first_name} ${referrer.surname}` : "Unknown customer"}</Link><p className="mt-1 text-xs text-[#777771]">{referrer?.phone}</p></td><td className="px-4 py-4"><Link href={`/admin/customers/${referral.referred_customer_id}`} className="text-sm font-semibold hover:text-[#b83500]">{referred ? `${referred.first_name} ${referred.surname}` : "Unknown customer"}</Link><p className="mt-1 text-xs text-[#777771]">{referred?.phone}</p></td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="h-2 w-28 bg-[#ecece7]"><div className="h-full bg-[#ff4800]" style={{ width: `${percent}%` }} /></div><span className="text-xs font-semibold">{naira(referral.accumulated_amount)} / {naira(referral.qualifying_target_amount)}</span></div></td><td className="px-4 py-4"><span className={`px-2.5 py-1 text-xs font-semibold capitalize ${referral.status === "rewarded" ? "bg-[#e9f7ef] text-[#006b34]" : "bg-[#fff8e8] text-[#7a5913]"}`}>{referral.status}</span></td><td className="px-6 py-4 text-right font-mono text-xs font-semibold text-[#b83500]">{referral.referral_code_used}</td></tr>;
              })}
            </tbody></table></div>
          )}
        </section>
      </div>
    </main>
  );
}
