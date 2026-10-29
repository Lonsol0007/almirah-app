// "Add to Google Calendar" through Google's public event-template link: no API key, no OAuth, nothing stored
// on our side. The person reviews the event in Google Calendar and saves it there. Full two-way sync would
// need the Calendar API and Google's OAuth verification; this covers the common need without either.
const compact = (iso: string) => iso.replaceAll("-", "");

function nextDay(iso: string) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/** An all-day event on `date` (YYYY-MM-DD). */
export function googleCalendarUrl(e: { title: string; date: string; details?: string; location?: string }) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${compact(e.date)}/${compact(nextDay(e.date))}`,
  });
  if (e.details) q.set("details", e.details);
  if (e.location) q.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${q}`;
}
