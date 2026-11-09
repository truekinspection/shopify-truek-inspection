import { escapeHtml } from "./escape-html";

/** Primary brand green (matches Tailwind `custom_red` / site accent). */
const BRAND = "#06c668";
const BRAND_HOVER = "#059954";
/** Footer / secondary links — green family only (no blue). */
const ACCENT = "#34d399";
const FOOTER_BG = "#1a1a1a";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

function emailShell(params: {
  title: string;
  preheader?: string;
  bodyHtml: string;
}): string {
  const pre = params.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(params.preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
${pre}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:${BRAND};padding:20px 24px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">TrueK Inspection</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;">${escapeHtml(params.title)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 32px;color:#111827;font-size:15px;line-height:1.6;">
            ${params.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:${FOOTER_BG};padding:16px 24px;text-align:center;font-size:12px;color:#9ca3af;line-height:1.5;">
            © ${new Date().getFullYear()} TrueK Inspection · Certified vehicle history reports<br/>
            <a href="https://www.truekinspection.com" style="color:${ACCENT};text-decoration:none;">truekinspection.com</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;">
<tr><td style="border-radius:8px;background:${BRAND};">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-weight:700;color:#ffffff;text-decoration:none;font-size:15px;border-radius:8px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function summaryTable(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (r) => `<tr>
<td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-weight:600;color:${MUTED};width:38%;">${escapeHtml(r.label)}</td>
<td style="padding:10px 12px;border-bottom:1px solid ${BORDER};color:#111827;">${escapeHtml(r.value)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:16px 0;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
${rowsHtml}</table>`;
}

export function buildPaymentSuccessEmailHtml(params: {
  customerName: string;
  orderId: string;
  amountDisplay: string;
  currency: string;
  vin: string;
  /** When true, copy for OWNER_EMAIL — internal notification. */
  forOwner?: boolean;
  customerEmail?: string;
}): string {
  const forOwner = params.forOwner === true;
  const name = escapeHtml(params.customerName.trim() || "there");
  const rows: { label: string; value: string }[] = forOwner
    ? [
        { label: "Customer", value: params.customerName.trim() || "—" },
        ...(params.customerEmail?.trim()
          ? [{ label: "Customer email", value: params.customerEmail.trim() }]
          : []),
        { label: "Order reference", value: params.orderId || "—" },
        {
          label: "Amount",
          value: `${params.amountDisplay} ${params.currency}`.trim(),
        },
        { label: "VIN", value: params.vin },
      ]
    : [
        { label: "Order reference", value: params.orderId || "—" },
        {
          label: "Amount",
          value: `${params.amountDisplay} ${params.currency}`.trim(),
        },
        { label: "VIN", value: params.vin },
      ];
  const body = forOwner
    ? `
<p style="margin:0 0 16px;">Hi,</p>
<p style="margin:0 0 16px;">A customer just <strong>completed payment</strong> on TrueK Inspection. Summary below.</p>
${summaryTable(rows)}
`
    : `
<p style="margin:0 0 16px;">Hi ${name},</p>
<p style="margin:0 0 16px;">Thank you — <strong>we’ve received your payment</strong>. Your order is confirmed and your full vehicle history report is being prepared for delivery.</p>
${summaryTable(rows)}
<p style="margin:16px 0 0;color:${MUTED};font-size:14px;">You’ll receive a separate email with a secure link to open your report. You can also open it from the confirmation screen after checkout.</p>
<p style="margin:20px 0 0;font-size:14px;color:${MUTED};">Questions? Reply to this email or contact us at <a href="mailto:contact@truekinspection.com" style="color:${BRAND};font-weight:600;">contact@truekinspection.com</a>.</p>
`;
  return emailShell({
    title: forOwner ? "New payment (team copy)" : "Payment received",
    preheader: forOwner
      ? `Payment: ${params.vin}`
      : `Payment confirmed for VIN ${params.vin}`,
    bodyHtml: body,
  });
}

export function buildReportRequestEmailHtml(params: {
  customerName: string;
  email: string;
  phoneNumber?: string | null;
  vin: string;
  forOwner?: boolean;
}): string {
  const forOwner = params.forOwner === true;
  const name = escapeHtml(params.customerName.trim() || "there");
  const phoneDisplay =
    typeof params.phoneNumber === "string" && params.phoneNumber.trim()
      ? params.phoneNumber.trim()
      : "—";
  const tableRows: { label: string; value: string }[] = [
    { label: "Name", value: params.customerName.trim() || "—" },
    { label: "Email", value: params.email.trim() || "—" },
    { label: "Phone Number", value: phoneDisplay },
    { label: "VIN", value: params.vin },
  ];
  const body = forOwner
    ? `
<p style="margin:0 0 16px;">Hi,</p>
<p style="margin:0 0 16px;">A new <strong>vehicle history report</strong> request was submitted. Details below.</p>
${summaryTable(tableRows)}
<p style="margin:20px 0 0;font-size:14px;color:${MUTED};">A payment attempt should follow this request.</p>
`
    : `
<p style="margin:0 0 16px;">Hello <strong>${name}</strong>,</p>
<p style="margin:0 0 16px;">We have received your request for a car inspection report. Our team is processing it now.</p>
${summaryTable(tableRows)}
<p style="margin:16px 0 0;">Next, you will verify your VIN and can unlock the full report on our secure checkout page.</p>
`;
  return emailShell({
    title: forOwner
      ? "New inspection request"
      : "TrueK Car Inspection Report Request",
    preheader: forOwner
      ? `New request for VIN ${params.vin}`
      : `We received your request for VIN ${params.vin}`,
    bodyHtml: body,
  });
}

export function buildReportDeliveryEmailHtml(params: {
  customerName: string;
  reportUrl: string;
  vin: string;
  /** ClearVIN report id for this order (when returned by the vendor). */
  reportId?: string | null;
  /** Shopify order / transaction id. */
  transactionId?: string | null;
  customerEmail?: string;
  phoneNumber?: string | null;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  forOwner?: boolean;
}): string {
  const forOwner = params.forOwner === true;
  const name = escapeHtml(params.customerName.trim() || "there");
  const reportIdDisplay =
    typeof params.reportId === "string" && params.reportId.trim()
      ? params.reportId.trim()
      : "—";
  const transactionDisplay =
    typeof params.transactionId === "string" && params.transactionId.trim()
      ? params.transactionId.trim()
      : "—";
  const emailDisplay = params.customerEmail?.trim() || "—";
  const phoneDisplay =
    typeof params.phoneNumber === "string" && params.phoneNumber.trim()
      ? params.phoneNumber.trim()
      : "—";
  const linkValidityCopy = "30 days";
  const vehicleBits = [
    params.vehicleYear,
    params.vehicleMake,
    params.vehicleModel,
  ]
    .filter(Boolean)
    .join(" ");
  const tableRows: { label: string; value: string }[] = [
    { label: "Name", value: params.customerName.trim() || "—" },
    { label: "Email", value: emailDisplay },
    { label: "Phone Number", value: phoneDisplay },
    { label: "VIN", value: params.vin },
    ...(vehicleBits
      ? [{ label: "Year / Make / Model", value: vehicleBits }]
      : []),
    { label: "Shopify Order ID", value: transactionDisplay },
    { label: "ClearVIN Report ID", value: reportIdDisplay },
    { label: "Link valid for", value: linkValidityCopy },
  ];
  const body = forOwner
    ? `
<p style="margin:0 0 16px;">Hi,</p>
<p style="margin:0 0 16px;">A customer completed payment and their <strong>vehicle history report</strong> is ready. Summary below.</p>
${summaryTable(tableRows)}
${ctaButton(params.reportUrl, "View Vehicle Report")}
<p style="margin:16px 0 0;font-size:13px;color:${MUTED};word-break:break-all;">Direct report URL:<br/><a href="${params.reportUrl}" style="color:${BRAND_HOVER};">${escapeHtml(params.reportUrl)}</a></p>
<p style="margin:20px 0 0;font-size:13px;color:${MUTED};">Report data is provided by licensed sources including ClearVIN.</p>
`
    : `
<p style="margin:0 0 16px;">Hi ${name},</p>
<p style="margin:0 0 16px;">Thank you for your purchase — your <strong>vehicle history report</strong> is ready. Use the secure button below to view, print, or download it.</p>
${summaryTable(tableRows)}
${ctaButton(params.reportUrl, "View Vehicle Report")}
<p style="margin:16px 0 0;font-size:13px;color:${MUTED};word-break:break-all;">If the button doesn’t work, copy this URL:<br/><a href="${params.reportUrl}" style="color:${BRAND_HOVER};">${escapeHtml(params.reportUrl)}</a></p>
<p style="margin:20px 0 0;font-size:13px;color:${MUTED};">Report data is provided by licensed sources including ClearVIN. See our terms for NMVTIS-related disclaimers.</p>
`;
  return emailShell({
    title: forOwner ? "Purchase complete (team copy)" : "Your report is ready",
    preheader: forOwner
      ? `Report ready for VIN ${params.vin}`
      : `Open your report for VIN ${params.vin}`,
    bodyHtml: body,
  });
}

export function buildContactConfirmationEmailHtml(params: {
  firstName: string;
  lastName: string;
  email: string;
  vnnumber: string;
  message: string;
  /** When true, internal copy for OWNER_EMAIL. */
  forOwner?: boolean;
}): string {
  const forOwner = params.forOwner === true;
  const fn = escapeHtml(params.firstName.trim());
  /** Section labels / body copy — green family (avoid slate #374151 / #111827). */
  const CONTACT_HEADING = "#047857";
  const CONTACT_BODY = "#14532d";
  const summary = summaryTable([
    {
      label: "Name",
      value: `${params.firstName.trim()} ${params.lastName.trim()}`.trim(),
    },
    { label: "Email", value: params.email.trim() },
    { label: "VIN", value: params.vnnumber.trim() || "—" },
  ]);
  const messageBlock = `
<p style="margin:16px 0 8px;font-weight:700;color:${CONTACT_HEADING};">Message</p>
<div style="background:#ecfdf5;border:1px solid #bbf7d0;border-left:4px solid ${BRAND};border-radius:8px;padding:14px 16px;font-size:14px;color:${CONTACT_BODY};white-space:pre-wrap;">${escapeHtml(params.message)}</div>`;

  const body = forOwner
    ? `
<p style="margin:0 0 16px;color:${CONTACT_BODY};">Hi,</p>
<p style="margin:0 0 16px;color:${CONTACT_BODY};">Someone submitted the <strong style="color:${CONTACT_HEADING};">contact form</strong> on TrueK Inspection. Details below — please follow up when you can.</p>
<p style="margin:0 0 12px;font-weight:700;color:${CONTACT_HEADING};">Submission</p>
${summary}
${messageBlock}
`
    : `
<p style="margin:0 0 16px;color:${CONTACT_BODY};">Hi ${fn},</p>
<p style="margin:0 0 16px;color:${CONTACT_BODY};">Thanks for contacting <strong style="color:${CONTACT_HEADING};">TrueK Inspection</strong>. We’ve received your message and will get back to you as soon as possible — typically within <strong style="color:${CONTACT_HEADING};">one business day</strong>.</p>
<p style="margin:0 0 12px;font-weight:700;color:${CONTACT_HEADING};">What you sent us</p>
${summary}
${messageBlock}
<p style="margin:20px 0 0;font-size:14px;color:${MUTED};">No need to reply to confirm — we already have your note on file.</p>
`;
  return emailShell({
    title: forOwner ? "New contact (team copy)" : "Message received",
    preheader: forOwner
      ? "New contact form submission"
      : "We’ve received your message",
    bodyHtml: body,
  });
}
