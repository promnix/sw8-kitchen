import { createClient } from "@/lib/supabase/server";

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
    },
    {
      label: "Purchases recorded",
      value: purchasesResult.count ?? 0,
      note: "Completed purchases",
      color: "border-black",
    },
    {
      label: "Available rewards",
      value: rewardsResult.count ?? 0,
      note: "Waiting for redemption",
      color: "border-[#008d44]",
    },
    {
      label: "Open referrals",
      value: referralsResult.count ?? 0,
      note: "Progressing or qualified",
      color: "border-[#ffb132]",
    },
  ];

  const recentCustomers = recentResult.data ?? [];

  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-[#ff4800]">Overview</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Admin dashboard</h1>
            <p className="mt-2 text-sm text-[#686864]">
              Customer activity and reward status across SW8 Kitchen.
            </p>
          </div>
          <p className="text-xs font-medium text-[#777771]">
            {new Intl.DateTimeFormat("en-NG", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Summary">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className={`premium-panel border border-[#deded9] border-t-4 ${metric.color} bg-white p-5`}
            >
              <p className="text-sm font-medium text-[#666660]">{metric.label}</p>
              <p className="mt-4 text-3xl font-semibold text-black">{metric.value}</p>
              <p className="mt-2 text-xs text-[#8a8a84]">{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="mt-7 border border-[#deded9] bg-white">
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
