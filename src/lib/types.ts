// Domain types mirroring supabase/migrations. Dates are ISO yyyy-mm-dd strings (court dates have no time).

export type CaseStatus = "pending" | "disposed";

export interface Party {
  role: "petitioner" | "respondent";
  name: string;
  advocateName?: string;
}

export interface Act {
  actName: string;
  section?: string;
}

export interface Fir {
  policeStation: string;
  firNumber: string;
  firYear?: number;
}

export interface HistoryEntry {
  judge?: string;
  businessOn?: string;
  hearingDate?: string;
  purpose?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  orderDate?: string;
  url?: string;
}

export interface InterimApp {
  iaNumber: string;
  filedBy?: string;
  status?: CaseStatus;
  filedOn?: string;
}

export interface CaseTransfer {
  oldRef: string;
  newRef: string;
  transferDate?: string;
}

export interface CourtCase {
  id: string;
  cnr: string;
  label?: string;
  caseType?: string;
  filingNumber?: string;
  filingDate?: string;
  registrationNumber?: string;
  registrationDate?: string;
  stateId?: string;
  districtId?: string;
  complexId?: string;
  establishmentId?: string;
  courtNo?: string;
  judge?: string;
  status: CaseStatus;
  stage?: string;
  nextHearingDate?: string;
  natureOfDisposal?: string;
  source: "manual" | "import" | "seed";
  saved: boolean;
  parties: Party[];
  acts: Act[];
  fir?: Fir;
  history: HistoryEntry[];
  orders: Order[];
  interimApps: InterimApp[];
  transfers: CaseTransfer[];
  updatedAt: string;
}

export type CourtLevel = "district" | "high";

export interface LocalityNode {
  id: string;
  name: string;
  parentId?: string;
  /** Court complexes only: a district court complex or a High Court bench. */
  kind?: "district" | "high_court";
}
