// The data layer every screen talks to. The fake (browser storage) and the real (Supabase)
// implementations both satisfy this, so swapping them changes no screen code.
import type { CourtCase, CourtLevel, LocalityNode, Order } from "../types";

export type LocalityLevel = "state" | "district" | "complex" | "establishment";

export interface Profile {
  fullName?: string;
  barCode?: string;
  homeStateId?: string;
  language: string;
  reminderLeadDays: number;
  /** Which court pickers open on: district courts or High Court. */
  courtLevel: CourtLevel;
}

export type SearchCriteria =
  | { kind: "caseNumber"; establishmentId: string; caseType: string; number: string; year: string }
  | { kind: "filingNumber"; establishmentId: string; number: string; year: string }
  | { kind: "fir"; districtId: string; policeStation: string; firNumber: string; year?: string }
  | { kind: "advocate"; complexId?: string; name?: string; barCode?: string; status?: "pending" | "disposed" }
  | { kind: "party"; complexId?: string; name: string; year?: string; status?: "pending" | "disposed" }
  | { kind: "caseType"; establishmentId: string; caseType: string; year?: string; status?: "pending" | "disposed" }
  | { kind: "act"; complexId?: string; act: string; section?: string; status?: "pending" | "disposed" };

export interface NewCaseInput {
  cnr: string;
  label?: string;
  caseType?: string;
  registrationNumber?: string;
  establishmentId?: string;
  courtNo?: string;
  nextHearingDate?: string;
  petitioner?: string;
  respondent?: string;
  advocateName?: string;
}

/** What happened at a hearing. Adjourned needs a next date; disposed closes the case. */
export type HearingInput = {
  heldOn: string;
  whatHappened?: string;
  stage?: string;
} & ({ outcome: "adjourned"; nextHearingDate: string } | { outcome: "disposed"; natureOfDisposal?: string });

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/** Plan and usage for the signed-in account. Limits are null on the paid plan. */
export interface PlanUsage {
  plan: "free" | "pro";
  cases: number;
  caseLimit: number | null;
  orderFiles: number;
  orderFileLimit: number | null;
}

export const LIMIT_MESSAGES = {
  cases: "The free plan holds 20 cases. Upgrade to Advocate for unlimited cases.",
  orders: "The free plan holds 10 order files. Upgrade to Advocate for unlimited files.",
};

export interface RefreshResult {
  changed: boolean;
  case: CourtCase;
}

export interface DataLayer {
  locality(level: LocalityLevel, parentId?: string): Promise<LocalityNode[]>;
  localityPath(establishmentId: string): Promise<{ state?: string; district?: string; complex?: string; establishment?: string }>;
  caseTypes(level?: CourtLevel): Promise<string[]>;
  /** High Court benches seated in a state (district pickers never list these). */
  highCourtBenches(stateId: string): Promise<LocalityNode[]>;
  acts(): Promise<string[]>;

  getProfile(): Promise<Profile>;
  saveProfile(p: Profile): Promise<Profile>;

  findByCnr(cnr: string): Promise<CourtCase | null>;
  search(c: SearchCriteria): Promise<CourtCase[]>;
  getCase(id: string): Promise<CourtCase | null>;
  createCase(input: NewCaseInput): Promise<CourtCase>;
  updateCase(id: string, patch: Partial<CourtCase>): Promise<CourtCase>;
  setSaved(id: string, saved: boolean): Promise<CourtCase>;
  refreshCase(id: string): Promise<RefreshResult>;
  recordHearing(id: string, h: HearingInput): Promise<CourtCase>;
  addOrder(caseId: string, file: File): Promise<Order>;

  listSaved(): Promise<CourtCase[]>;
  /** null when there are no accounts (the on-device demo). */
  planUsage(): Promise<PlanUsage | null>;
  casesOn(date: string): Promise<CourtCase[]>;
  calendarCounts(month: string): Promise<Record<string, number>>;
  causeList(establishmentId: string, date: string): Promise<CourtCase[]>;
  dateCaseList(q: { complexId: string; date: string; advocate: string }): Promise<CourtCase[]>;

  exportBackup(): Promise<Blob>;
  importBackup(file: File): Promise<ImportResult>;
}

export class DataError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "invalid" | "duplicate" | "too_large" | "unavailable" | "limit",
  ) {
    super(message);
  }
}

export const CNR_RE = /^[A-Z0-9]{16}$/;

export function normaliseCnr(raw: string) {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}
