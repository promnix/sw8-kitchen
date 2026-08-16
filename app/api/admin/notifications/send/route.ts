import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/api/auth";
import { sendNotifications } from "@/lib/email/send-notifications";

export const runtime = "nodejs";

export async function POST() {
  const { supabase, user, admin } = await getAuthenticatedAdmin();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let result;
  try {
    result = await sendNotifications({
      supabase,
      statuses: ["failed"],
      maxAttempts: null,
    });
  } catch {
    return NextResponse.json({ error: "Unable to retry failed notifications." }, { status: 500 });
  }

  return NextResponse.json({
    data: result,
  });
}
