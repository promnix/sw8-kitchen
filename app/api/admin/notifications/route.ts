import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/api/auth";

export async function GET(request: Request) {
  const { supabase, user, admin } = await getAuthenticatedAdmin();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const status = new URL(request.url).searchParams.get("status");
  let query = supabase
    .from("notifications")
    .select("id, customer_id, reward_id, recipient_type, recipient_email, subject, status, attempts, last_error, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && ["pending", "sent", "failed", "skipped"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
