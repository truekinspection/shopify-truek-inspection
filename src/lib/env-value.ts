/**
 * Read a .env value safely: strip inline `# comments`, surrounding quotes, and trim.
 * dotenv leaves `KEY=value   # comment` intact, which breaks tokens and IDs.
 */
export function envValue(raw: string | undefined | null): string {
  if (raw == null) return "";
  const withoutComment = raw.split("#")[0] ?? "";
  return withoutComment.trim().replace(/^["']|["']$/g, "").trim();
}

/** First whitespace-delimited token of an env value (after comment strip). */
export function envFirstToken(raw: string | undefined | null): string {
  const v = envValue(raw);
  if (!v) return "";
  return (v.split(/\s+/)[0] ?? "").toLowerCase();
}
