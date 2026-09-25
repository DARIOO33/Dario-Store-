"use client";

import Img from "@/src/components/ui/Img";
import ProductArt from "@/src/components/catalog/ProductArt";
import { useT } from "@/src/i18n/client";

type Props = {
  seed: string;
  name: string;
  images: { url: string; alt: string }[];
  // The picture to show large: a picked thumbnail, or the chosen variant's photo.
  activeUrl: string | null;
  onSelect: (url: string) => void;
};

export default function ProductGallery({ seed, name, images, activeUrl, onSelect }: Props) {
  const t = useT();
  const shown = activeUrl ?? images[0]?.url ?? null;
  const alt = images.find((image) => image.url === shown)?.alt || name;

  return (
    <div className="gallery">
      <div className="galleryMain">{shown ? <Img key={shown} src={shown} alt={alt} className="media galleryImg" /> : <ProductArt seed={seed} label={name} />}</div>

      {images.length > 1 && (
        <div className="galleryThumbs">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              className={image.url === shown ? "active" : ""}
              onClick={() => onSelect(image.url)}
              aria-label={t("product.showImage", { number: i + 1 })}
              aria-pressed={image.url === shown}
            >
              <Img src={image.url} alt="" className="media" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
