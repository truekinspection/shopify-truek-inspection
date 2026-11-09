/**
 * Best-effort extraction of Year / Make / Model from ClearVIN HTML reports.
 * Markup varies; callers should treat missing fields as non-fatal.
 */
export function extractVehicleSummaryFromClearVinHtml(html: string): {
  year?: string;
  make?: string;
  model?: string;
} {
  const head = html.slice(0, 320_000);

  const clean = (raw: string | undefined) => {
    if (!raw) return undefined;
    const s = raw
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    return s || undefined;
  };

  const splitYearMakeModel = (text: string) => {
    const t = clean(text);
    if (!t) return {};
    const leadingYear = t.match(/^(\d{4})\s+(.+)$/);
    if (!leadingYear) return {};
    const afterYear = leadingYear[2].split(/\s*[-|–]\s*/)[0].trim();
    const parts = afterYear.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { year: leadingYear[1] };
    if (parts.length === 1) return { year: leadingYear[1], make: parts[0] };
    return {
      year: leadingYear[1],
      make: parts[0],
      model: parts.slice(1).join(" "),
    };
  };

  // Open Graph title
  const og =
    head.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    head.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (og?.[1]) {
    const parsed = splitYearMakeModel(og[1]);
    if (parsed.year || parsed.make) return parsed;
  }

  // Document title
  const tit = head.match(/<title[^>]*>\s*([^<]+)<\/title>/i);
  if (tit?.[1]) {
    const parsed = splitYearMakeModel(tit[1]);
    if (parsed.year || parsed.make) return parsed;
  }

  // Table-style "Label ... Value" (common in vendor HTML)
  const afterLabel = (label: string) => {
    const re = new RegExp(
      `${label}\\s*</[^>]+>\\s*<[^>]+>\\s*([^<]{1,80})`,
      "i",
    );
    const m = head.match(re);
    return clean(m?.[1]);
  };

  const year =
    afterLabel("Model\\s*Year") ||
    afterLabel("Year") ||
    afterLabel("Model year");
  const make = afterLabel("Make") || afterLabel("Manufacturer");
  const model = afterLabel("Model");

  if (year || make || model) {
    return { year, make, model };
  }

  return {};
}
