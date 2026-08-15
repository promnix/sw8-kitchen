import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/api/auth";

export async function GET(request: Request) {
  const { supabase, user, admin } = await getAuthenticatedAdmin();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const status = new URL(request.url).searchParams.get("status");
  let query = supabase
    .from("referrals")
    .select("id, referrer_customer_id, referred_customer_id, referral_code_used, accumulated_amount, qualifying_target_amount, status, created_at, qualified_at, rewarded_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && ["progressing", "qualified", "rewarded", "cancelled"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load referrals." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
