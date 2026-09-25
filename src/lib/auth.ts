import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { Pool } from "pg";
import "dotenv/config";
import { sendEmail } from "./email";
import { verificationCodeEmail } from "./email-templates";
import { getLocale } from "../i18n/server";

const database = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database,

  // The site's public address: BETTER_AUTH_URL in production (https://your-domain), localhost in development.
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000/",

  // Email + password. Signing in is blocked until the email is verified, and
  // verification is done with a 6-digit OTP (see the emailOTP plugin below)
  // rather than a clickable link.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },

  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 60 * 5,
      allowedAttempts: 5,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }) {
        // Not awaited on purpose: waiting on the mail server would make
        // "this email exists" observable through response timing.
        void getLocale()
          .catch(() => "en" as const)
          .then((locale) => sendEmail({ to: email, ...verificationCodeEmail({ locale, code: otp, type }) }));
      },
    }),
  ],

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "MEMBER",
        input: false,
      },
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});