import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function fullName(customer: {
  first_name: string;
  surname: string;
  other_names: string | null;
}) {
  return [customer.first_name, customer.other_names, customer.surname]
    .filter(Boolean)
    .join(" ");
}

export default async function CustomersPage({
  searchParams,
}: PageProps<"/admin/customers">) {
  const { query, created } = await searchParams;
  const search = typeof query === "string" ? query.trim().toLowerCase() : "";
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, first_name, surname, other_names, phone, email, referral_code, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const customers = (data ?? []).filter((customer) => {
    if (!search) return true;
    return [fullName(customer), customer.phone, customer.referral_code]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-[#ff4800]">Customers</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Customer directory</h1>
            <p className="mt-2 text-sm text-[#686864]">Search and manage customer accounts.</p>
          </div>
          <Link
            href="/admin/customers/new"
            className="inline-flex h-11 items-center justify-center bg-[#ff4800] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#df3e00]"
          >
            Add customer
          </Link>
        </div>

        {created === "1" ? (
          <p role="status" className="mt-6 border-l-4 border-[#008d44] bg-[#e9f7ef] px-4 py-3 text-sm text-[#006b34]">
            Customer created. Their phone number and surname are ready for sign-in.
          </p>
        ) : null}

        <section className="mt-7 border border-[#deded9] bg-white">
          <form className="border-b border-[#e5e5e0] p-4 sm:p-5">
            <label className="block max-w-md">
              <span className="sr-only">Search customers</span>
              <input
                type="search"
                name="query"
                defaultValue={search}
                placeholder="Search by name, phone number, or referral code"
                className="h-11 w-full border border-[#c9c9c3] bg-white px-4 text-sm text-black outline-none transition placeholder:text-[#92928c] focus:border-[#ff4800] focus:ring-2 focus:ring-[#ff4800]/15"
              />
            </label>
          </form>

          {customers.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-black">No customers found</p>
              <p className="mt-1 text-sm text-[#777771]">Create a customer profile to begin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e8e8e3] bg-[#fafaf8] text-xs font-semibold text-[#686864]">
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Referral code</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-[#eeeeea] last:border-0">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="text-sm font-semibold text-black hover:text-[#b83500]"
                        >
                          {fullName(customer)}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#454541]">{customer.phone}</td>
                      <td className="px-4 py-4">
                        <span className="bg-[#fff0e9] px-2.5 py-1 font-mono text-xs font-semibold text-[#b83500]">
                          {customer.referral_code}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#686864]">{customer.email ?? "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="bg-[#e9f7ef] px-2.5 py-1 text-xs font-semibold capitalize text-[#006b34]">
                          {customer.status}
                        </span>
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
