"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EditCustomerState = { error: string };

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 10 && /^[789]/.test(digits)) return `0${digits}`;
  if (digits.length === 13 && digits.startsWith("234")) return `0${digits.slice(3)}`;
  return null;
}

export async function updateCustomer(
  customerId: string,
  _state: EditCustomerState,
  formData: FormData,
): Promise<EditCustomerState> {
  const sessionClient = await createClient();
  const { data: authData } = await sessionClient.auth.getUser();
  if (!authData.user) return { error: "Your session has ended. Sign in again." };

  const { data: admin } = await sessionClient
    .from("admin_profiles")
    .select("id")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (!admin) return { error: "You do not have permission to edit customers." };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const otherNames = String(formData.get("otherNames") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const status = String(formData.get("status") ?? "active");
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (!firstName) return { error: "First name is required." };
  if (!surname) return { error: "Surname is required." };
  if (!phone) return { error: "Enter a valid Nigerian phone number." };
  if (!address) return { error: "Address is required." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!['active', 'inactive', 'suspended'].includes(status)) return { error: "Choose a valid customer status." };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Customer editing requires SUPABASE_SERVICE_ROLE_KEY." };
  }

  const { data: current } = await supabase
    .from("customers")
    .select("phone, email")
    .eq("id", customerId)
    .maybeSingle();
  if (!current) return { error: "Customer profile not found." };

  const { data: duplicate } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .neq("id", customerId)
    .maybeSingle();
  if (duplicate) return { error: "A different customer already uses this phone number." };

  const phoneChanged = current.phone !== phone;
  if (phoneChanged) {
    const { error } = await supabase.auth.admin.updateUserById(customerId, {
      email: `${phone}@customers.sw8.local`,
    });
    if (error) return { error: "Unable to update the customer's login phone number." };
  }

  const { error: updateError } = await supabase
    .from("customers")
    .update({
      phone,
      first_name: firstName,
      surname,
      other_names: otherNames || null,
      address,
      date_of_birth: dateOfBirth || null,
      email: email || null,
      status,
    })
    .eq("id", customerId);

  if (updateError) return { error: "Unable to save the customer profile." };

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin.id,
    customer_id: customerId,
    action: "customer_updated",
    entity_type: "customer",
    entity_id: customerId,
    new_data: { phone, firstName, surname, status },
  });

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${customerId}?updated=1`);
}
