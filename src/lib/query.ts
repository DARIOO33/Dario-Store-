// Builds "?a=1&b=2", leaving out anything empty — used so filter links keep
// the rest of the current filters.
export function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }

  const text = search.toString();
  return text ? `?${text}` : "";
}
