// Search and list rules shared by both data layers, so demo and real accounts behave the same.
import { z } from "zod";
import type { CourtCase } from "../types";
import { CNR_RE, type SearchCriteria } from "./contract";

export const has = (hay: string | undefined, needle: string) =>
  Boolean(hay && needle && hay.toLowerCase().includes(needle.trim().toLowerCase()));

// Case and filing numbers are "number/year"; consumer commissions prefix a type ("CC/412/2025", "DC/0702/2025").
const refParts = (ref?: string) => ref?.replace(/^[A-Z]+\//i, "").split("/") ?? [];
const yearOf = (ref?: string) => refParts(ref)[1];
const sameRef = (ref: string | undefined, number: string, year: string) => {
  const [n, y] = refParts(ref);
  return n !== undefined && Number(n) === Number(number) && y === year;
};

export function sortByHearing(a: CourtCase, b: CourtCase) {
  if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
  return (a.nextHearingDate ?? "9999").localeCompare(b.nextHearingDate ?? "9999");
}

export const byCourtNo = (a: CourtCase, b: CourtCase) =>
  (a.courtNo ?? "").localeCompare(b.courtNo ?? "", undefined, { numeric: true });

/** `barOf` maps an advocate name to a bar registration number, where the layer knows one. */
export function matches(c: CourtCase, q: SearchCriteria, barOf: (name?: string) => string | undefined): boolean {
  switch (q.kind) {
    case "caseNumber":
      return (
        c.establishmentId === q.establishmentId &&
        c.caseType === q.caseType &&
        sameRef(c.registrationNumber, q.number, q.year)
      );
    case "filingNumber":
      return c.establishmentId === q.establishmentId && sameRef(c.filingNumber, q.number, q.year);
    case "fir":
      return (
        c.districtId === q.districtId &&
        has(c.fir?.policeStation, q.policeStation) &&
        c.fir?.firNumber === String(Number(q.firNumber)) &&
        (!q.year || String(c.fir?.firYear) === q.year)
      );
    case "advocate":
      return (
        (!q.complexId || c.complexId === q.complexId) &&
        (!q.status || c.status === q.status) &&
        c.parties.some(
          (p) =>
            (q.name && has(p.advocateName, q.name)) ||
            (q.barCode && barOf(p.advocateName) === q.barCode.trim().toUpperCase()),
        )
      );
    case "party":
      return (
        (!q.complexId || c.complexId === q.complexId) &&
        (!q.status || c.status === q.status) &&
        (!q.year || yearOf(c.registrationNumber) === q.year) &&
        c.parties.some((p) => has(p.name, q.name))
      );
    case "caseType":
      return (
        c.establishmentId === q.establishmentId &&
        c.caseType === q.caseType &&
        (!q.status || c.status === q.status) &&
        (!q.year || yearOf(c.registrationNumber) === q.year)
      );
    case "act":
      return (
        (!q.complexId || c.complexId === q.complexId) &&
        (!q.status || c.status === q.status) &&
        c.acts.some((a) => a.actName === q.act && (!q.section || a.section === q.section.trim()))
      );
  }
}

export function onAdvocateList(c: CourtCase, advocate: string, barOf: (name?: string) => string | undefined) {
  return c.parties.some((p) => has(p.advocateName, advocate) || barOf(p.advocateName) === advocate.trim().toUpperCase());
}

// ---------- backup file format (validated on restore, in both layers) ----------
export const BACKUP_FORMAT = "almirah-backup";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable();
const text = z.string().max(500).optional().nullable();

export const backupCaseSchema = z.object({
  cnr: z.string().regex(CNR_RE),
  status: z.enum(["pending", "disposed"]),
  label: text,
  caseType: text,
  filingNumber: text,
  filingDate: isoDate,
  registrationNumber: text,
  registrationDate: isoDate,
  establishmentId: text,
  courtNo: text,
  judge: text,
  stage: text,
  nextHearingDate: isoDate,
  natureOfDisposal: text,
  source: z.enum(["manual", "import", "seed"]).optional(),
  parties: z.array(z.object({ role: z.enum(["petitioner", "respondent"]), name: z.string().min(1).max(300), advocateName: text })).max(200).default([]),
  acts: z.array(z.object({ actName: z.string().min(1).max(300), section: text })).max(100).default([]),
  fir: z.object({ policeStation: z.string().max(200), firNumber: z.string().max(40), firYear: z.number().int().optional().nullable() }).optional().nullable(),
  history: z.array(z.object({ judge: text, businessOn: isoDate, hearingDate: isoDate, purpose: text })).max(2000).default([]),
  orders: z.array(z.object({ orderNumber: text, orderDate: isoDate })).max(2000).default([]),
  interimApps: z.array(z.object({ iaNumber: z.string().max(80), filedBy: text, status: z.enum(["pending", "disposed"]).optional().nullable(), filedOn: isoDate })).max(500).default([]),
  transfers: z.array(z.object({ oldRef: z.string().max(40), newRef: z.string().max(40), transferDate: isoDate })).max(100).default([]),
});

export type BackupCase = z.infer<typeof backupCaseSchema>;

export const backupFileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  cases: z.array(z.unknown()).max(20000),
});

/** Parses a backup file, returning valid cases and a message for each invalid entry. */
export function parseBackup(raw: string): { cases: BackupCase[]; errors: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't a backup from this app.");
  }
  const file = backupFileSchema.safeParse(json);
  if (!file.success) throw new Error("That file isn't a backup from this app.");
  const cases: BackupCase[] = [];
  const errors: string[] = [];
  file.data.cases.forEach((entry, i) => {
    const r = backupCaseSchema.safeParse(entry);
    if (r.success) cases.push(r.data);
    else errors.push(`Entry ${i + 1} is missing a valid CNR or status.`);
  });
  return { cases, errors };
}
