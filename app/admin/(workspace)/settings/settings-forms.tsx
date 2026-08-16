"use client";

import { useActionState } from "react";
import { updateAdminPassword, updateAdminProfile, type AdminSettingsState } from "./actions";

export function AdminProfileForm({ profile }: { profile: { full_name: string; email: string; phone: string | null } }) {
  const [state, formAction, pending] = useActionState<AdminSettingsState, FormData>(updateAdminProfile, { error: "" });

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="fullName" defaultValue={profile.full_name} required />
        <Field label="Phone number" name="phone" defaultValue={profile.phone ?? ""} required />
        <Field label="Email address" name="email" type="email" defaultValue={profile.email} required />
        <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <button type="submit" disabled={pending} className="h-11 rounded-md bg-[#ff4800] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#df3e00] disabled:cursor-wait disabled:bg-[#bd5f39]">
        {pending ? "Saving profile..." : "Save profile"}
      </button>
    </form>
  );
}

export function AdminPasswordForm() {
  const [state, formAction, pending] = useActionState<AdminSettingsState, FormData>(updateAdminPassword, { error: "" });

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" required />
        <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      <p className="text-xs text-[#777771]">Use at least 8 characters. You will remain signed in after changing it.</p>
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <button type="submit" disabled={pending} className="h-11 rounded-md border border-black bg-black px-5 text-sm font-semibold text-white transition-colors hover:bg-[#292925] disabled:cursor-wait disabled:opacity-60">
        {pending ? "Updating password..." : "Update password"}
      </button>
    </form>
  );
}

function Field({ label, name, defaultValue, type = "text", autoComplete, required = false }: { label: string; name: string; defaultValue?: string; type?: string; autoComplete?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-[#282825]">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} autoComplete={autoComplete} required={required} className="h-12 w-full rounded-md border border-[#c9c9c3] bg-white px-4 text-base text-black outline-none transition focus:border-[#ff4800] focus:ring-2 focus:ring-[#ff4800]/15" />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="border-l-4 border-[#ff4800] bg-[#fff1eb] px-4 py-3 text-sm text-[#7c2b0c]">{message}</p>;
}
