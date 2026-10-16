export type DeepLink = { kind: "school" | "mission"; id: number };
export function readDeepLink(search: string): DeepLink | null {
  const params = new URLSearchParams(search);
  const kind = params.has("school") ? "school" : "mission";
  const value = params.get(kind);
  if (
    !value ||
    !/^\d+$/.test(value) ||
    (params.has("school") && params.has("mission"))
  )
    return null;
  const id = Number(value);
  return id >= 1 && id <= (kind === "school" ? 6 : 10) ? { kind, id } : null;
}
export function writeDeepLink(link: DeepLink | null) {
  const url = new URL(window.location.href);
  url.searchParams.delete("school");
  url.searchParams.delete("mission");
  if (link) url.searchParams.set(link.kind, String(link.id));
  window.history.replaceState(null, "", url);
}
