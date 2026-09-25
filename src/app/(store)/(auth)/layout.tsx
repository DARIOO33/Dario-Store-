import type { Metadata } from "next";

// Log-in and sign-up pages have nothing to find in search results.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
