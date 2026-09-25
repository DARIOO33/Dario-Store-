"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategoryAction, deleteCategoryAction, renameCategoryAction, updateCategorySettingsAction } from "@/src/actions/categories";

type Category = { id: string; name: string; slug: string; blurb: string; nameFr: string; blurbFr: string; inNav: boolean; position: number; productCount: number };

function Row({ category }: { category: Category }) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [blurb, setBlurb] = useState(category.blurb);
  const [nameFr, setNameFr] = useState(category.nameFr);
  const [blurbFr, setBlurbFr] = useState(category.blurbFr);
  const [inNav, setInNav] = useState(category.inNav);
  const [position, setPosition] = useState(String(category.position));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const changed =
    name.trim() !== category.name || blurb !== category.blurb || nameFr !== category.nameFr || blurbFr !== category.blurbFr || inNav !== category.inNav || position !== String(category.position);

  const save = async () => {
    setBusy(true);
    setError("");

    if (name.trim() !== category.name) {
      const renamed = await renameCategoryAction(category.id, name);
      if (!renamed.ok) {
        setError(renamed.error);
        setBusy(false);
        return;
      }
    }

    const saved = await updateCategorySettingsAction(category.id, { blurb, nameFr, blurbFr, inNav, position: Number(position) });
    if (!saved.ok) setError(saved.error);
    else router.refresh();
    setBusy(false);
  };

  const remove = async () => {
    if (!confirm(`Delete "${category.name}"? Its products stay, uncategorised.`)) return;
    setBusy(true);
    await deleteCategoryAction(category.id);
    router.refresh();
    setBusy(false);
  };

  return (
    <li className="catRow">
      <div className="catEdit">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label={`Name of ${category.name}`} />
        <input
          className="input catOrder"
          inputMode="numeric"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          aria-label={`Menu order of ${category.name}`}
          title="Order in the menu (0 comes first)"
        />
      </div>
      <input
        className="input"
        value={blurb}
        onChange={(e) => setBlurb(e.target.value)}
        placeholder="Short description shown on the category page"
        aria-label={`Description of ${category.name}`}
        maxLength={160}
      />
      <div className="catEdit">
        <input className="input" lang="fr" value={nameFr} onChange={(e) => setNameFr(e.target.value)} placeholder="French name (optional)" aria-label={`French name of ${category.name}`} maxLength={60} />
      </div>
      <input
        className="input"
        lang="fr"
        value={blurbFr}
        onChange={(e) => setBlurbFr(e.target.value)}
        placeholder="French description (optional)"
        aria-label={`French description of ${category.name}`}
        maxLength={160}
      />
      <div className="catFoot">
        <label className="check">
          <input type="checkbox" checked={inNav} onChange={(e) => setInNav(e.target.checked)} />
          Show in the header menu
        </label>
        <span className="muted">
          /c/{category.slug} · {category.productCount} visible product{category.productCount === 1 ? "" : "s"}
        </span>
        <div className="rowActions">
          <button type="button" className="btn btnSm btnAccent" onClick={save} disabled={busy || !changed}>
            Save
          </button>
          <button type="button" className="btn btnSm btnGhost" onClick={remove} disabled={busy}>
            Delete
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </li>
  );
}

export default function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await createCategoryAction(name);
    if (!result.ok) {
      setError(result.error);
    } else {
      setName("");
      router.refresh();
    }
    setBusy(false);
  };

  return (
    <div className="catManager">
      <form className="panel catNew" onSubmit={add}>
        <h2>New category</h2>
        <div className="catEdit">
          <input className="input" placeholder="e.g. Game Accounts" value={name} onChange={(e) => setName(e.target.value)} aria-label="New category name" required />
          <button type="submit" className="btn btnAccent" disabled={busy}>
            Add
          </button>
        </div>
        <p className="hint">After adding, pin it to the header menu and give it a short description on the right.</p>
        {error && <p className="error">{error}</p>}
      </form>

      <ul className="panel catList">
        {categories.length === 0 && <li className="muted">No categories yet.</li>}
        {categories.map((category) => (
          <Row key={category.id} category={category} />
        ))}
      </ul>
    </div>
  );
}
