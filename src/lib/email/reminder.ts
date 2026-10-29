// Hearing reminder email. Plain functions (no imports) so the copy can be tested and previewed.

export interface ReminderItem {
  caseId: string;
  cnr: string;
  title: string;
  hearingDate: string; // yyyy-mm-dd
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

// Consumer commission cases carry an "EJ…" stand-in, not a real CNR (see ../consumer.ts; inlined because this
// file also runs under plain node in the unit tests).
const refText = (cnr: string) => (cnr.startsWith("EJ") ? "e-Jagriti" : `CNR ${cnr}`);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function reminderEmail(opts: { brand: string; siteUrl: string; accent: string; items: ReminderItem[]; today: string }) {
  const { brand, siteUrl, accent, items, today } = opts;
  const dates = [...new Set(items.map((i) => i.hearingDate))];
  const when = dates.length === 1 ? (dates[0] === today ? "today" : `on ${day(dates[0])}`) : "soon";
  const subject =
    items.length === 1 ? `Hearing ${when}: ${items[0].title}` : `${items.length} hearings ${when}`;

  const text = [
    `You have ${items.length === 1 ? "a hearing" : `${items.length} hearings`} coming up:`,
    "",
    ...items.map((i) => `- ${day(i.hearingDate)} · ${i.title} (${refText(i.cnr)})\n  ${siteUrl}/case?id=${encodeURIComponent(i.caseId)}`),
    "",
    `Change when these arrive in Settings: ${siteUrl}/settings`,
    `— ${brand}`,
  ].join("\n");

  const rows = items
    .map(
      (i) => `<tr>
  <td style="padding:10px 0;border-top:1px solid #e2e5ea;font:14px/20px system-ui,sans-serif;color:#15181d">
    <a href="${esc(`${siteUrl}/case?id=${encodeURIComponent(i.caseId)}`)}" style="color:${accent};font-weight:600;text-decoration:none">${esc(i.title)}</a><br>
    <span style="color:#59616c">${esc(day(i.hearingDate))} · ${esc(refText(i.cnr))}</span>
  </td>
</tr>`,
    )
    .join("\n");

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f6f8">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:10px;padding:24px">
<tr><td style="font:600 18px/26px system-ui,sans-serif;color:#15181d;padding-bottom:8px">${esc(subject)}</td></tr>
${rows}
<tr><td style="padding-top:16px;font:12px/18px system-ui,sans-serif;color:#59616c">
  You get these because hearing reminders are on. <a href="${esc(`${siteUrl}/settings`)}" style="color:${accent}">Change them in Settings</a>.<br>— ${esc(brand)}
</td></tr>
</table></body></html>`;

  return { subject, text, html };
}
