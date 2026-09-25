import nodemailer, { type Transporter } from "nodemailer";

type Email = {
  to: string;
  subject: string;
  text: string;
  // The designed version (see email-templates.ts). Clients that can't show it use `text`.
  html?: string;
};

export type EmailResult = { sent: true } | { sent: false; reason: "not-configured" | "failed" };

// Emails go out over SMTP once these are in `.env`; until then nothing is sent.
export function emailConfigured() {
  return !!process.env.SMTP_HOST && !!process.env.MAIL_FROM;
}

let transporter: Transporter | null = null;

function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    // true for port 465; the other ports upgrade the connection themselves (STARTTLS).
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  return transporter;
}

// The one place an email leaves the app. It never throws, so a mail problem can't
// break an order or a sign-up; callers that must know (the admin's "send delivery
// email" button) read the result. Without SMTP settings the message is printed to
// the server console in development (that's where you read sign-up codes) and
// reported loudly in production.
export async function sendEmail({ to, subject, text, html }: Email): Promise<EmailResult> {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[email] to: ${to}\n[email] subject: ${subject}\n[email] ${text}\n`);
    } else {
      console.error(`[email] SMTP is not configured — "${subject}" to ${to} was NOT sent`);
    }
    return { sent: false, reason: "not-configured" };
  }

  try {
    await getTransporter().sendMail({ from: process.env.MAIL_FROM, replyTo: process.env.MAIL_REPLY_TO || undefined, to, subject, text, html });
    return { sent: true };
  } catch (error) {
    console.error(`[email] could not send "${subject}" to ${to}:`, error);
    return { sent: false, reason: "failed" };
  }
}
