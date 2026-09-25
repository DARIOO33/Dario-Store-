import type { NextConfig } from "next";

// Sent with every page. Kept to headers that can't break the shop (product photos may come from any
// https address, so there is no strict content policy for images).
const securityHeaders = [
  // No other site may show this one inside a frame (stops click-jacking on checkout and admin).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Browsers only honour this over https: once the site is on https it stays on https.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Chat photos (payment proofs) are uploaded through a server action.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
