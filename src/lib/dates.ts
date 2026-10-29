// Court dates are calendar dates in India (IST, no DST). Everything here works on yyyy-mm-dd strings.

export const COURT_TZ = "Asia/Kolkata";

export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COURT_TZ }).format(now);
}

// Fixed names rather than toLocaleDateString: server and browser ICU data differ, which breaks hydration.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** 28 Oct 2026 */
export function formatDate(iso?: string): string {
  if (!iso) return "";
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** Wednesday, 28 October */
export function formatLongDay(iso: string): string {
  const { m, d, weekday } = parts(iso);
  return `${WEEKDAYS[weekday]}, ${d} ${MONTHS[m - 1]}`;
}

/** October 2026, from yyyy-mm */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** 28 Oct 2026, 10:00 — an instant shown in court time */
export function formatInstant(isoInstant: string): string {
  const shifted = new Date(Date.parse(isoInstant) + 330 * 60_000); // IST is UTC+5:30, no DST
  const day = shifted.toISOString().slice(0, 10);
  return `${formatDate(day)}, ${shifted.toISOString().slice(11, 16)}`;
}

export function daysUntil(iso: string, from = todayIST()): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(iso + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export function hearingTone(iso: string | undefined, from = todayIST()) {
  if (!iso) return undefined;
  const d = daysUntil(iso, from);
  if (d === 0) return "today" as const;
  if (d < 0) return "overdue" as const;
  return "pending" as const;
}

export function hearingLabel(iso: string | undefined, from = todayIST()): string {
  if (!iso) return "No date set";
  const d = daysUntil(iso, from);
  if (d === 0) return "Hearing today";
  if (d === 1) return "Hearing tomorrow";
  if (d < 0) return `Date passed · ${formatDate(iso)}`;
  return `Next hearing · ${formatDate(iso)}`;
}
