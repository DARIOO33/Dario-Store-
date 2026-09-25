// Filled and empty stars as text (the shop uses no icon library). Rounds to
// the nearest whole star; the exact number is shown next to it where it matters.
// `label` is the screen-reader text ("4.5 out of 5 stars"), translated by the caller.
export default function Stars({ value, label }: { value: number; label: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <span className="stars" role="img" aria-label={label}>
      {"★".repeat(filled)}
      <span className="starsOff">{"★".repeat(5 - filled)}</span>
    </span>
  );
}
