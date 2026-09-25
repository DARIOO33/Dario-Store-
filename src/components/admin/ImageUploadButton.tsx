"use client";

import { useRef, useState } from "react";
import { uploadProductImageAction } from "@/src/actions/products";
import { shrinkImage } from "@/src/components/chat/photo";

type Props = {
  label: string;
  multiple?: boolean;
  // Called with the address of each uploaded photo.
  onUploaded: (url: string) => void;
  // False when Cloudinary isn't set up: the button explains instead of uploading.
  enabled: boolean;
};

// Uploads photos to Cloudinary and hands back their address, so nobody has to paste links.
export default function ImageUploadButton({ label, multiple = false, onUploaded, enabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");

  const upload = async (files: File[]) => {
    setError("");
    setBusy(files.length);
    for (const file of files) {
      const form = new FormData();
      form.set("image", await shrinkImage(file, 2000));
      const result = await uploadProductImageAction(form);
      if (result.ok) onUploaded(result.url);
      else setError(result.error);
      setBusy((left) => left - 1);
    }
  };

  if (!enabled) {
    return <span className="hint">Photo upload needs Cloudinary: add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env, then restart.</span>;
  }

  return (
    <span className="uploadBtn">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void upload(files);
        }}
      />
      <button type="button" className="btn btnSm" onClick={() => input.current?.click()} disabled={busy > 0}>
        {busy > 0 ? `Uploading… (${busy})` : label}
      </button>
      {error && <span className="error">{error}</span>}
    </span>
  );
}
