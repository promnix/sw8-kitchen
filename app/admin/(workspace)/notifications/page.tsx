"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "../admin-page-header";

type Notification = {
  id: string;
  recipient_type: "customer" | "admin";
  recipient_email: string | null;
  subject: string;
  status: "pending" | "sent" | "failed" | "skipped";
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function loadNotifications() {
    setLoading(true);
    const response = await fetch("/api/admin/notifications", { cache: "no-store" });
    const result = await response.json();
    setNotifications(response.ok ? result.data : []);
    if (!response.ok) setMessage(result.error ?? "Unable to load notifications.");
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/notifications", { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!active) return;
        setNotifications(response.ok ? result.data : []);
        if (!response.ok) setMessage(result.error ?? "Unable to load notifications.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function retryFailed() {
    setSending(true);
    setMessage("");
    const response = await fetch("/api/admin/notifications/send", { method: "POST" });
    const result = await response.json();
    if (response.ok) {
      setMessage(
        result.data.processed === 0
          ? "No failed emails were available to retry."
          : `${result.data.sent} resent, ${result.data.failed} still failed.`,
      );
      await loadNotifications();
    } else {
      setMessage(result.error ?? "Unable to send notifications.");
    }
    setSending(false);
  }

  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1280px]">
        <AdminPageHeader
          eyebrow="Notifications"
          title="Email delivery"
          description="Reward emails send automatically. Review delivery results and retry failures."
          showDate={false}
          action={<button
            type="button"
            onClick={retryFailed}
            disabled={sending || !notifications.some((notification) => notification.status === "failed")}
            className="h-11 rounded-md bg-[#ff4800] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#df3e00] disabled:bg-[#bd5f39]"
          >
            {sending ? "Retrying..." : "Retry failed emails"}
          </button>}
        />

        {message ? <p role="status" className="mt-6 border-l-4 border-[#ffb132] bg-[#fff8e8] px-4 py-3 text-sm text-[#5e4a17]">{message}</p> : null}

        <section className="mt-6 overflow-hidden rounded-lg border border-[#deded9] bg-white">
          {loading ? (
            <p className="px-6 py-14 text-center text-sm text-[#777771]">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-[#777771]">No notifications have been created.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead><tr className="border-b border-[#e8e8e3] bg-[#fafaf8] text-xs font-semibold text-[#686864]"><th className="px-6 py-3">Recipient</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Attempts</th><th className="px-4 py-3">Created</th><th className="px-6 py-3 text-right">Status</th></tr></thead>
                <tbody>{notifications.map((notification) => <tr key={notification.id} className="border-b border-[#eeeeea] last:border-0"><td className="px-6 py-4"><p className="text-sm font-semibold capitalize">{notification.recipient_type}</p><p className="mt-1 text-xs text-[#777771]">{notification.recipient_email ?? "No email"}</p></td><td className="px-4 py-4"><p className="text-sm font-medium">{notification.subject}</p>{notification.last_error ? <p className="mt-1 max-w-sm truncate text-xs text-[#b83500]" title={notification.last_error}>{notification.last_error}</p> : null}</td><td className="px-4 py-4 text-sm">{notification.attempts}</td><td className="px-4 py-4 text-sm text-[#686864]">{new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(notification.created_at))}</td><td className="px-6 py-4 text-right"><span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${notification.status === "sent" ? "bg-[#e9f7ef] text-[#006b34]" : notification.status === "failed" ? "bg-[#fff1eb] text-[#b83500]" : "bg-[#fff8e8] text-[#7a5913]"}`}>{notification.status}</span></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
