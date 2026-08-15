import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export async function GET() {
  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, first_name, surname, other_names, phone, email, address, date_of_birth, referral_code, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to load profile." }, { status: 500 });
  }

  if (!customer) {
    return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });
  }

  return NextResponse.json({ data: customer });
}
