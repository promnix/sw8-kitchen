import Link from "next/link";
import { NewCustomerForm } from "../new-customer-form";

export default function NewCustomerPage() {
  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/customers" className="text-sm font-semibold text-[#b83500] hover:text-black">
          Back to customers
        </Link>
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#ff4800]">New customer</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Create customer account</h1>
          <p className="mt-2 text-sm text-[#686864]">
            The customer will sign in with their phone number and surname.
          </p>
        </div>
        <div className="mt-7">
          <NewCustomerForm />
        </div>
      </div>
    </main>
  );
}
