import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function naira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}

export default async function ReferralsPage({ searchParams }: PageProps<"/admin/referrals">) {
  const { status } = await searchParams;
  const activeStatus = typeof status === "string" ? status : "all";
  const supabase = await createClient();
  let query = supabase
    .from("referrals")
    .select("id, referrer_customer_id, referred_customer_id, referral_code_used, accumulated_amount, qualifying_target_amount, status, created_at, qualified_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (["progressing", "rewarded", "cancelled"].includes(activeStatus)) query = query.eq("status", activeStatus);
  const { data } = await query;
  const referrals = data ?? [];
  const customerIds = [...new Set(referrals.flatMap((referral) => [referral.referrer_customer_id, referral.referred_customer_id]))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, first_name, surname, phone").in("id", customerIds)
    : { data: [] };
  const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer]));

  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div><p className="text-sm font-semibold text-[#ff4800]">Referrals</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Referral tracking</h1><p className="mt-2 text-sm text-[#686864]">Monitor referred-customer spending and one-time bonuses.</p></div>
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
