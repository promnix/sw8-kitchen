import { createClient } from "@/lib/supabase/server";
import { Gift, Network, ShoppingBag, Users } from "lucide-react";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function customerName(customer: {
  first_name: string;
  surname: string;
  other_names: string | null;
}) {
  return [customer.first_name, customer.other_names, customer.surname]
    .filter(Boolean)
    .join(" ");
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [customersResult, purchasesResult, rewardsResult, referralsResult, recentResult] =
    await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("rewards")
        .select("id", { count: "exact", head: true })
        .eq("status", "available"),
      supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .in("status", ["progressing", "qualified"]),
      supabase
        .from("customers")
        .select("id, first_name, surname, other_names, phone, status, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const metrics = [
    {
      label: "Total customers",
      value: customersResult.count ?? 0,
      note: "Registered profiles",
      color: "border-[#ff4800]",
      icon: Users,
    },
    {
      label: "Purchases recorded",
      value: purchasesResult.count ?? 0,
      note: "Completed purchases",
      color: "border-black",
      icon: ShoppingBag,
    },
    {
      label: "Available rewards",
      value: rewardsResult.count ?? 0,
      note: "Waiting for redemption",
      color: "border-[#008d44]",
      icon: Gift,
    },
    {
      label: "Open referrals",
      value: referralsResult.count ?? 0,
      note: "Progressing or qualified",
      color: "border-[#ffb132]",
      icon: Network,
    },
  ];

  const recentCustomers = recentResult.data ?? [];

  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1280px]">
        <section className="relative overflow-hidden rounded-lg bg-black px-6 py-7 text-white sm:flex sm:items-end sm:justify-between sm:gap-8 sm:px-8 sm:py-8">
          <span className="absolute inset-y-0 left-0 w-1.5 bg-[#ff4800]" />
          <div>
            <p className="text-sm font-semibold text-[#ffb132]">Overview</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Admin dashboard</h1>
            <p className="mt-2 text-sm text-white/55">
              Customer activity and reward status across SW8 Kitchen.
            </p>
          </div>
          <p className="mt-5 text-xs font-medium text-white/50 sm:mt-0 sm:text-right">
            {new Intl.DateTimeFormat("en-NG", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Summary">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className={`premium-panel rounded-lg border border-[#deded9] border-t-4 ${metric.color} bg-white p-5`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-[#666660]">{metric.label}</p>
                <span className="grid size-9 place-items-center rounded-md bg-[#f5f5f2] text-black">
                  <metric.icon className="size-4" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-black">{metric.value}</p>
              <p className="mt-2 text-xs text-[#8a8a84]">{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="mt-7 rounded-lg border border-[#deded9] bg-white shadow-[0_10px_30px_rgb(0_0_0_/_4%)]">
          <div className="flex items-center justify-between border-b border-[#e4e4df] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold">Recent customers</h2>
              <p className="mt-1 text-xs text-[#777771]">Latest customer profiles added</p>
            </div>
            <span className="bg-[#fff0e9] px-2.5 py-1 text-xs font-semibold text-[#b83500]">
              {customersResult.count ?? 0} total
            </span>
          </div>

          {recentCustomers.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-black">No customers yet</p>
              <p className="mt-1 text-sm text-[#777771]">
                New customer profiles will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e8e8e3] bg-[#fafaf8] text-xs font-semibold text-[#686864]">
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-4 py-3">Phone number</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Date added</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-[#eeeeea] transition-colors hover:bg-[#fff8f4] last:border-0">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-black">{customerName(customer)}</p>
                        <p className="mt-1 text-xs text-[#8a8a84]">Customer profile</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#454541]">{customer.phone}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold capitalize ${
                            customer.status === "active"
                              ? "bg-[#e9f7ef] text-[#006b34]"
                              : "bg-[#eeeeea] text-[#5f5f5a]"
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-[#686864]">
                        {formatDate(customer.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
