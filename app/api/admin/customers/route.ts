import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/api/auth";

export async function GET(request: Request) {
  const { supabase, user, admin } = await getAuthenticatedAdmin();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim().toLowerCase() ?? "";
  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, surname, other_names, phone, email, referral_code, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Unable to load customers." }, { status: 500 });
  }

  const customers = (data ?? []).filter((customer) => {
    if (!query) return true;
    return [customer.first_name, customer.other_names, customer.surname, customer.phone, customer.referral_code]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return NextResponse.json({ data: customers });
}
