// Consumer commissions (District, State and National) file cases on e-Jagriti, which numbers them like
// CC/123/2024 and gives them no CNR. Every case here is keyed on a 16-character CNR, so a consumer case gets a
// stable stand-in: "EJ" (no state uses that code) plus a hash of the bench and the case number. Re-adding the
// same case finds it again; restoring a backup matches it like any other case.
//
// e-Jagriti has no public API, so these cases are tracked by hand, with a link out to the portal.
export const E_JAGRITI_URL = "https://e-jagriti.gov.in/";

const PREFIX = "EJ";

/** Case numbers are compared without spaces and case: "cc / 123 / 2024" is "CC/123/2024". */
export function normaliseCaseNo(raw: string) {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Two 32-bit FNV-1a passes (different offset bases), each written as 7 base-36 digits: 14 characters,
 * deterministic and dependency-free, the same on the server and on the phone. */
function hash14(s: string) {
  const bytes = new TextEncoder().encode(s);
  return [0x811c9dc5, 0x050c5d1f]
    .map((basis) => {
      let h = basis;
      for (const b of bytes) h = Math.imul(h ^ b, 0x01000193);
      return (h >>> 0).toString(36).toUpperCase().padStart(7, "0");
    })
    .join("");
}

/** The CNR stand-in for a consumer case: 16 characters, so it fits everywhere a CNR does. */
export function consumerRef(establishmentId: string, caseNo: string) {
  return PREFIX + hash14(`${establishmentId}|${normaliseCaseNo(caseNo)}`);
}

export function isConsumerRef(cnr: string) {
  return cnr.startsWith(PREFIX);
}

/** What to show where a CNR would go: the commission's own case number for consumer cases. */
export function caseRef(c: { cnr: string; registrationNumber?: string }) {
  return isConsumerRef(c.cnr) ? (c.registrationNumber ?? c.cnr) : c.cnr;
}
