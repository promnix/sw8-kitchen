import nodemailer from "nodemailer";

export function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure = process.env.SMTP_SECURE !== "false";
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!host || !Number.isInteger(port) || !user || !password) {
    throw new Error("Gmail SMTP is not configured.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
  });
}

export function getEmailFrom() {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not configured.");
  return from;
}
