import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Chat photos (payment proofs) are uploaded through a server action.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};

export default nextConfig;
