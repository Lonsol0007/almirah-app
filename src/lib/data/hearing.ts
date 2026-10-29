// The one rule for applying a hearing outcome, shared by both data layers.
import type { CourtCase, HistoryEntry } from "../types";
import { DataError, type HearingInput } from "./contract";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function applyHearing(c: CourtCase, h: HearingInput): { entry: HistoryEntry; patch: Partial<CourtCase> } {
  if (c.status === "disposed") throw new DataError("This case is already disposed.", "invalid");
  if (!ISO.test(h.heldOn)) throw new DataError("Add the date of the hearing.", "invalid");
  if (h.outcome === "adjourned") {
    if (!ISO.test(h.nextHearingDate)) throw new DataError("Add the next hearing date.", "invalid");
    if (h.nextHearingDate <= h.heldOn) throw new DataError("The next date has to be after the hearing.", "invalid");
  }
  const stage = h.stage?.trim() || c.stage;
  const entry: HistoryEntry = {
    judge: c.judge,
    businessOn: h.heldOn,
    hearingDate: h.outcome === "adjourned" ? h.nextHearingDate : undefined,
    purpose: h.whatHappened?.trim() || stage || (h.outcome === "disposed" ? "Disposed" : "Adjourned"),
  };
  const patch: Partial<CourtCase> =
    h.outcome === "adjourned"
      ? { stage, nextHearingDate: h.nextHearingDate }
      : { stage, status: "disposed", nextHearingDate: undefined, natureOfDisposal: h.natureOfDisposal?.trim() || undefined };
  return { entry, patch };
}
