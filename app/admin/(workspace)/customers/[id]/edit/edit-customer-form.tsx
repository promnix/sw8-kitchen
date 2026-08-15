"use client";

import { useActionState, useState } from "react";
import { updateCustomer, type EditCustomerState } from "./actions";

export function EditCustomerForm({ customerId, customer }: { customerId: string; customer: {
  first_name: string; surname: string; other_names: string | null; phone: string; email: string | null; address: string; date_of_birth: string | null; status: string;
} }) {
  const action = updateCustomer.bind(null, customerId);
  const [state, formAction, pending] = useActionState<EditCustomerState, FormData>(action, { error: "" });
  const [values, setValues] = useState({
    firstName: customer.first_name,
    surname: customer.surname,
    otherNames: customer.other_names ?? "",
    phone: customer.phone,
    email: customer.email ?? "",
    address: customer.address,
    dateOfBirth: customer.date_of_birth ?? "",
    status: customer.status,
  });
  const set = (name: keyof typeof values, value: string) => setValues((current) => ({ ...current, [name]: value }));

  return (
    <form action={formAction} className="space-y-7">
      <section className="border border-[#deded9] bg-white p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" name="firstName" value={values.firstName} set={set} required />
          <Field label="Surname" name="surname" value={values.surname} set={set} required />
          <Field label="Other names" name="otherNames" value={values.otherNames} set={set} />
          <Field label="Phone number" name="phone" value={values.phone} set={set} required />
          <Field label="Email address" name="email" value={values.email} set={set} type="email" />
          <Field label="Date of birth" name="dateOfBirth" value={values.dateOfBirth} set={set} type="date" />
          <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium">Address *</span><textarea name="address" value={values.address} onChange={(e) => set("address", e.target.value)} rows={3} required className="w-full border border-[#c9c9c3] px-4 py-3 outline-none focus:border-[#ff4800]" /></label>
          <label><span className="mb-2 block text-sm font-medium">Status</span><select name="status" value={values.status} onChange={(e) => set("status", e.target.value)} className="h-12 w-full border border-[#c9c9c3] bg-white px-4 outline-none focus:border-[#ff4800]"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label>
        </div>
      </section>
      {state.error ? <p role="alert" className="border-l-4 border-[#ff4800] bg-[#fff1eb] px-4 py-3 text-sm text-[#7c2b0c]">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="h-12 bg-[#ff4800] px-6 text-sm font-semibold text-white disabled:bg-[#bd5f39]">{pending ? "Saving changes..." : "Save changes"}</button>
    </form>
  );
}

function Field({ label, name, value, set, type = "text", required = false }: { label: string; name: keyof ReturnType<typeof getValues>; value: string; set: (name: keyof ReturnType<typeof getValues>, value: string) => void; type?: string; required?: boolean }) {
  return <label><span className="mb-2 block text-sm font-medium">{label}{required ? " *" : ""}</span><input name={name} value={value} onChange={(e) => set(name, e.target.value)} type={type} required={required} className="h-12 w-full border border-[#c9c9c3] px-4 outline-none focus:border-[#ff4800]" /></label>;
}

function getValues() { return { firstName: "", surname: "", otherNames: "", phone: "", email: "", address: "", dateOfBirth: "", status: "" }; }
