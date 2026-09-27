"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { loadMetaPixel, pixel } from "@/src/lib/meta-pixel";

// Loads the Meta Pixel once and counts a page view on every page change (the admin area is not tracked).
// Rendered by the root layout in production builds only.
export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    loadMetaPixel(pixelId);
    pixel.pageView();
  }, [pathname, pixelId]);

  return null;
}
