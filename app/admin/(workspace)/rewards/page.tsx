import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function naira(kobo: number) { return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100); }
function date(value: string | null) { return value ? new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "-"; }

export default async function RewardsPage({ searchParams }: PageProps<"/admin/rewards">) {
  const { status } = await searchParams;
  const activeStatus = typeof status === "string" ? status : "all";
  const supabase = await createClient();
  let query = supabase.from("rewards").select("id, customer_id, reward_type, status, maximum_value, unlocked_at, redeemed_at").order("unlocked_at", { ascending: false }).limit(200);
  if (["available", "redeemed", "expired", "cancelled"].includes(activeStatus)) query = query.eq("status", activeStatus);
  const { data } = await query;
  const rewards = data ?? [];
  const ids = [...new Set(rewards.map((reward) => reward.customer_id))];
  const { data: customers } = ids.length ? await supabase.from("customers").select("id, first_name, surname, phone").in("id", ids) : { data: [] };
  const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer]));

  return <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10"><div className="mx-auto max-w-[1280px]"><div><p className="text-sm font-semibold text-[#ff4800]">Rewards</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Customer bonuses</h1><p className="mt-2 text-sm text-[#686864]">Review available and redeemed meal and referral rewards.</p></div><div className="mt-6 flex flex-wrap gap-2">{[{ key: "all", label: "All" }, { key: "available", label: "Available" }, { key: "redeemed", label: "Redeemed" }, { key: "cancelled", label: "Cancelled" }].map((item) => <Link key={item.key} href={item.key === "all" ? "/admin/rewards" : `/admin/rewards?status=${item.key}`} className={`inline-flex h-9 items-center border px-3 text-sm font-semibold ${activeStatus === item.key ? "border-black bg-black text-white" : "border-[#c9c9c3] bg-white text-[#686864]"}`}>{item.label}</Link>)}</div><section className="mt-5 border border-[#deded9] bg-white">{rewards.length === 0 ? <p className="px-6 py-14 text-center text-sm text-[#777771]">No rewards found.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] border-collapse text-left"><thead><tr className="border-b border-[#e8e8e3] bg-[#fafaf8] text-xs font-semibold text-[#686864]"><th className="px-6 py-3">Customer</th><th className="px-4 py-3">Reward</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Unlocked</th><th className="px-4 py-3">Redeemed</th><th className="px-6 py-3 text-right">Status</th></tr></thead><tbody>{rewards.map((reward) => { const customer = customerMap.get(reward.customer_id); return <tr key={reward.id} className="border-b border-[#eeeeea] last:border-0"><td className="px-6 py-4"><Link href={`/admin/customers/${reward.customer_id}`} className="text-sm font-semibold hover:text-[#b83500]">{customer ? `${customer.first_name} ${customer.surname}` : "Unknown customer"}</Link><p className="mt-1 text-xs text-[#777771]">{customer?.phone}</p></td><td className="px-4 py-4 text-sm font-medium">{reward.reward_type === "loyalty_meal" ? "Meal gift" : "Referral side"}</td><td className="px-4 py-4 text-sm font-semibold">{naira(reward.maximum_value)}</td><td className="px-4 py-4 text-sm text-[#686864]">{date(reward.unlocked_at)}</td><td className="px-4 py-4 text-sm text-[#686864]">{date(reward.redeemed_at)}</td><td className="px-6 py-4 text-right"><span className={`px-2.5 py-1 text-xs font-semibold capitalize ${reward.status === "available" ? "bg-[#e9f7ef] text-[#006b34]" : "bg-[#eeeeea] text-[#5f5f5a]"}`}>{reward.status}</span></td></tr>; })}</tbody></table></div>}</section></div></main>;
}
