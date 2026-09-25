import Img from "@/src/components/ui/Img";
import ProductArt from "@/src/components/catalog/ProductArt";

// A real photo when there is one, otherwise generated artwork (which also
// uses the product's name when it's given).
export default function ProductMedia({ imageUrl, seed, alt, label }: { imageUrl: string | null; seed: string; alt: string; label?: string }) {
  return imageUrl ? <Img src={imageUrl} alt={alt} className="media" /> : <ProductArt seed={seed} label={label} />;
}
