import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditCustomerForm } from "./edit-customer-form";

export default async function EditCustomerPage({ params }: PageProps<"/admin/customers/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("first_name, surname, other_names, phone, email, address, date_of_birth, status").eq("id", id).maybeSingle();
  if (!customer) notFound();
  return <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10"><div className="mx-auto max-w-3xl"><Link href={`/admin/customers/${id}`} className="text-sm font-semibold text-[#b83500]">Back to customer</Link><div className="mt-5"><p className="text-sm font-semibold text-[#ff4800]">Edit customer</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Update customer profile</h1></div><div className="mt-7"><EditCustomerForm customerId={id} customer={customer} /></div></div></main>;
}
