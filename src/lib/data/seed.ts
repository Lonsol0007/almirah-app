// Demo data. All parties, advocates and case numbers are invented. Court localities are generic.
import type { CourtCase, LocalityNode } from "../types";

export const STATES: LocalityNode[] = [
  { id: "mh", name: "Maharashtra" },
  { id: "ka", name: "Karnataka" },
  { id: "dl", name: "Delhi" },
];

export const DISTRICTS: LocalityNode[] = [
  { id: "mh-pune", name: "Pune", parentId: "mh" },
  { id: "mh-mumbai", name: "Mumbai City", parentId: "mh" },
  { id: "ka-blr", name: "Bengaluru Urban", parentId: "ka" },
  { id: "ka-mys", name: "Mysuru", parentId: "ka" },
  { id: "dl-south", name: "South Delhi", parentId: "dl" },
  { id: "mh-nagpur", name: "Nagpur", parentId: "mh" },
  { id: "dl-new", name: "New Delhi", parentId: "dl" },
];

export const COMPLEXES: LocalityNode[] = [
  { id: "pune-dc", name: "District Court Complex, Pune", parentId: "mh-pune" },
  { id: "mumbai-ccc", name: "City Civil Court Complex, Mumbai", parentId: "mh-mumbai" },
  { id: "blr-ccc", name: "City Civil Court Complex, Bengaluru", parentId: "ka-blr" },
  { id: "mys-dc", name: "District Court Complex, Mysuru", parentId: "ka-mys" },
  { id: "dl-saket", name: "District Court Complex, Saket", parentId: "dl-south" },
  // High Court benches hang off the district they sit in.
  { id: "bhc-mumbai", name: "Bombay High Court, Principal Seat", parentId: "mh-mumbai", kind: "high_court" },
  { id: "bhc-nagpur", name: "Bombay High Court, Bench at Nagpur", parentId: "mh-nagpur", kind: "high_court" },
  { id: "khc-blr", name: "High Court of Karnataka, Principal Bench", parentId: "ka-blr", kind: "high_court" },
  { id: "dhc", name: "High Court of Delhi", parentId: "dl-new", kind: "high_court" },
  // Consumer commissions, also under the district they sit in. The National Commission sits in New Delhi.
  { id: "dcdrc-pune", name: "District Consumer Commission, Pune", parentId: "mh-pune", kind: "consumer" },
  { id: "dcdrc-mumbai", name: "District Consumer Commission, Mumbai Suburban", parentId: "mh-mumbai", kind: "consumer" },
  { id: "scdrc-mh", name: "Maharashtra State Consumer Commission", parentId: "mh-mumbai", kind: "consumer" },
  { id: "dcdrc-blr", name: "District Consumer Commission, Bengaluru Urban", parentId: "ka-blr", kind: "consumer" },
  { id: "scdrc-ka", name: "Karnataka State Consumer Commission", parentId: "ka-blr", kind: "consumer" },
  { id: "scdrc-dl", name: "Delhi State Consumer Commission", parentId: "dl-new", kind: "consumer" },
  { id: "ncdrc", name: "National Consumer Commission", parentId: "dl-new", kind: "consumer" },
];

const EST_KINDS = [
  ["sd", "Civil Judge, Senior Division"],
  ["jd", "Civil Judge, Junior Division"],
  ["cjm", "Chief Judicial Magistrate"],
  ["ds", "District and Sessions Court"],
] as const;

// High Court "sides" and consumer commission benches play the role a district court establishment plays.
const BENCHES: Record<string, Array<[string, string]>> = {
  "bhc-mumbai": [["as", "Appellate Side"], ["os", "Original Side"]],
  "bhc-nagpur": [["as", "Appellate Side"]],
  "khc-blr": [["pb", "Principal Bench"]],
  dhc: [["main", "High Court of Delhi"]],
  "dcdrc-pune": [["main", "Main Bench"]],
  "dcdrc-mumbai": [["main", "Main Bench"]],
  "scdrc-mh": [["pb", "Principal Bench"], ["cb-nagpur", "Circuit Bench, Nagpur"]],
  "dcdrc-blr": [["b1", "First Additional Bench"], ["b2", "Second Additional Bench"]],
  "scdrc-ka": [["pb", "Principal Bench"]],
  "scdrc-dl": [["pb", "Principal Bench"]],
  ncdrc: [["pb", "Principal Bench"], ["b2", "Additional Bench"]],
};

export const ESTABLISHMENTS: LocalityNode[] = COMPLEXES.flatMap((c) =>
  (c.kind ? BENCHES[c.id] : EST_KINDS).map(([k, label]) => ({ id: `${c.id}-${k}`, name: label, parentId: c.id })),
);

export const CASE_TYPES = [
  "Civil Suit",
  "Regular Civil Appeal",
  "Criminal Case",
  "Sessions Case",
  "Miscellaneous Application",
  "Execution Petition",
  "Bail Application",
  "Matrimonial Petition",
];

export const HC_CASE_TYPES = [
  "Writ Petition (Civil)",
  "Writ Petition (Criminal)",
  "First Appeal",
  "Second Appeal",
  "Civil Revision Application",
  "Criminal Appeal",
  "Criminal Petition",
  "Bail Application",
  "Letters Patent Appeal",
];

export const CONSUMER_CASE_TYPES = [
  "Consumer Complaint",
  "First Appeal",
  "Revision Petition",
  "Execution Application",
  "Interlocutory Application",
];

export const ACTS = [
  "Code of Civil Procedure, 1908",
  "Indian Penal Code, 1860",
  "Bharatiya Nyaya Sanhita, 2023",
  "Negotiable Instruments Act, 1881",
  "Hindu Marriage Act, 1955",
  "Transfer of Property Act, 1882",
  "Specific Relief Act, 1963",
  "Constitution of India",
  "Consumer Protection Act, 2019",
  "Code of Criminal Procedure, 1973",
];

function addDays(base: string, n: number) {
  const t = Date.parse(base + "T00:00:00Z") + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

interface SeedSpec {
  cnr: string;
  est: string;
  caseType: string;
  reg: string;
  filing: string;
  court: string;
  judge: string;
  pet: [string, string];
  res: [string, string];
  act: [string, string];
  next?: number;
  status?: "pending" | "disposed";
  stage: string;
  fir?: [string, string, number];
  saved?: boolean;
  ia?: boolean;
  transfer?: string;
  disposal?: string;
}

const SPECS: SeedSpec[] = [
  { cnr: "MHPU010004212024", est: "pune-dc-sd", caseType: "Civil Suit", reg: "421/2024", filing: "1180/2024", court: "4", judge: "Civil Judge S.D., Court 4", pet: ["Ramesh Deshmukh", "A. Kulkarni"], res: ["Pune Municipal Corporation", "S. Joshi"], act: ["Specific Relief Act, 1963", "38"], next: 0, stage: "Evidence", saved: true, ia: true },
  { cnr: "MHPU020011872023", est: "pune-dc-cjm", caseType: "Criminal Case", reg: "1187/2023", filing: "2210/2023", court: "2", judge: "Chief Judicial Magistrate", pet: ["State of Maharashtra", "Public Prosecutor"], res: ["Vikas Pawar", "A. Kulkarni"], act: ["Negotiable Instruments Act, 1881", "138"], next: 1, stage: "Arguments", fir: ["Shivajinagar", "212", 2023], saved: true },
  { cnr: "MHPU010009032022", est: "pune-dc-sd", caseType: "Regular Civil Appeal", reg: "903/2022", filing: "1544/2022", court: "4", judge: "Civil Judge S.D., Court 4", pet: ["Sunita Gaikwad", "M. Patil"], res: ["Anil Gaikwad", "A. Kulkarni"], act: ["Code of Civil Procedure, 1908", "96"], next: 0, stage: "Final hearing", saved: false },
  { cnr: "MHPU040002562025", est: "pune-dc-ds", caseType: "Bail Application", reg: "256/2025", filing: "301/2025", court: "1", judge: "District and Sessions Judge", pet: ["Sagar Jadhav", "A. Kulkarni"], res: ["State of Maharashtra", "Public Prosecutor"], act: ["Bharatiya Nyaya Sanhita, 2023", "318"], next: 3, stage: "Reply awaited", fir: ["Kothrud", "88", 2025], saved: true },
  { cnr: "MHMC010033012021", est: "mumbai-ccc-sd", caseType: "Civil Suit", reg: "3301/2021", filing: "5120/2021", court: "12", judge: "City Civil Judge, Court 12", pet: ["Harbour Traders Pvt Ltd", "R. Mehta"], res: ["Coastal Freight Co", "N. Shah"], act: ["Code of Civil Procedure, 1908", "Order 37"], status: "disposed", stage: "Decreed", disposal: "Decreed in favour of plaintiff", saved: true, transfer: "MHMC010021152020" },
  { cnr: "MHMC030004452024", est: "mumbai-ccc-cjm", caseType: "Criminal Case", reg: "445/2024", filing: "700/2024", court: "7", judge: "Metropolitan Magistrate, Court 7", pet: ["State of Maharashtra", "Public Prosecutor"], res: ["Imran Shaikh", "R. Mehta"], act: ["Indian Penal Code, 1860", "420"], next: 10, stage: "Framing of charge", fir: ["Colaba", "143", 2024] },
  { cnr: "KABN010017782024", est: "blr-ccc-sd", caseType: "Civil Suit", reg: "1778/2024", filing: "2601/2024", court: "9", judge: "Additional City Civil Judge, Court 9", pet: ["Lakshmi Narayan", "K. Rao"], res: ["Prestige Layout Residents Assn", "P. Hegde"], act: ["Transfer of Property Act, 1882", "53A"], next: 5, stage: "Issues" },
  { cnr: "KABN020006102023", est: "blr-ccc-jd", caseType: "Execution Petition", reg: "610/2023", filing: "988/2023", court: "3", judge: "Civil Judge J.D., Court 3", pet: ["Manjunath Gowda", "K. Rao"], res: ["Suresh Babu", "self"], act: ["Code of Civil Procedure, 1908", "Order 21"], next: -2, stage: "Warrant issued" },
  { cnr: "KAMY010002042025", est: "mys-dc-sd", caseType: "Matrimonial Petition", reg: "204/2025", filing: "330/2025", court: "2", judge: "Principal Judge, Family Court", pet: ["Divya Shetty", "P. Hegde"], res: ["Rohan Shetty", "A. Iyer"], act: ["Hindu Marriage Act, 1955", "13"], next: 14, stage: "Mediation" },
  { cnr: "DLST010019922024", est: "dl-saket-sd", caseType: "Civil Suit", reg: "1992/2024", filing: "3304/2024", court: "305", judge: "Civil Judge, Court 305", pet: ["Arora Builders LLP", "V. Malhotra"], res: ["Neha Kapoor", "S. Bhatia"], act: ["Specific Relief Act, 1963", "34"], next: 7, stage: "Admission/denial of documents" },
  { cnr: "DLST030008812023", est: "dl-saket-cjm", caseType: "Criminal Case", reg: "881/2023", filing: "1402/2023", court: "211", judge: "Metropolitan Magistrate, Court 211", pet: ["State", "Additional PP"], res: ["Karan Sethi", "V. Malhotra"], act: ["Negotiable Instruments Act, 1881", "138"], next: 1, stage: "Defence evidence", fir: ["Malviya Nagar", "56", 2023] },
  { cnr: "DLST040000672025", est: "dl-saket-ds", caseType: "Sessions Case", reg: "67/2025", filing: "90/2025", court: "4", judge: "Additional Sessions Judge-04", pet: ["State", "Additional PP"], res: ["Deepak Rawat", "S. Bhatia"], act: ["Bharatiya Nyaya Sanhita, 2023", "109"], next: 21, stage: "Prosecution evidence", fir: ["Hauz Khas", "301", 2025] },
  // High Court matters (not pre-saved, so they show up in search and lookups only).
  { cnr: "HCBM010004562025", est: "bhc-mumbai-as", caseType: "Writ Petition (Civil)", reg: "456/2025", filing: "1002/2025", court: "12", judge: "Division Bench, Court 12", pet: ["Shree Ganesh Co-op Housing Society", "N. Deshpande"], res: ["State of Maharashtra", "Government Pleader"], act: ["Constitution of India", "226"], next: 6, stage: "Admission" },
  { cnr: "HCKA010007892024", est: "khc-blr-pb", caseType: "Criminal Petition", reg: "789/2024", filing: "1450/2024", court: "7", judge: "Single Bench, Court 7", pet: ["Prakash Murthy", "N. Deshpande"], res: ["State of Karnataka", "State Public Prosecutor"], act: ["Code of Criminal Procedure, 1973", "482"], next: 9, stage: "Hearing" },
  { cnr: "HCDL010001232026", est: "dhc-main", caseType: "Letters Patent Appeal", reg: "123/2026", filing: "210/2026", court: "2", judge: "Division Bench, Court 2", pet: ["Yamuna Traders", "N. Deshpande"], res: ["Delhi Development Authority", "Standing Counsel"], act: ["Code of Civil Procedure, 1908", "100A"], next: 2, stage: "Notice" },
  // A consumer commission matter: no CNR. Its key is consumerRef("dcdrc-pune-main", "CC/412/2025") (checked by a unit test).
  { cnr: "EJ0XJWL8E1UM847W", est: "dcdrc-pune-main", caseType: "Consumer Complaint", reg: "CC/412/2025", filing: "DC/0702/2025", court: "", judge: "President and Member", pet: ["Meera Joshi", "A. Kulkarni"], res: ["Skyline Developers Pvt Ltd", "S. Joshi"], act: ["Consumer Protection Act, 2019", "35"], next: 4, stage: "Evidence by affidavit" },
];

export const ADVOCATES = [
  { name: "A. Kulkarni", barCode: "MAH/1876/2009" },
  { name: "M. Patil", barCode: "MAH/2290/2012" },
  { name: "R. Mehta", barCode: "MAH/0412/2001" },
  { name: "K. Rao", barCode: "KAR/1501/2010" },
  { name: "P. Hegde", barCode: "KAR/0877/2006" },
  { name: "V. Malhotra", barCode: "D/1123/2008" },
  { name: "S. Bhatia", barCode: "D/2044/2015" },
  { name: "N. Deshpande", barCode: "MAH/3310/2014" },
];

export function buildSeed(today: string): CourtCase[] {
  return SPECS.map((s, i) => {
    const complexId = ESTABLISHMENTS.find((e) => e.id === s.est)!.parentId!;
    const districtId = COMPLEXES.find((c) => c.id === complexId)!.parentId!;
    const stateId = DISTRICTS.find((d) => d.id === districtId)!.parentId!;
    const status = s.status ?? "pending";
    const next = status === "pending" && s.next !== undefined ? addDays(today, s.next) : undefined;
    const filed = addDays(`${s.reg.split("/").at(-1)}-01-20`, i * 11); // filing year matches the case number's year
    return {
      id: `seed-${s.cnr.toLowerCase()}`,
      cnr: s.cnr,
      caseType: s.caseType,
      filingNumber: s.filing,
      filingDate: filed,
      registrationNumber: s.reg,
      registrationDate: addDays(filed, 9),
      stateId,
      districtId,
      complexId,
      establishmentId: s.est,
      courtNo: s.court || undefined,
      judge: s.judge,
      status,
      stage: s.stage,
      nextHearingDate: next,
      natureOfDisposal: s.disposal,
      source: "seed",
      saved: Boolean(s.saved),
      parties: [
        { role: "petitioner", name: s.pet[0], advocateName: s.pet[1] },
        { role: "respondent", name: s.res[0], advocateName: s.res[1] },
      ],
      acts: [{ actName: s.act[0], section: s.act[1] }],
      fir: s.fir ? { policeStation: s.fir[0], firNumber: s.fir[1], firYear: s.fir[2] } : undefined,
      history: [
        { judge: s.judge, businessOn: addDays(filed, 30), hearingDate: addDays(filed, 75), purpose: "Appearance" },
        { judge: s.judge, businessOn: addDays(filed, 75), hearingDate: addDays(filed, 160), purpose: "Written statement" },
        { judge: s.judge, businessOn: addDays(filed, 160), hearingDate: next ?? addDays(filed, 240), purpose: s.stage },
      ],
      orders: [
        { id: `o-${i}-1`, orderNumber: "1", orderDate: addDays(filed, 30) },
        { id: `o-${i}-2`, orderNumber: "2", orderDate: addDays(filed, 160) },
      ],
      interimApps: s.ia
        ? [{ iaNumber: "IA 1/2024", filedBy: "Petitioner", status: "pending", filedOn: addDays(filed, 20) }]
        : [],
      transfers: s.transfer ? [{ oldRef: s.transfer, newRef: s.cnr, transferDate: addDays(filed, -5) }] : [],
      updatedAt: new Date(Date.parse(today + "T04:30:00Z")).toISOString(),
    };
  });
}
