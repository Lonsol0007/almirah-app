/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
export function safeNext(raw: string | null | undefined, fallback = "/") {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
