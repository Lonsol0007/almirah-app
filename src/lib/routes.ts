// Case pages take the id as a query parameter rather than a path segment, so the app can also be
// exported as static files (the Android build) where per-case pages can't exist at build time.
export const caseHref = (id: string) => `/case?id=${encodeURIComponent(id)}`;
export const hearingHref = (id: string) => `/case/hearing?id=${encodeURIComponent(id)}`;
