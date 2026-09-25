import { AVAILABLE_ONLINE_METHODS } from "./payments";
import { cloudinaryConfigured } from "./cloudinary";
import { emailConfigured } from "./email";
import { chatEncryptionEnabled } from "./crypto";
import { CONTACT } from "./store";

type Check = { ok: boolean; label: string; fix: string };

// What must be set before taking real orders. Printed when the server starts (src/instrumentation.ts)
// and runnable any time with `npm run check:ready`.
export function readinessChecks(): Check[] {
  const url = process.env.BETTER_AUTH_URL ?? "";
  let key = false;
  try {
    key = chatEncryptionEnabled();
  } catch {
    key = false;
  }

  return [
    { ok: !!process.env.DATABASE_URL, label: "Database", fix: "Set DATABASE_URL." },
    { ok: (process.env.BETTER_AUTH_SECRET ?? "").length >= 32, label: "Login secret", fix: "Set BETTER_AUTH_SECRET to a long random value (openssl rand -base64 32)." },
    { ok: url.startsWith("https://"), label: "Public address", fix: `BETTER_AUTH_URL is "${url || "empty"}": set it to https://your-domain (logins, email links and the sitemap use it).` },
    { ok: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET, label: "Google sign-in", fix: "Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, and add https://your-domain/api/auth/callback/google in Google Cloud." },
    { ok: key, label: "Chat encryption", fix: "Set CHAT_ENCRYPTION_KEY (32 bytes, base64) — the SAME key as before, or old chats become unreadable." },
    { ok: emailConfigured(), label: "Email (SMTP)", fix: "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM — without it no sign-up codes or order emails are sent." },
    { ok: cloudinaryConfigured(), label: "Images (Cloudinary)", fix: "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET." },
    { ok: AVAILABLE_ONLINE_METHODS.length >= 1, label: `Payment methods (${AVAILABLE_ONLINE_METHODS.join(", ") || "none"})`, fix: "Fill in real account details in src/lib/payments.ts; methods with example values are hidden." },
    { ok: !!(CONTACT.instagram || CONTACT.whatsapp || CONTACT.email), label: "Contact channels", fix: "Fill CONTACT in src/lib/store.ts." },
  ];
}

export function printReadiness() {
  const checks = readinessChecks();
  const missing = checks.filter((check) => !check.ok);
  console.log(`\n[ready] Launch checklist: ${checks.length - missing.length}/${checks.length} OK`);
  for (const check of checks) console.log(`[ready] ${check.ok ? "OK  " : "WARN"} ${check.label}${check.ok ? "" : ` — ${check.fix}`}`);
  console.log("");
}
