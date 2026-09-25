"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProductAction, updateProductAction } from "@/src/actions/products";
import type { ProductFormInput, VariantFormInput } from "@/src/services/products";

type Props = {
  productId?: string;
  initial: ProductFormInput;
  categories: { id: string; name: string }[];
};

export default function ProductForm({ productId, initial, categories }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProductFormInput>(key: K, value: ProductFormInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const hasVariants = form.variants.length > 0;

  const setVariant = (index: number, patch: Partial<VariantFormInput>) =>
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)),
    }));

  const addVariant = () =>
    setForm((current) => ({
      ...current,
      variants: [...current.variants, { name: "", price: current.price, stock: "", imageUrl: "", active: true }],
    }));

  const removeVariant = (index: number) =>
    setForm((current) => ({ ...current, variants: current.variants.filter((_, i) => i !== index) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const result = productId ? await updateProductAction(productId, form) : await createProductAction(form);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Something went wrong saving the product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form adminForm" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="p-name">Name</label>
        <input id="p-name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>

      <div className="field">
        <label htmlFor="p-name-fr">Name in French</label>
        <input id="p-name-fr" className="input" lang="fr" value={form.nameFr} onChange={(e) => set("nameFr", e.target.value)} />
        <span className="hint">Optional. Shown to visitors browsing in French; empty means the English name is used.</span>
      </div>

      <div className="field">
        <span className="label">Type</span>
        <div className="segmented" role="radiogroup" aria-label="Product type">
          {[
            { value: "PHYSICAL", title: "Physical", hint: "Shipped to the customer — needs an address" },
            { value: "VIRTUAL", title: "Virtual", hint: "Digital — no shipping, no address" },
          ].map((option) => (
            <label key={option.value} className={form.type === option.value ? "active" : ""}>
              <input type="radio" name="type" value={option.value} checked={form.type === option.value} onChange={() => set("type", option.value)} />
              <strong>{option.title}</strong>
              <span>{option.hint}</span>
            </label>
          ))}
        </div>
      </div>

      {hasVariants ? (
        <p className="hint variantNote">Price and stock are set on each option below. The shop shows “from” the lowest active price.</p>
      ) : (
        <div className="grid2">
          <div className="field">
            <label htmlFor="p-price">Price (DT)</label>
            <input id="p-price" className="input" inputMode="decimal" placeholder="12.500" value={form.price} onChange={(e) => set("price", e.target.value)} required />
            <span className="hint">Dinars with up to 3 decimals (1 DT = 1000 millimes).</span>
          </div>
          <div className="field">
            <label htmlFor="p-stock">Stock</label>
            <input id="p-stock" className="input" inputMode="numeric" placeholder="Unlimited" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
            <span className="hint">Leave empty for unlimited (usual for digital products).</span>
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="p-category">Category</label>
        <select id="p-category" className="input" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="variantEditor">
        <legend>Options (variants)</legend>
        <p className="hint">
          Optional. Use them when one product comes in several versions — e.g. 1 month / 3 months, or different regions. Each option has its own
          price, stock and photo, and the photo appears when a customer picks it.
        </p>

        {form.variants.map((variant, index) => (
          <div key={variant.id ?? `new-${index}`} className="variantRow">
            <div className="field">
              <label htmlFor={`v-name-${index}`}>Name</label>
              <input id={`v-name-${index}`} className="input" value={variant.name} onChange={(e) => setVariant(index, { name: e.target.value })} placeholder="e.g. 3 months" />
            </div>
            <div className="field">
              <label htmlFor={`v-price-${index}`}>Price (DT)</label>
              <input id={`v-price-${index}`} className="input" inputMode="decimal" value={variant.price} onChange={(e) => setVariant(index, { price: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor={`v-stock-${index}`}>Stock</label>
              <input id={`v-stock-${index}`} className="input" inputMode="numeric" value={variant.stock} onChange={(e) => setVariant(index, { stock: e.target.value })} placeholder="Unlimited" />
            </div>
            <div className="field variantImageField">
              <label htmlFor={`v-image-${index}`}>Photo link</label>
              <input id={`v-image-${index}`} className="input" value={variant.imageUrl} onChange={(e) => setVariant(index, { imageUrl: e.target.value })} placeholder="https://… (optional)" />
            </div>
            <div className="variantRowActions">
              <label className="check">
                <input type="checkbox" checked={variant.active} onChange={(e) => setVariant(index, { active: e.target.checked })} />
                Active
              </label>
              <button type="button" className="btn btnSm btnGhost" onClick={() => removeVariant(index)}>
                Remove
              </button>
            </div>
          </div>
        ))}

        <button type="button" className="btn btnSm" onClick={addVariant}>
          + Add option
        </button>
      </fieldset>

      <div className="field">
        <label htmlFor="p-description">Description</label>
        <textarea id="p-description" className="input" value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="p-description-fr">Description in French</label>
        <textarea id="p-description-fr" className="input" lang="fr" value={form.descriptionFr} onChange={(e) => set("descriptionFr", e.target.value)} />
        <span className="hint">Optional, like the name above.</span>
      </div>

      <div className="field">
        <label htmlFor="p-images">Image links</label>
        <textarea
          id="p-images"
          className="input"
          placeholder={"https://…/front.jpg\nhttps://…/back.jpg"}
          value={form.imageUrls}
          onChange={(e) => set("imageUrls", e.target.value)}
        />
        <span className="hint">One link per line; the first is the cover. Without an image, the product gets generated artwork.</span>
      </div>

      <div className="checks">
        <label className="check">
          <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
          Featured on the storefront
        </label>
        <label className="check">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          Visible in the shop
        </label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="formActions">
        <button type="submit" className="btn btnAccent btnLg" disabled={saving}>
          {saving ? "Saving…" : productId ? "Save changes" : "Create product"}
        </button>
        <button type="button" className="btn btnGhost btnLg" onClick={() => router.push("/admin/products")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
