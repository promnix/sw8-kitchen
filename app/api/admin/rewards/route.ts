import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/api/auth";

export async function GET(request: Request) {
  const { supabase, user, admin } = await getAuthenticatedAdmin();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const status = new URL(request.url).searchParams.get("status");
  let query = supabase
    .from("rewards")
    .select("id, customer_id, reward_type, status, maximum_value, unlocked_at, redeemed_at, redeemed_purchase_id")
    .order("unlocked_at", { ascending: false })
    .limit(200);
  if (status && ["available", "redeemed", "expired", "cancelled"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load rewards." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
