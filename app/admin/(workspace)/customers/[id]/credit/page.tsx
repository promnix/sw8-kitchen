import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Pagination } from "../../../pagination";
import { CreditForm } from "./credit-form";

const PAGE_SIZE = 20;

export default async function CreditPage({ params, searchParams }: PageProps<"/admin/customers/[id]/credit">) {
  const { id } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(typeof page === "string" ? page : "1") || 1);
  const supabase = await createClient();
  const [customerResult, balanceResult, transactionsResult] = await Promise.all([
    supabase.from("customers").select("first_name, surname, phone").eq("id", id).maybeSingle(),
    supabase.from("credit_transactions").select("amount, transaction_type").eq("customer_id", id),
    supabase.from("credit_transactions").select("id, amount, transaction_type, description, created_at", { count: "exact" }).eq("customer_id", id).order("created_at", { ascending: false }).range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1),
  ]);
  const customer = customerResult.data;
  if (!customer) notFound();
  const transactions = transactionsResult.data ?? [];
  const balance = (balanceResult.data ?? []).reduce((total, transaction) => {
    const increase = transaction.transaction_type === "deposit" || transaction.transaction_type === "adjustment_increase";
    return total + (increase ? transaction.amount : -transaction.amount);
  }, 0);
  return <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10"><div className="mx-auto max-w-3xl"><Link href={`/admin/customers/${id}`} className="text-sm font-semibold text-[#b83500]">Back to customer</Link><div className="mt-5"><p className="text-sm font-semibold text-[#ff4800]">Credit ledger</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Adjust credit for {customer.first_name} {customer.surname}</h1><p className="mt-2 text-sm text-[#686864]">{customer.phone}</p></div><section className="mt-7 border border-[#deded9] bg-white p-5 sm:p-6"><CreditForm customerId={id} balance={balance} /></section><section className="mt-6 overflow-hidden border border-[#deded9] bg-white"><div className="border-b border-[#e5e5e0] px-5 py-4"><h2 className="text-base font-semibold">Transaction history</h2></div>{transactions.length === 0 ? <p className="px-5 py-10 text-sm text-[#777771]">No credit transactions yet.</p> : <div className="divide-y divide-[#eeeeea]">{transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="text-sm font-medium">{transaction.description ?? transaction.transaction_type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[#777771]">{new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(transaction.created_at))}</p></div><p className={`text-sm font-semibold ${transaction.transaction_type.includes("decrease") || transaction.transaction_type === "redemption" ? "text-[#b83500]" : "text-[#006b34]"}`}>{transaction.transaction_type.includes("decrease") || transaction.transaction_type === "redemption" ? "-" : "+"}{formatNaira(transaction.amount)}</p></div>)}</div>}<Pagination page={currentPage} pageSize={PAGE_SIZE} total={transactionsResult.count ?? 0} pathname={`/admin/customers/${id}/credit`} /></section></div></main>;
}

function formatNaira(kobo: number) { return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100); }
