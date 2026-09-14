export function isDeveloperModeEnabled(search: string): boolean {
  return new URLSearchParams(search).get("developer") === "1";
}
