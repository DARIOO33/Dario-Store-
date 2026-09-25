import Link from "next/link";

// The colour blocks on the home and categories pages. Colours cycle by position.
const COLORS = ["tileYellow", "tileMint", "tileLilac", "tilePink"];

type Props = {
  href: string;
  name: string;
  // The big number in the corner: how many products are on the shelf.
  count: string;
  // A line under the name (the category's description, or a fallback).
  meta?: string;
  index: number;
  // Overrides the cycling colour, e.g. the neutral "Everything" tile.
  color?: string;
};

export default function CategoryTile({ href, name, count, meta, index, color }: Props) {
  return (
    <Link href={href} className={`tile ${color ?? COLORS[index % COLORS.length]}`}>
      <span className="tileCount">{count}</span>
      <span className="tileName">{name}</span>
      {meta && <span className="tileMeta">{meta}</span>}
      <span className="tileArrow" aria-hidden="true">↗</span>
    </Link>
  );
}
