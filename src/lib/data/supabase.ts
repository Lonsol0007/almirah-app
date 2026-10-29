"use client";

// Real data layer: Supabase Postgres with row level security. Every query runs as the signed-in user,
// so the database — not this file — decides what they can see and change.
import { supabaseBrowser } from "../supabase/client";
import { todayIST } from "../dates";
import type { CourtCase, LocalityNode, Order } from "../types";
import {
  CNR_RE,
  DataError,
  LIMIT_MESSAGES,
  normaliseCnr,
  type DataLayer,
  type ImportResult,
  type LocalityLevel,
  type Profile,
} from "./contract";
import { applyHearing } from "./hearing";
import { BACKUP_FORMAT, byCourtNo, matches, onAdvocateList, parseBackup, sortByHearing, type BackupCase } from "./match";
import { ACTS, CASE_TYPES, HC_CASE_TYPES } from "./seed";

const MAX_ORDER_BYTES = 10 * 1024 * 1024;
const CASE_SELECT = "*, parties(*), acts(*), firs(*), case_history(*), orders(*), interim_apps(*), case_transfers(*)";

type Row = Record<string, unknown> & { id: string };
const s = (v: unknown) => (v === null || v === undefined ? undefined : String(v));

function fail(error: { message: string; code?: string } | null, fallback = "Something went wrong. Try again.") {
  if (!error) return;
  if (error.message?.includes("free_plan_case_limit")) throw new DataError(LIMIT_MESSAGES.cases, "limit");
  if (error.message?.includes("free_plan_order_limit")) throw new DataError(LIMIT_MESSAGES.orders, "limit");
  if (error.code === "23505") throw new DataError("This case is already in your list.", "duplicate");
  if (error.code === "23514") throw new DataError("Some details aren't valid. Check the CNR and dates.", "invalid");
  if (error.code === "42501" || error.code === "PGRST301") throw new DataError("Please sign in again.", "unavailable");
  throw new DataError(error.message || fallback, "unavailable");
}

// ---------- reference localities, loaded once ----------
interface Ref {
  state: LocalityNode[];
  district: LocalityNode[];
  complex: LocalityNode[];
  establishment: LocalityNode[];
}
let refPromise: Promise<Ref> | null = null;

function refs(): Promise<Ref> {
  refPromise ??= (async () => {
    const sb = supabaseBrowser();
    const [st, di, co, es] = await Promise.all([
      sb.from("states").select("id, name").order("name"),
      sb.from("districts").select("id, name, state_id").order("name"),
      sb.from("court_complexes").select("id, name, district_id, kind").order("name"),
      sb.from("court_establishments").select("id, name, complex_id").order("name"),
    ]);
    [st, di, co, es].forEach((r) => fail(r.error));
    return {
      state: (st.data ?? []).map((r) => ({ id: r.id, name: r.name })),
      district: (di.data ?? []).map((r) => ({ id: r.id, name: r.name, parentId: r.state_id })),
      complex: (co.data ?? []).map((r) => ({ id: r.id, name: r.name, parentId: r.district_id, kind: r.kind })),
      establishment: (es.data ?? []).map((r) => ({ id: r.id, name: r.name, parentId: r.complex_id })),
    };
  })();
  refPromise.catch(() => (refPromise = null));
  return refPromise;
}

function placeOf(ref: Ref, establishmentId?: string) {
  const est = ref.establishment.find((e) => e.id === establishmentId);
  const complex = ref.complex.find((c) => c.id === est?.parentId);
  const district = ref.district.find((d) => d.id === complex?.parentId);
  return { establishmentId: est?.id, complexId: complex?.id, districtId: district?.id, stateId: district?.parentId };
}

function toCase(r: Row, ref: Ref): CourtCase {
  const fir = (r.firs as Row[] | null)?.[0];
  return {
    id: r.id,
    cnr: String(r.cnr),
    label: s(r.label),
    caseType: s(r.case_type),
    filingNumber: s(r.filing_number),
    filingDate: s(r.filing_date),
    registrationNumber: s(r.registration_number),
    registrationDate: s(r.registration_date),
    ...placeOf(ref, s(r.establishment_id)),
    courtNo: s(r.court_no),
    judge: s(r.judge),
    status: r.status === "disposed" ? "disposed" : "pending",
    stage: s(r.stage),
    nextHearingDate: s(r.next_hearing_date),
    natureOfDisposal: s(r.nature_of_disposal),
    source: (s(r.source) ?? "manual") as CourtCase["source"],
    saved: Boolean(r.saved),
    parties: ((r.parties as Row[]) ?? [])
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((p) => ({ role: p.role as "petitioner" | "respondent", name: String(p.name), advocateName: s(p.advocate_name) })),
    acts: ((r.acts as Row[]) ?? []).map((a) => ({ actName: String(a.act_name), section: s(a.section) })),
    fir: fir ? { policeStation: String(fir.police_station), firNumber: String(fir.fir_number), firYear: fir.fir_year ? Number(fir.fir_year) : undefined } : undefined,
    history: ((r.case_history as Row[]) ?? [])
      .map((h) => ({ judge: s(h.judge), businessOn: s(h.business_on), hearingDate: s(h.hearing_date), purpose: s(h.purpose) }))
      .sort((a, b) => (a.businessOn ?? "").localeCompare(b.businessOn ?? "")),
    orders: ((r.orders as Row[]) ?? [])
      .map((o) => ({ id: o.id, orderNumber: s(o.order_number), orderDate: s(o.order_date), path: s(o.storage_path) }))
      .sort((a, b) => (a.orderDate ?? "").localeCompare(b.orderDate ?? "")) as Array<Order & { path?: string }>,
    interimApps: ((r.interim_apps as Row[]) ?? []).map((ia) => ({
      iaNumber: String(ia.ia_number),
      filedBy: s(ia.filed_by),
      status: s(ia.status) as "pending" | "disposed" | undefined,
      filedOn: s(ia.filed_on),
    })),
    transfers: ((r.case_transfers as Row[]) ?? []).map((t) => ({ oldRef: String(t.old_ref), newRef: String(t.new_ref), transferDate: s(t.transfer_date) })),
    updatedAt: String(r.updated_at),
  };
}

async function allCases(): Promise<CourtCase[]> {
  const [ref, res] = await Promise.all([refs(), supabaseBrowser().from("cases").select(CASE_SELECT)]);
  fail(res.error);
  return ((res.data ?? []) as Row[]).map((r) => toCase(r, ref));
}

async function userId() {
  const { data } = await supabaseBrowser().auth.getUser();
  if (!data.user) throw new DataError("Please sign in again.", "unavailable");
  return data.user.id;
}

// The advocate's own bar registration resolves to their own name; other advocates are searched by name.
let profileCache: Profile | null = null;
function barOf(name?: string) {
  if (!profileCache?.barCode || !profileCache.fullName || !name) return undefined;
  return name.trim().toLowerCase() === profileCache.fullName.trim().toLowerCase() ? profileCache.barCode.toUpperCase() : undefined;
}

function toPayload(c: BackupCase | CourtCase) {
  return {
    cnr: c.cnr,
    label: c.label ?? null,
    caseType: c.caseType ?? null,
    filingNumber: c.filingNumber ?? null,
    filingDate: c.filingDate ?? null,
    registrationNumber: c.registrationNumber ?? null,
    registrationDate: c.registrationDate ?? null,
    establishmentId: c.establishmentId ?? null,
    courtNo: c.courtNo ?? null,
    judge: c.judge ?? null,
    status: c.status,
    stage: c.stage ?? null,
    nextHearingDate: c.nextHearingDate ?? null,
    natureOfDisposal: c.natureOfDisposal ?? null,
    source: c.source ?? "import",
    parties: c.parties,
    acts: c.acts,
    fir: c.fir ?? null,
    history: c.history,
    interimApps: c.interimApps,
    transfers: c.transfers,
    orders: c.orders.map((o) => ({ orderNumber: o.orderNumber ?? null, orderDate: o.orderDate ?? null })),
  };
}

export const supabaseData: DataLayer = {
  async locality(level: LocalityLevel, parentId?: string) {
    const all = (await refs())[level].filter((n) => n.kind !== "high_court");
    return parentId ? all.filter((n) => n.parentId === parentId) : all;
  },

  async highCourtBenches(stateId) {
    const ref = await refs();
    const districts = new Set(ref.district.filter((d) => d.parentId === stateId).map((d) => d.id));
    return ref.complex.filter((c) => c.kind === "high_court" && districts.has(c.parentId!));
  },


  async localityPath(establishmentId) {
    const ref = await refs();
    const p = placeOf(ref, establishmentId);
    return {
      state: ref.state.find((x) => x.id === p.stateId)?.name,
      district: ref.district.find((x) => x.id === p.districtId)?.name,
      complex: ref.complex.find((x) => x.id === p.complexId)?.name,
      establishment: ref.establishment.find((x) => x.id === p.establishmentId)?.name,
    };
  },

  async caseTypes(level) {
    return level === "high" ? HC_CASE_TYPES : CASE_TYPES;
  },

  async acts() {
    return ACTS;
  },

  async getProfile() {
    const id = await userId();
    const { data, error } = await supabaseBrowser().from("profiles").select("*").eq("id", id).maybeSingle();
    fail(error);
    profileCache = {
      fullName: s(data?.full_name),
      barCode: s(data?.bar_code),
      homeStateId: s(data?.home_state_id),
      language: s(data?.language) ?? "en",
      reminderLeadDays: Number(data?.reminder_lead_days ?? 1),
      courtLevel: data?.court_level === "high" ? "high" : "district",
    };
    return profileCache;
  },

  async saveProfile(p) {
    const id = await userId();
    const { error } = await supabaseBrowser()
      .from("profiles")
      .upsert({
        id,
        full_name: p.fullName || null,
        bar_code: p.barCode || null,
        home_state_id: p.homeStateId || null,
        language: p.language,
        reminder_lead_days: p.reminderLeadDays,
        court_level: p.courtLevel,
      });
    fail(error);
    profileCache = p;
    return p;
  },

  async findByCnr(raw) {
    const cnr = normaliseCnr(raw);
    if (!CNR_RE.test(cnr)) throw new DataError("A CNR is 16 letters and numbers.", "invalid");
    const [ref, res] = await Promise.all([refs(), supabaseBrowser().from("cases").select(CASE_SELECT).eq("cnr", cnr).maybeSingle()]);
    fail(res.error);
    return res.data ? toCase(res.data as Row, ref) : null;
  },

  async search(q) {
    if (!profileCache) await supabaseData.getProfile().catch(() => null);
    return (await allCases()).filter((c) => matches(c, q, barOf)).sort(sortByHearing);
  },

  async getCase(id) {
    const [ref, res] = await Promise.all([refs(), supabaseBrowser().from("cases").select(CASE_SELECT).eq("id", id).maybeSingle()]);
    fail(res.error);
    if (!res.data) return null;
    const c = toCase(res.data as Row, ref);
    // Order files are private: hand out short-lived signed links.
    const withFiles = c.orders as Array<Order & { path?: string }>;
    const paths = withFiles.map((o) => o.path).filter(Boolean) as string[];
    if (paths.length) {
      const { data } = await supabaseBrowser().storage.from("orders").createSignedUrls(paths, 60 * 10);
      withFiles.forEach((o) => (o.url = data?.find((d) => d.path === o.path)?.signedUrl ?? undefined));
    }
    return c;
  },

  async createCase(input) {
    const cnr = normaliseCnr(input.cnr);
    if (!CNR_RE.test(cnr)) throw new DataError("A CNR is 16 letters and numbers.", "invalid");
    const existing = await supabaseData.findByCnr(cnr);
    if (existing?.saved) throw new DataError("This case is already in your list.", "duplicate");
    // A case removed from My cases earlier comes back with its history intact.
    if (existing) return supabaseData.setSaved(existing.id, true);
    const { data, error } = await supabaseBrowser().rpc("upsert_case_tree", {
      payload: {
        cnr,
        label: input.label?.trim() || null,
        caseType: input.caseType || null,
        registrationNumber: input.registrationNumber?.trim() || null,
        establishmentId: input.establishmentId || null,
        courtNo: input.courtNo?.trim() || null,
        nextHearingDate: input.nextHearingDate || null,
        status: "pending",
        source: "manual",
        parties: [
          ...(input.petitioner ? [{ role: "petitioner", name: input.petitioner.trim(), advocateName: input.advocateName?.trim() || null }] : []),
          ...(input.respondent ? [{ role: "respondent", name: input.respondent.trim() }] : []),
        ],
      },
    });
    fail(error);
    return (await supabaseData.getCase(String(data)))!;
  },

  async updateCase(id, patch) {
    const cols: Record<string, unknown> = {};
    const map: Array<[keyof CourtCase, string]> = [
      ["label", "label"], ["caseType", "case_type"], ["registrationNumber", "registration_number"], ["courtNo", "court_no"],
      ["judge", "judge"], ["status", "status"], ["stage", "stage"], ["nextHearingDate", "next_hearing_date"],
      ["natureOfDisposal", "nature_of_disposal"], ["saved", "saved"], ["establishmentId", "establishment_id"],
    ];
    for (const [k, col] of map) if (k in patch) cols[col] = patch[k] ?? null;
    // An empty patch still moves the "last checked" stamp (the trigger sets updated_at to now()).
    if (Object.keys(cols).length === 0) cols.updated_at = new Date().toISOString();
    const { data, error } = await supabaseBrowser().from("cases").update(cols).eq("id", id).select("id").maybeSingle();
    fail(error);
    if (!data) throw new DataError("That case no longer exists.", "not_found");
    return (await supabaseData.getCase(id))!;
  },

  async setSaved(id, saved) {
    return supabaseData.updateCase(id, { saved });
  },

  async refreshCase(id) {
    const before = await supabaseData.getCase(id);
    if (!before) throw new DataError("That case no longer exists.", "not_found");
    // No live court feed: re-read the record, and touch it so "last checked" moves.
    const after = await supabaseData.updateCase(id, {});
    const changed = JSON.stringify({ ...before, updatedAt: 0, orders: 0 }) !== JSON.stringify({ ...after, updatedAt: 0, orders: 0 });
    return { changed, case: after };
  },

  async recordHearing(id, h) {
    const c = await supabaseData.getCase(id);
    if (!c) throw new DataError("That case no longer exists.", "not_found");
    const { entry, patch } = applyHearing(c, h);
    const { error } = await supabaseBrowser().from("case_history").insert({
      case_id: id,
      judge: entry.judge ?? null,
      business_on: entry.businessOn ?? null,
      hearing_date: entry.hearingDate ?? null,
      purpose: entry.purpose ?? null,
    });
    fail(error);
    return supabaseData.updateCase(id, patch);
  },

  async addOrder(caseId, file) {
    if (file.type !== "application/pdf") throw new DataError("Orders must be PDF files.", "invalid");
    if (file.size > MAX_ORDER_BYTES) throw new DataError("That file is over 10 MB.", "too_large");
    const uid = await userId();
    const path = `${uid}/${caseId}/${crypto.randomUUID()}.pdf`;
    const sb = supabaseBrowser();
    const up = await sb.storage.from("orders").upload(path, file, { contentType: "application/pdf", upsert: false });
    fail(up.error);
    const { count } = await sb.from("orders").select("id", { count: "exact", head: true }).eq("case_id", caseId);
    const { data, error } = await sb
      .from("orders")
      .insert({ case_id: caseId, order_number: String((count ?? 0) + 1), order_date: todayIST(), storage_path: path, size_bytes: file.size })
      .select("*")
      .single();
    if (error) await sb.storage.from("orders").remove([path]); // don't leave an orphan file
    fail(error);
    return { id: data.id, orderNumber: s(data.order_number), orderDate: s(data.order_date) };
  },

  async planUsage() {
    const { data, error } = await supabaseBrowser().rpc("plan_usage").maybeSingle<{
      plan: "free" | "pro"; cases: number; case_limit: number | null; order_files: number; order_file_limit: number | null;
    }>();
    fail(error);
    if (!data) return null;
    return { plan: data.plan, cases: data.cases, caseLimit: data.case_limit, orderFiles: data.order_files, orderFileLimit: data.order_file_limit };
  },

  async listSaved() {
    return (await allCases()).filter((c) => c.saved).sort(sortByHearing);
  },

  async casesOn(date) {
    return (await allCases()).filter((c) => c.saved && c.status === "pending" && c.nextHearingDate === date);
  },

  async calendarCounts(month) {
    const out: Record<string, number> = {};
    for (const c of await allCases()) {
      if (c.saved && c.status === "pending" && c.nextHearingDate?.startsWith(month)) {
        out[c.nextHearingDate] = (out[c.nextHearingDate] ?? 0) + 1;
      }
    }
    return out;
  },

  async causeList(establishmentId, date) {
    return (await allCases())
      .filter((c) => c.establishmentId === establishmentId && c.status === "pending" && c.nextHearingDate === date)
      .sort(byCourtNo);
  },

  async dateCaseList({ complexId, date, advocate }) {
    if (!profileCache) await supabaseData.getProfile().catch(() => null);
    return (await allCases())
      .filter((c) => c.complexId === complexId && c.status === "pending" && c.nextHearingDate === date && onAdvocateList(c, advocate, barOf))
      .sort(byCourtNo);
  },

  async exportBackup() {
    const saved = (await allCases()).filter((c) => c.saved).map((c) => ({
      ...c,
      stateId: undefined,
      districtId: undefined,
      complexId: undefined,
      orders: c.orders.map(({ orderNumber, orderDate }) => ({ orderNumber, orderDate })),
    }));
    const body = { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), cases: saved };
    return new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
  },

  async importBackup(file) {
    let parsed: ReturnType<typeof parseBackup>;
    try {
      parsed = parseBackup(await file.text());
    } catch (e) {
      throw new DataError((e as Error).message, "invalid");
    }
    const ref = await refs();
    const existing = new Set((await allCases()).map((c) => c.cnr));
    const result: ImportResult = { added: 0, updated: 0, skipped: parsed.errors.length, errors: [...parsed.errors] };
    for (const c of parsed.cases) {
      // A court we don't know (backup from another setup) is dropped rather than failing the whole case.
      const establishmentId = c.establishmentId && ref.establishment.some((e) => e.id === c.establishmentId) ? c.establishmentId : null;
      const { error } = await supabaseBrowser().rpc("upsert_case_tree", { payload: { ...toPayload({ ...c, establishmentId }), source: "import" } });
      if (error) {
        result.skipped++;
        result.errors.push(error.message.includes("free_plan_case_limit") ? `${c.cnr}: not added — ${LIMIT_MESSAGES.cases}` : `${c.cnr}: ${error.message}`);
        continue;
      }
      if (existing.has(c.cnr)) result.updated++;
      else result.added++;
    }
    return result;
  },
};
