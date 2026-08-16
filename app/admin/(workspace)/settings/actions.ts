"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminSettingsState = { error: string };

function validatePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 10 && /^[789]/.test(digits)) return `0${digits}`;
  if (digits.length === 13 && digits.startsWith("234")) return `0${digits.slice(3)}`;
  return null;
}

async function getAdminContext() {
  const sessionClient = await createClient();
  const { data: authData } = await sessionClient.auth.getUser();
  if (!authData.user || !authData.user.email) return null;

  const { data: admin } = await sessionClient
    .from("admin_profiles")
    .select("id, email")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (!admin) return null;

  return { sessionClient, user: authData.user, admin, userEmail: authData.user.email };
}

async function verifyCurrentPassword(email: string, password: string) {
  if (!password) return false;
  const verificationClient = await createClient();
  const { error } = await verificationClient.auth.signInWithPassword({ email, password });
  return !error;
}

export async function updateAdminProfile(
  _state: AdminSettingsState,
  formData: FormData,
): Promise<AdminSettingsState> {
  const context = await getAdminContext();
  if (!context) return { error: "Your session has ended. Sign in again." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = validatePhone(String(formData.get("phone") ?? ""));
  const currentPassword = String(formData.get("currentPassword") ?? "");

  if (!fullName) return { error: "Enter your full name." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!phone) return { error: "Enter a valid Nigerian phone number." };
  if (!(await verifyCurrentPassword(context.userEmail, currentPassword))) {
    return { error: "Your current password is incorrect." };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    return { error: "Settings require SUPABASE_SERVICE_ROLE_KEY." };
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(context.user.id, {
    email,
    email_confirm: true,
    user_metadata: { ...context.user.user_metadata, full_name: fullName, phone },
  });
  if (authError) return { error: authError.message };

  const { error: profileError } = await adminClient
    .from("admin_profiles")
    .update({ full_name: fullName, email, phone })
    .eq("id", context.user.id);
  if (profileError) return { error: "Unable to save your administrator profile." };

  revalidatePath("/admin/settings");
  redirect("/admin/settings?updated=profile");
}

export async function updateAdminPassword(
  _state: AdminSettingsState,
  formData: FormData,
): Promise<AdminSettingsState> {
  const context = await getAdminContext();
  if (!context) return { error: "Your session has ended. Sign in again." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!(await verifyCurrentPassword(context.userEmail, currentPassword))) {
    return { error: "Your current password is incorrect." };
  }
  if (newPassword.length < 8) return { error: "Your new password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "The new passwords do not match." };
  if (newPassword === currentPassword) return { error: "Choose a password different from your current one." };

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    return { error: "Settings require SUPABASE_SERVICE_ROLE_KEY." };
  }

  const { error } = await adminClient.auth.admin.updateUserById(context.user.id, { password: newPassword });
  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  redirect("/admin/settings?updated=password");
}
