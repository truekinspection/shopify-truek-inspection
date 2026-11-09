/**
 * Try to recover ClearVin report id from JSON or embedded HTML metadata.
 */
export function extractHtmlFromReportJson(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== "object") return undefined;
  const root = parsed as Record<string, unknown>;
  const candidates = [root.html, root.reportHtml, root.body];
  for (const c of candidates) {
    if (typeof c === "string" && c.includes("<")) return c;
  }
  const result = root.result;
  if (result && typeof result === "object") {
    const rec = result as Record<string, unknown>;
    const inner = [rec.html, rec.reportHtml, rec.body];
    for (const c of inner) {
      if (typeof c === "string" && c.includes("<")) return c;
    }
  }
  return undefined;
}

function isLikelyClearVinReportId(value: string): boolean {
  const id = value.trim();
  if (id.length < 5 || id.length > 32) return false;
  if (!/^[A-Z0-9]+$/i.test(id)) return false;
  // 17-char VIN, not a vendor report id.
  if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(id)) return false;
  return true;
}

function pickReportId(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && isLikelyClearVinReportId(candidate)) {
      return candidate.trim();
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      const asString = String(candidate);
      if (isLikelyClearVinReportId(asString)) return asString;
    }
  }
  return undefined;
}

/**
 * ClearVIN HTML reports hydrate "Report ID" in the browser from boot JSON.
 * That JSON is often percent-encoded inside a script/query string
 * (`reportId%22%3A%228EF51F84%22` → `"reportId":"8EF51F84"`).
 */
function decodeEmbeddedPayload(text: string): string {
  const entities = text
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:34|x22);/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(?:160|xa0);/gi, " ");
  return entities.replace(/%[0-9A-Fa-f]{2}/g, (enc) => {
    try {
      return decodeURIComponent(enc);
    } catch {
      return enc;
    }
  });
}

function extractReportIdFromText(text: string): string | undefined {
  const quoted = text.match(
    /"(?:reportId|report_id)"\s*:\s*"([^"\\]{4,64})"/i,
  );
  if (quoted?.[1] && isLikelyClearVinReportId(quoted[1])) {
    return quoted[1].trim();
  }

  // Unquoted / single-quoted JS object fields: reportId: "ABC" | reportId:'ABC' | reportId: ABC
  const jsField = text.match(
    /(?:reportId|report_id)\s*[:=]\s*["']?([A-Z0-9]{5,32})["']?/i,
  );
  if (jsField?.[1] && isLikelyClearVinReportId(jsField[1])) {
    return jsField[1].trim();
  }

  const encodedJson = text.match(
    /report(?:Id|_id)%22%3A%22([A-Z0-9]{5,32})%22/i,
  );
  if (encodedJson?.[1] && isLikelyClearVinReportId(encodedJson[1])) {
    return encodedJson[1].trim();
  }

  const labeled = text.match(/report\s*id\s*[:#]\s*([A-Z0-9]{5,32})/i);
  if (labeled?.[1] && isLikelyClearVinReportId(labeled[1])) {
    return labeled[1].trim();
  }

  // ClearVIN UI often splits label/value across tags:
  // <div>Report ID</div><div>909FF4E4</div>
  const htmlLabeled = text.match(
    /report\s*id\s*<\/[^>]+>\s*(?:<[^>]+>\s*)*([A-Z0-9]{5,32})/i,
  );
  if (htmlLabeled?.[1] && isLikelyClearVinReportId(htmlLabeled[1])) {
    return htmlLabeled[1].trim();
  }

  const htmlLabeledLoose = text.match(
    /report\s*id[\s\S]{0,120}?>([A-Z0-9]{5,32})</i,
  );
  if (htmlLabeledLoose?.[1] && isLikelyClearVinReportId(htmlLabeledLoose[1])) {
    return htmlLabeledLoose[1].trim();
  }

  const dataAttr = text.match(
    /data-(?:report[-_]?id|clearvin[-_]?report[-_]?id)\s*=\s*["']([A-Z0-9]{5,32})["']/i,
  );
  if (dataAttr?.[1] && isLikelyClearVinReportId(dataAttr[1])) {
    return dataAttr[1].trim();
  }

  const meta = text.match(
    /(?:report|data)[-_]?id\s*[=:]\s*["']?([A-Z0-9]{6,32})["']?/i,
  );
  if (meta?.[1] && isLikelyClearVinReportId(meta[1])) {
    return meta[1].trim();
  }

  // ClearVIN often uses 8-char hex report ids (e.g. 909FF4E4) near "Report".
  const hexNearReport = text.match(
    /report(?:\s*id)?[^A-Z0-9]{0,40}([A-F0-9]{8})\b/i,
  );
  if (hexNearReport?.[1] && isLikelyClearVinReportId(hexNearReport[1])) {
    return hexNearReport[1].trim().toUpperCase();
  }

  return undefined;
}

export function extractReportIdFromClearVinPayload(
  bodyText: string,
  parsedJson: unknown | null,
): string | undefined {
  if (parsedJson && typeof parsedJson === "object") {
    const root = parsedJson as Record<string, unknown>;
    if (root.status === "error") return undefined;

    const result = root.result;
    if (result && typeof result === "object") {
      const rec = result as Record<string, unknown>;
      const fromResult = pickReportId(rec.reportId, rec.report_id, rec.id);
      if (fromResult) return fromResult;
    }

    const fromRoot = pickReportId(root.reportId, root.report_id, root.id);
    if (fromRoot) return fromRoot;
  }

  const head = bodyText.slice(0, 400_000);
  const fromRaw = extractReportIdFromText(head);
  if (fromRaw) return fromRaw;

  return extractReportIdFromText(decodeEmbeddedPayload(head));
}
