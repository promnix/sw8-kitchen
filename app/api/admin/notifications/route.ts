import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/api/auth";

export async function GET(request: Request) {
  const { supabase, user, admin } = await getAuthenticatedAdmin();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const searchParams = new URL(request.url).searchParams;
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = 20;
  let query = supabase
    .from("notifications")
    .select("id, customer_id, reward_id, recipient_type, recipient_email, subject, status, attempts, last_error, sent_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (status && ["pending", "sent", "failed", "skipped"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  return NextResponse.json({ data: { items: data ?? [], total: count ?? 0, page, pageSize } });
}
