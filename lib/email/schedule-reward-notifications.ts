import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotifications } from "./send-notifications";

export function scheduleRewardNotifications(rewardIds: string[]) {
  if (rewardIds.length === 0) return;

  after(async () => {
    const supabase = createAdminClient();

    try {
      await sendNotifications({
        supabase,
        statuses: ["pending"],
        rewardIds,
      });
    } catch {
      await supabase
        .from("notifications")
        .update({
          status: "failed",
          last_error: "Automatic email delivery could not be completed.",
        })
        .in("reward_id", rewardIds)
        .eq("status", "pending");
    }
  });
}
