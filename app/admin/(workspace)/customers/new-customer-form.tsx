"use client";

import { useActionState, useState } from "react";
import { createCustomer, type CreateCustomerState } from "./actions";

const initialState: CreateCustomerState = { error: "" };

type FieldName =
  | "firstName"
  | "surname"
  | "otherNames"
  | "phone"
  | "email"
  | "dateOfBirth"
  | "address"
  | "referrerCode";

const emptyForm: Record<FieldName, string> = {
  firstName: "",
  surname: "",
  otherNames: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  address: "",
  referrerCode: "",
};

export function NewCustomerForm() {
  const [state, formAction, pending] = useActionState(createCustomer, initialState);
  const [values, setValues] = useState(emptyForm);

  function updateField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <form action={formAction} className="space-y-7">
      <section className="border border-[#deded9] bg-white">
        <div className="border-b border-[#e5e5e0] px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold">Customer details</h2>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="First name" name="firstName" value={values.firstName} onChange={updateField} required />
          <Field label="Surname" name="surname" value={values.surname} onChange={updateField} required />
          <Field label="Other names" name="otherNames" value={values.otherNames} onChange={updateField} />
          <Field label="Phone number" name="phone" value={values.phone} onChange={updateField} placeholder="07058149297" inputMode="numeric" required />
          <Field label="Email address" name="email" value={values.email} onChange={updateField} type="email" placeholder="Optional" />
          <Field label="Date of birth" name="dateOfBirth" value={values.dateOfBirth} onChange={updateField} type="date" />
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-[#282825]">Address</span>
            <textarea
              name="address"
              value={values.address}
              onChange={(event) => updateField("address", event.target.value)}
              required
              rows={3}
              className="w-full resize-y border border-[#c9c9c3] bg-white px-4 py-3 text-base text-black outline-none transition focus:border-[#ff4800] focus:ring-2 focus:ring-[#ff4800]/15"
            />
          </label>
        </div>
      </section>

      <section className="border border-[#deded9] bg-white">
        <div className="border-b border-[#e5e5e0] px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold">Referral</h2>
        </div>
        <div className="p-5 sm:p-6">
          <Field label="Referrer code" name="referrerCode" value={values.referrerCode} onChange={updateField} placeholder="Optional" />
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="border-l-4 border-[#ff4800] bg-[#fff1eb] px-4 py-3 text-sm text-[#7c2b0c]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-12 bg-[#ff4800] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#df3e00] disabled:cursor-wait disabled:bg-[#bd5f39]"
      >
        {pending ? "Creating customer..." : "Create customer"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  inputMode,
  required = false,
  value,
  onChange,
}: {
  label: string;
  name: FieldName;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric";
  required?: boolean;
  value: string;
  onChange: (name: FieldName, value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-[#282825]">
        {label}{required ? " *" : ""}
      </span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        className="h-12 w-full border border-[#c9c9c3] bg-white px-4 text-base text-black outline-none transition placeholder:text-[#a5a59f] focus:border-[#ff4800] focus:ring-2 focus:ring-[#ff4800]/15"
      />
    </label>
  );
}
