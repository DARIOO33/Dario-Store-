import Link from "next/link";
import ProductArt from "@/src/components/catalog/ProductArt";

type Props = {
  title: string;
  text?: string;
  seed?: string;
  action?: { href: string; label: string };
};

export default function EmptyState({ title, text, seed = "empty", action }: Props) {
  return (
    <div className="empty">
      <div className="emptyArt">
        <ProductArt seed={seed} />
      </div>
      <h2>{title}</h2>
      {text && <p className="muted">{text}</p>}
      {action && (
        <Link href={action.href} className="btn btnPrimary btnLg">
          {action.label}
        </Link>
      )}
    </div>
  );
}
