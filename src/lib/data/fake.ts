// Fake data layer: seed records plus the user's own cases, kept in this browser's storage.
// Same contract as the Supabase layer in ./supabase.ts.
import { todayIST } from "../dates";
import type { CourtCase, LocalityNode, Order } from "../types";
import {
  CNR_RE,
  DataError,
  normaliseCnr,
  type DataLayer,
  type ImportResult,
  type LocalityLevel,
  type NewCaseInput,
  type Profile,
} from "./contract";
import { applyHearing } from "./hearing";
import { BACKUP_FORMAT, byCourtNo, matches, onAdvocateList, parseBackup, sortByHearing } from "./match";
import { ACTS, ADVOCATES, CASE_TYPES, COMPLEXES, HC_CASE_TYPES, DISTRICTS, ESTABLISHMENTS, STATES, buildSeed } from "./seed";

const KEY = "ct:v1";
const MAX_ORDER_BYTES = 2 * 1024 * 1024; // browser storage is small; the real layer allows 10 MB

interface Store {
  cases: CourtCase[];
  profile: Profile;
}

const DEFAULT_PROFILE: Profile = { language: "en", reminderLeadDays: 1, courtLevel: "district" };

let memory: Store | null = null;

function load(): Store {
  if (memory) return memory;
  let stored: Store | null = null;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    stored = raw ? (JSON.parse(raw) as Store) : null;
  } catch {
    stored = null;
  }
  memory = stored ?? { cases: buildSeed(todayIST()), profile: DEFAULT_PROFILE };
  return memory;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    throw new DataError("This device's storage is full. Remove some order files and try again.", "too_large");
  }
}

const tick = () => new Promise((r) => setTimeout(r, 120));

function byLevel(level: LocalityLevel): LocalityNode[] {
  return { state: STATES, district: DISTRICTS, complex: COMPLEXES, establishment: ESTABLISHMENTS }[level];
}

// Bar codes live with the advocate directory in the real backend; the demo derives them from the seed list.
function advocateBar(name?: string) {
  return ADVOCATES.find((a) => a.name === name)?.barCode;
}

function placeOf(establishmentId?: string) {
  const est = ESTABLISHMENTS.find((e) => e.id === establishmentId);
  const complex = COMPLEXES.find((c) => c.id === est?.parentId);
  const district = DISTRICTS.find((d) => d.id === complex?.parentId);
  return { establishmentId: est?.id, complexId: complex?.id, districtId: district?.id, stateId: district?.parentId };
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
}

export const fakeData: DataLayer = {
  async locality(level, parentId) {
    await tick();
    const all = byLevel(level).filter((n) => n.kind !== "high_court");
    return parentId ? all.filter((n) => n.parentId === parentId) : all;
  },

  async highCourtBenches(stateId) {
    await tick();
    const districts = new Set(DISTRICTS.filter((d) => d.parentId === stateId).map((d) => d.id));
    return COMPLEXES.filter((c) => c.kind === "high_court" && districts.has(c.parentId!));
  },

  async localityPath(establishmentId) {
    const p = placeOf(establishmentId);
    return {
      state: STATES.find((s) => s.id === p.stateId)?.name,
      district: DISTRICTS.find((d) => d.id === p.districtId)?.name,
      complex: COMPLEXES.find((c) => c.id === p.complexId)?.name,
      establishment: ESTABLISHMENTS.find((e) => e.id === p.establishmentId)?.name,
    };
  },

  async caseTypes(level) {
    return level === "high" ? HC_CASE_TYPES : CASE_TYPES;
  },

  async acts() {
    return ACTS;
  },

  async getProfile() {
    // Profiles saved before court levels existed default to district courts.
    const p = load().profile;
    return { ...p, courtLevel: p.courtLevel ?? "district" };
  },

  async saveProfile(p) {
    load().profile = p;
    persist();
    return p;
  },

  async findByCnr(raw) {
    await tick();
    const cnr = normaliseCnr(raw);
    if (!CNR_RE.test(cnr)) throw new DataError("A CNR is 16 letters and numbers.", "invalid");
    return load().cases.find((c) => c.cnr === cnr) ?? null;
  },

  async search(q) {
    await tick();
    return load().cases.filter((c) => matches(c, q, advocateBar)).sort(sortByHearing);
  },

  async getCase(id) {
    await tick();
    return load().cases.find((c) => c.id === id) ?? null;
  },

  async createCase(input: NewCaseInput) {
    await tick();
    const cnr = normaliseCnr(input.cnr);
    if (!CNR_RE.test(cnr)) throw new DataError("A CNR is 16 letters and numbers.", "invalid");
    const store = load();
    const existing = store.cases.find((c) => c.cnr === cnr);
    if (existing?.saved) throw new DataError("This case is already in your list.", "duplicate");
    // A case removed from My cases earlier comes back with its history intact.
    if (existing) return fakeData.setSaved(existing.id, true);
    const c: CourtCase = {
      id: newId(),
      cnr,
      label: input.label?.trim() || undefined,
      caseType: input.caseType || undefined,
      registrationNumber: input.registrationNumber?.trim() || undefined,
      ...placeOf(input.establishmentId),
      courtNo: input.courtNo?.trim() || undefined,
      status: "pending",
      nextHearingDate: input.nextHearingDate || undefined,
      source: "manual",
      saved: true,
      parties: [
        ...(input.petitioner ? [{ role: "petitioner" as const, name: input.petitioner.trim(), advocateName: input.advocateName?.trim() }] : []),
        ...(input.respondent ? [{ role: "respondent" as const, name: input.respondent.trim() }] : []),
      ],
      acts: [],
      history: [],
      orders: [],
      interimApps: [],
      transfers: [],
      updatedAt: new Date().toISOString(),
    };
    store.cases.push(c);
    persist();
    return c;
  },

  async updateCase(id, patch) {
    await tick();
    const store = load();
    const i = store.cases.findIndex((c) => c.id === id);
    if (i < 0) throw new DataError("That case no longer exists.", "not_found");
    store.cases[i] = { ...store.cases[i], ...patch, id, updatedAt: new Date().toISOString() };
    persist();
    return store.cases[i];
  },

  async setSaved(id, saved) {
    return fakeData.updateCase(id, { saved });
  },

  async refreshCase(id) {
    await tick();
    if (!load().cases.some((x) => x.id === id)) throw new DataError("That case no longer exists.", "not_found");
    // No live court feed: a refresh confirms the record and stamps the check time.
    return { changed: false, case: await fakeData.updateCase(id, {}) };
  },

  async recordHearing(id, h) {
    await tick();
    const c = load().cases.find((x) => x.id === id);
    if (!c) throw new DataError("That case no longer exists.", "not_found");
    const { entry, patch } = applyHearing(c, h);
    return fakeData.updateCase(id, { ...patch, history: [...c.history, entry] });
  },

  async addOrder(caseId, file) {
    if (file.type !== "application/pdf") throw new DataError("Orders must be PDF files.", "invalid");
    if (file.size > MAX_ORDER_BYTES) throw new DataError("That file is over 2 MB, the limit on this device.", "too_large");
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new DataError("Could not read that file.", "invalid"));
      r.readAsDataURL(file);
    });
    const c = load().cases.find((x) => x.id === caseId);
    if (!c) throw new DataError("That case no longer exists.", "not_found");
    const order: Order = { id: newId(), orderNumber: String(c.orders.length + 1), orderDate: todayIST(), url };
    await fakeData.updateCase(caseId, { orders: [...c.orders, order] });
    return order;
  },

  async planUsage() {
    return null; // the demo has no accounts or plans
  },

  async listSaved() {
    await tick();
    return load().cases.filter((c) => c.saved).sort(sortByHearing);
  },

  async casesOn(date) {
    await tick();
    return load().cases.filter((c) => c.saved && c.status === "pending" && c.nextHearingDate === date);
  },

  async calendarCounts(month) {
    const out: Record<string, number> = {};
    for (const c of load().cases) {
      if (c.saved && c.status === "pending" && c.nextHearingDate?.startsWith(month)) {
        out[c.nextHearingDate] = (out[c.nextHearingDate] ?? 0) + 1;
      }
    }
    return out;
  },

  async causeList(establishmentId, date) {
    await tick();
    return load()
      .cases.filter((c) => c.establishmentId === establishmentId && c.status === "pending" && c.nextHearingDate === date)
      .sort(byCourtNo);
  },

  async dateCaseList({ complexId, date, advocate }) {
    await tick();
    return load()
      .cases.filter(
        (c) => c.complexId === complexId && c.status === "pending" && c.nextHearingDate === date && onAdvocateList(c, advocate, advocateBar),
      )
      .sort(byCourtNo);
  },

  async exportBackup() {
    const saved = load().cases.filter((c) => c.saved);
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
    const result: ImportResult = { added: 0, updated: 0, skipped: parsed.errors.length, errors: parsed.errors };
    const store = load();
    for (const raw of parsed.cases) {
      const incoming: CourtCase = {
        ...(raw as unknown as CourtCase),
        ...placeOf(raw.establishmentId ?? undefined),
        orders: raw.orders.map((o, i) => ({ id: newId(), orderNumber: o.orderNumber ?? String(i + 1), orderDate: o.orderDate ?? undefined })),
        saved: true,
        source: raw.source === "seed" ? "seed" : "import",
        updatedAt: new Date().toISOString(),
      };
      const at = store.cases.findIndex((c) => c.cnr === incoming.cnr);
      if (at >= 0) {
        // Upsert on CNR: restoring the same file twice never duplicates.
        store.cases[at] = { ...store.cases[at], ...incoming, id: store.cases[at].id, orders: store.cases[at].orders };
        result.updated++;
      } else {
        store.cases.push({ ...incoming, id: newId() });
        result.added++;
      }
    }
    persist();
    return result;
  },
};

// Test hook: lets e2e tests start from a clean seed.
export function resetFakeData() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
