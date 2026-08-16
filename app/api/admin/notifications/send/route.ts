import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/api/auth";
import { createMailTransport, getEmailFrom } from "@/lib/email/gmail";
import { buildNotificationEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

export async function POST() {
  const { supabase, user, admin } = await getAuthenticatedAdmin();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let transport;
  let from;
  try {
    transport = createMailTransport();
    from = getEmailFrom();
  } catch {
    return NextResponse.json({ error: "Gmail SMTP is not configured." }, { status: 503 });
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, recipient_email, recipient_type, subject, message, attempts")
    .in("status", ["pending", "failed"])
    .lt("attempts", 3)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Unable to load pending notifications." }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const notification of notifications ?? []) {
    if (!notification.recipient_email) {
      await supabase
        .from("notifications")
        .update({ status: "skipped", last_error: "Recipient email is missing." })
        .eq("id", notification.id);
      skipped += 1;
      continue;
    }

    try {
      await transport.sendMail({
        from,
        to: notification.recipient_email,
        subject: notification.subject,
        text: notification.message,
        html: buildNotificationEmail({
          recipientType: notification.recipient_type,
          subject: notification.subject,
          message: notification.message,
        }),
      });

      await supabase
        .from("notifications")
        .update({
          status: "sent",
          attempts: notification.attempts + 1,
          last_error: null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification.id);
      sent += 1;
    } catch (mailError) {
      const message = mailError instanceof Error ? mailError.message : "Email delivery failed.";
      await supabase
        .from("notifications")
        .update({
          status: "failed",
          attempts: notification.attempts + 1,
          last_error: message.slice(0, 1000),
        })
        .eq("id", notification.id);
      failed += 1;
    }
  }

  return NextResponse.json({
    data: {
      processed: sent + failed + skipped,
      sent,
      failed,
      skipped,
    },
  });
}
