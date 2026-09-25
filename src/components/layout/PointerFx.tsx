"use client";

import { useEffect } from "react";

// Gives every element marked `data-tilt` a gentle 3D tilt that follows the
// pointer (the CSS reads the --rx and --ry variables set here). Mouse and pen
// only; skipped for touch and for people who prefer reduced motion.
export default function PointerFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let active: HTMLElement | null = null;

    const reset = (el: HTMLElement | null) => {
      el?.style.removeProperty("--rx");
      el?.style.removeProperty("--ry");
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      const el = (event.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (el !== active) {
        reset(active);
        active = el;
      }
      if (!el) return;

      const box = el.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;

      el.style.setProperty("--rx", `${((0.5 - y) * 9).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * 11).toFixed(2)}deg`);
    };

    const onLeave = () => {
      reset(active);
      active = null;
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
