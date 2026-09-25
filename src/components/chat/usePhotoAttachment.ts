"use client";

import { useEffect, useState } from "react";
import { MAX_UPLOAD_BYTES, shrinkImage } from "@/src/components/chat/photo";
import { useT } from "@/src/i18n/client";

// The photo the customer is about to send: choosing it, previewing it, and
// removing it again.
export function usePhotoAttachment(setError: (message: string) => void) {
  const t = useT();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the preview URL must be created and released with the file
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    if (!file.type.startsWith("image/")) {
      setError(t("errors.photoChoose"));
      return;
    }
    const ready = await shrinkImage(file);
    if (ready.size > MAX_UPLOAD_BYTES) {
      setError(t("errors.photoTooLarge"));
      return;
    }
    setPhoto(ready);
  };

  const clear = () => {
    setPhoto(null);
    setPreview(null);
  };

  return { photo, preview, pick, clear };
}
