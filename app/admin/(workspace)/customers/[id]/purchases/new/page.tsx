import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PurchaseForm } from "./purchase-form";

export default async function NewPurchasePage({
  params,
}: PageProps<"/admin/customers/[id]/purchases/new">) {
  const { id } = await params;
  const supabase = await createClient();
  const [customerResult, creditsResult, rewardsResult] = await Promise.all([
    supabase
      .from("customers")
      .select("first_name, surname, phone, status")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("credit_transactions")
      .select("amount, transaction_type")
      .eq("customer_id", id),
    supabase
      .from("rewards")
      .select("id, reward_type, maximum_value")
      .eq("customer_id", id)
      .eq("status", "available")
      .order("unlocked_at", { ascending: true }),
  ]);

  const customer = customerResult.data;
  if (!customer) notFound();

  const creditBalance = (creditsResult.data ?? []).reduce((total, transaction) => {
    const increase =
      transaction.transaction_type === "deposit" ||
      transaction.transaction_type === "adjustment_increase";
    return total + (increase ? transaction.amount : -transaction.amount);
  }, 0);
  const rewards = (rewardsResult.data ?? []).map((reward) => ({
    id: reward.id,
    label: reward.reward_type === "loyalty_meal" ? "Meal reward" : "Referral side",
    maximumValue: reward.maximum_value,
  }));

  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href={`/admin/customers/${id}`} className="group inline-flex items-center gap-2 text-sm font-semibold text-[#b83500] hover:text-black">
          <ArrowLeft aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Back to customer
        </Link>
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#ff4800]">New purchase</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            Record purchase for {customer.first_name} {customer.surname}
          </h1>
          <p className="mt-2 text-sm text-[#686864]">{customer.phone}</p>
        </div>
        <div className="mt-7">
          <PurchaseForm customerId={id} creditBalance={creditBalance} rewards={rewards} />
        </div>
      </div>
    </main>
  );
}
