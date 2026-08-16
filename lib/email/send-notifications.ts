import type { SupabaseClient } from "@supabase/supabase-js";
import { createMailTransport, getEmailFrom } from "./gmail";
import { buildNotificationEmail } from "./templates";

type NotificationStatus = "pending" | "failed";

export async function sendNotifications({
  supabase,
  statuses,
  rewardIds,
  limit = 20,
  maxAttempts = 3,
}: {
  supabase: SupabaseClient;
  statuses: NotificationStatus[];
  rewardIds?: string[];
  limit?: number;
  maxAttempts?: number | null;
}) {
  if (rewardIds && rewardIds.length === 0) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  let query = supabase
    .from("notifications")
    .select("id, recipient_email, recipient_type, subject, message, attempts")
    .in("status", statuses)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (maxAttempts !== null) query = query.lt("attempts", maxAttempts);
  if (rewardIds) query = query.in("reward_id", rewardIds);

  const { data: notifications, error } = await query;
  if (error) throw new Error("Unable to load notifications for delivery.");

  let transport;
  let from;
  let configurationError: string | null = null;
  try {
    transport = createMailTransport();
    from = getEmailFrom();
  } catch (error) {
    configurationError = error instanceof Error ? error.message : "Email delivery is not configured.";
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

    if (configurationError || !transport || !from) {
      await markFailed(supabase, notification.id, notification.attempts, configurationError ?? "Email delivery is not configured.");
      failed += 1;
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email delivery failed.";
      await markFailed(supabase, notification.id, notification.attempts, message);
      failed += 1;
    }
  }

  return { processed: sent + failed + skipped, sent, failed, skipped };
}

async function markFailed(
  supabase: SupabaseClient,
  notificationId: string,
  attempts: number,
  message: string,
) {
  await supabase
    .from("notifications")
    .update({
      status: "failed",
      attempts: attempts + 1,
      last_error: message.slice(0, 1000),
    })
    .eq("id", notificationId);
}
