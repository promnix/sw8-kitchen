"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreateCustomerState = { error: string };

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 10 && /^[789]/.test(digits)) return `0${digits}`;
  if (digits.length === 13 && digits.startsWith("234")) return `0${digits.slice(3)}`;
  return null;
}

function customerAuthEmail(phone: string) {
  return `${phone}@customers.sw8.local`;
}

function newReferralCode() {
  return `SW8${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export async function createCustomer(
  _state: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  const sessionClient = await createClient();
  const { data: authData } = await sessionClient.auth.getUser();

  if (!authData.user) {
    return { error: "Your session has ended. Sign in again." };
  }

  const { data: admin } = await sessionClient
    .from("admin_profiles")
    .select("id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!admin) {
    return { error: "You do not have permission to create customers." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const otherNames = String(formData.get("otherNames") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const referrerCode = String(formData.get("referrerCode") ?? "").trim().toUpperCase();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (!firstName) return { error: "First name is required." };
  if (!surname) return { error: "Surname is required." };
  if (!phone) return { error: "Enter a valid Nigerian phone number." };
  if (!address) return { error: "Address is required." };

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid customer email address." };
  }

  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    return { error: "Enter a valid date of birth." };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Customer creation requires SUPABASE_SERVICE_ROLE_KEY." };
  }

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingCustomer) {
    return { error: "A customer already exists with this phone number." };
  }

  let referrerId: string | null = null;
  if (referrerCode) {
    const { data: referrer } = await supabase
      .from("customers")
      .select("id")
      .eq("referral_code", referrerCode)
      .maybeSingle();

    if (!referrer) {
      return { error: "The referral code does not belong to an existing customer." };
    }
    referrerId = referrer.id;
  }

  const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
    email: customerAuthEmail(phone),
    password: surname,
    email_confirm: true,
    user_metadata: { role: "customer", first_name: firstName, surname, phone },
  });

  if (authError || !createdUser.user) {
    return { error: authError?.message ?? "Unable to create the customer login." };
  }

  const customerId = createdUser.user.id;
  const referralCode = newReferralCode();

  const { error: customerError } = await supabase.from("customers").insert({
    id: customerId,
    phone,
    first_name: firstName,
    surname,
    other_names: otherNames || null,
    address,
    date_of_birth: dateOfBirth || null,
    email: email || null,
    referral_code: referralCode,
    created_by: admin.id,
  });

  if (customerError) {
    await supabase.auth.admin.deleteUser(customerId);
    return { error: "Unable to save the customer profile. Please try again." };
  }

  const { error: cycleError } = await supabase.from("loyalty_cycles").insert({
    customer_id: customerId,
    cycle_number: 1,
    target_amount: 15000000,
    accumulated_amount: 0,
    status: "progressing",
  });

  if (cycleError) {
    await supabase.from("customers").delete().eq("id", customerId);
    await supabase.auth.admin.deleteUser(customerId);
    return { error: "Unable to start the customer loyalty record. Please try again." };
  }

  if (referrerId) {
    const { error: referralError } = await supabase.from("referrals").insert({
      referrer_customer_id: referrerId,
      referred_customer_id: customerId,
      referral_code_used: referrerCode,
      registered_by: admin.id,
    });

    if (referralError) {
      await supabase.from("loyalty_cycles").delete().eq("customer_id", customerId);
      await supabase.from("customers").delete().eq("id", customerId);
      await supabase.auth.admin.deleteUser(customerId);
      return { error: "Unable to save the referral. Please try again." };
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/customers");
  redirect("/admin/customers?created=1");
}
