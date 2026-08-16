"use server";

import { redirect } from "next/navigation";
import { customerAuthEmail, customerAuthPassword } from "@/lib/auth/customer-credentials";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  error: string;
};

const initialError = "Enter the correct sign-in details and try again.";

function normalizeNigerianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("0") ? digits : null;
}

async function signIn(
  role: "customer" | "admin",
  identifier: string,
  password: string,
): Promise<SignInState> {
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return { error: "Supabase is not configured yet." };
  }

  const normalizedPhone =
    role === "customer" ? normalizeNigerianPhone(identifier) : null;

  if (role === "customer" && !normalizedPhone) {
    return { error: "Enter a valid 11-digit Nigerian phone number." };
  }

  const email =
    role === "customer"
      ? customerAuthEmail(normalizedPhone as string)
      : identifier.trim().toLowerCase();

  if (!email || !password) {
    return { error: initialError };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: initialError };
  }

  const profileTable = role === "admin" ? "admin_profiles" : "customers";
  const { data: profile } = await supabase
    .from(profileTable)
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: initialError };
  }

  redirect(role === "admin" ? "/admin/dashboard" : "/customer");
}

export async function customerSignIn(
  _state: SignInState,
  formData: FormData,
) {
  const phone = String(formData.get("identifier") ?? "");
  const surname = String(formData.get("password") ?? "");
  if (!surname.trim()) return { error: initialError };
  return signIn("customer", phone, customerAuthPassword(surname));
}

export async function adminSignIn(_state: SignInState, formData: FormData) {
  const email = String(formData.get("identifier") ?? "");
  const password = String(formData.get("password") ?? "");
  return signIn("admin", email, password);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function adminSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin");
}
