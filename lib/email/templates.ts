function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export function buildNotificationEmail({
  recipientType,
  subject,
  message,
}: {
  recipientType: "customer" | "admin";
  subject: string;
  message: string;
}) {
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  const eyebrow = recipientType === "admin" ? "SW8 KITCHEN · OPERATIONS" : "SW8 KITCHEN · YOUR REWARD";
  const intro = recipientType === "admin" ? "A customer milestone has been reached." : "Good news from your SW8 Kitchen account.";
  const footer = recipientType === "admin"
    ? "You are receiving this alert because you are an administrator of SW8 Kitchen."
    : "Keep enjoying your favourites. We will let you know when your next reward is ready.";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f4f0;color:#161614;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f4f0;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e3e1db;">
          <tr><td style="height:7px;background:#ff4800;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:28px 34px 20px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
              <td style="font-size:20px;font-weight:800;letter-spacing:1px;color:#161614;">SW8 <span style="color:#ff4800;">KITCHEN</span></td>
              <td align="right" style="font-size:11px;font-weight:700;letter-spacing:1px;color:#008d44;">${eyebrow}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:18px 34px 34px;background:#161614;color:#ffffff;">
            <p style="margin:0 0 14px;color:#ffb132;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${intro}</p>
            <h1 style="margin:0;font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-0.5px;">${safeSubject}</h1>
          </td></tr>
          <tr><td style="padding:32px 34px 22px;">
            <div style="border-left:4px solid #ff4800;padding:2px 0 2px 18px;color:#33332f;font-size:16px;line-height:1.65;">${safeMessage}</div>
          </td></tr>
          <tr><td style="padding:8px 34px 34px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="height:1px;background:#e9e8e3;font-size:0;">&nbsp;</td></tr></table>
            <p style="margin:20px 0 0;color:#777771;font-size:12px;line-height:1.6;">${footer}</p>
          </td></tr>
          <tr><td style="padding:20px 34px;background:#008d44;color:#ffffff;font-size:11px;line-height:1.5;">SW8 Kitchen · Made for memorable meals</td></tr>
        </table>
        <p style="margin:16px 0 0;color:#999890;font-size:11px;">This is an automated message. Please do not reply directly.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}
