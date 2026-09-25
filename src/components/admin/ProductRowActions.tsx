"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteProductAction, setProductActiveAction, setProductFeaturedAction } from "@/src/actions/products";

type Props = { id: string; name: string; featured: boolean; active: boolean };

export function FeaturedToggle({ id, name, featured }: Pick<Props, "id" | "name" | "featured">) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    setPending(true);
    await setProductFeaturedAction(id, !featured);
    router.refresh();
    setPending(false);
  };

  return (
    <button
      type="button"
      className={`star${featured ? " on" : ""}`}
      onClick={toggle}
      disabled={pending}
      aria-pressed={featured}
      aria-label={featured ? `Remove ${name} from featured` : `Feature ${name}`}
      title={featured ? "Featured — click to remove" : "Click to feature"}
    >
      {featured ? "★" : "☆"}
    </button>
  );
}

export function ActiveToggle({ id, name, active }: Pick<Props, "id" | "name" | "active">) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    setPending(true);
    await setProductActiveAction(id, !active);
    router.refresh();
    setPending(false);
  };

  return (
    <button
      type="button"
      className={`switch${active ? " on" : ""}`}
      onClick={toggle}
      disabled={pending}
      role="switch"
      aria-checked={active}
      aria-label={`${name} visible in shop`}
      title={active ? "Visible — click to hide" : "Hidden — click to show"}
    >
      <span />
    </button>
  );
}

export function RowActions({ id, name }: Pick<Props, "id" | "name">) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"? Past orders keep their own copy of it.`)) return;

    setPending(true);
    await deleteProductAction(id);
    router.refresh();
    setPending(false);
  };

  return (
    <div className="rowActions">
      <Link href={`/admin/products/${id}`} className="btn btnSm">
        Edit
      </Link>
      <button type="button" className="btn btnSm btnGhost" onClick={handleDelete} disabled={pending}>
        Delete
      </button>
    </div>
  );
}
