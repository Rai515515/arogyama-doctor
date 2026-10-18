import type { BpReading, MoodCheck, PpiucdDecision, CounsellingRequest, PrivacySettings, Stage } from '../../src/domain/types';

/**
 * Demo patient panel for the doctor app. Every name, number and reading here is
 * invented. Shapes match what the patient app records, including what each
 * woman chose to share (PrivacySettings.share) — the doctor app never shows a
 * category the patient kept private.
 */

const DAY = 86400000;
const iso = (daysAgo: number, hour = 8, min = 15) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};
const dateOnly = (daysFromNow: number) => new Date(Date.now() + daysFromNow * DAY).toISOString().slice(0, 10);

export interface MedSummary {
  name: string;
  dose: string;
  taken: number;
  missed: number;
  /** last 7 days */
  scheduled: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  hospitalNo: string;
  phone: string;
  village: string;
  stage: Stage;
  dueDate: string;
  deliveryDate?: string;
  gravida: string;
  conditions: string[];
  language: 'en' | 'ta' | 'hi';
  share: PrivacySettings['share'];
  bp: BpReading[];
  meds: MedSummary[];
  vaccines: Record<string, string | undefined>;
  mood: MoodCheck[];
  ppiucd?: { decision: PpiucdDecision; questions?: string };
  counselling: CounsellingRequest[];
  nextVisit?: string;
  lastSync: string;
}

const bpSeries = (rows: [number, number, number, string[]?][]): BpReading[] =>
  rows.map(([ago, s, d, sym], i) => ({ id: `r${i}-${ago}`, at: iso(ago), systolic: s, diastolic: d, pulse: 84, symptoms: (sym ?? []) as BpReading['symptoms'] }));

const SHARE_ALL = { bp: true, medicines: true, vaccines: true, mood: true, contraception: true, counselling: true };
const SHARE_BASIC = { bp: true, medicines: true, vaccines: true, mood: false, contraception: false, counselling: false };

function epds(daysAgo: number, answers: number[]): MoodCheck {
  return { id: `m-${daysAgo}`, at: iso(daysAgo, 21, 0), answers, score: answers.reduce((a, b) => a + b, 0), item10: answers[9] };
}

export const PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'Ananya R.',
    age: 26,
    hospitalNo: '204517-K',
    phone: '+91 98xxxxxx10',
    village: 'Karaikal',
    stage: 'POSTPARTUM',
    dueDate: dateOnly(-14),
    deliveryDate: dateOnly(-12),
    gravida: 'G1 P1',
    conditions: ['Gestational hypertension'],
    language: 'ta',
    share: { ...SHARE_BASIC, counselling: true },
    bp: bpSeries([
      [6, 146, 94],
      [5, 142, 92],
      [4, 138, 88],
      [3, 152, 98],
      [2, 136, 86],
      [0, 164, 104, ['HEADACHE']],
    ]),
    meds: [
      { name: 'Labetalol', dose: '100 mg', taken: 12, missed: 2, scheduled: 14 },
      { name: 'Iron & Folic Acid', dose: '1 tablet', taken: 6, missed: 1, scheduled: 7 },
      { name: 'Calcium + Vitamin D3', dose: '500 mg', taken: 13, missed: 1, scheduled: 14 },
    ],
    vaccines: { td1: dateOnly(-132), td2: dateOnly(-104), bcg: dateOnly(-12), opv0: dateOnly(-12), hepb0: dateOnly(-12) },
    mood: [],
    counselling: [{ id: 'c1', at: iso(1, 20, 10), kind: 'BREASTFEEDING', mode: 'PHONE', preferredTime: 'EVENING', partnerJoining: false, topics: [], status: 'REQUESTED' }],
    nextVisit: iso(-30, 10, 30),
    lastSync: iso(0, 12, 40),
  },
  {
    id: 'p2',
    name: 'Kavitha S.',
    age: 29,
    hospitalNo: '198342-K',
    phone: '+91 94xxxxxx81',
    village: 'Thirunallar',
    stage: 'POSTPARTUM',
    dueDate: dateOnly(-30),
    deliveryDate: dateOnly(-26),
    gravida: 'G2 P2',
    conditions: [],
    language: 'ta',
    share: SHARE_ALL,
    bp: bpSeries([
      [9, 124, 80],
      [5, 122, 78],
      [1, 118, 76],
    ]),
    meds: [
      { name: 'Iron & Folic Acid', dose: '1 tablet', taken: 4, missed: 3, scheduled: 7 },
      { name: 'Calcium + Vitamin D3', dose: '500 mg', taken: 8, missed: 6, scheduled: 14 },
    ],
    vaccines: { td1: dateOnly(-150), td2: dateOnly(-120), bcg: dateOnly(-26), opv0: dateOnly(-26), hepb0: dateOnly(-26) },
    mood: [epds(15, [1, 1, 2, 2, 1, 2, 1, 1, 1, 0]), epds(2, [2, 2, 3, 2, 2, 2, 2, 2, 2, 1])],
    ppiucd: { decision: 'MORE_INFO', questions: 'Will it affect feeding? My mother-in-law says it causes weakness.' },
    counselling: [
      { id: 'c2', at: iso(2, 21, 30), kind: 'MENTAL_HEALTH', mode: 'PHONE', preferredTime: 'MORNING', partnerJoining: false, topics: [], status: 'REQUESTED' },
      { id: 'c3', at: iso(2, 21, 32), kind: 'COUPLE', mode: 'IN_PERSON', preferredTime: 'EVENING', partnerJoining: true, topics: ['Pressure from family', 'Sharing baby care'], status: 'REQUESTED' },
    ],
    nextVisit: iso(-16, 11, 0),
    lastSync: iso(0, 9, 5),
  },
  {
    id: 'p3',
    name: 'Priya Verma',
    age: 31,
    hospitalNo: '211908-K',
    phone: '+91 99xxxxxx47',
    village: 'Nedungadu',
    stage: 'PREGNANT',
    dueDate: dateOnly(48),
    gravida: 'G2 P1',
    conditions: ['Previous caesarean'],
    language: 'hi',
    share: { ...SHARE_ALL, mood: false },
    bp: bpSeries([
      [12, 128, 82],
      [6, 136, 88],
      [1, 142, 92, ['SWELLING']],
    ]),
    meds: [
      { name: 'Iron & Folic Acid', dose: '1 tablet', taken: 7, missed: 0, scheduled: 7 },
      { name: 'Calcium + Vitamin D3', dose: '500 mg', taken: 14, missed: 0, scheduled: 14 },
    ],
    vaccines: { td1: dateOnly(-60), td2: dateOnly(-31) },
    mood: [epds(10, [0, 0, 1, 1, 0, 1, 0, 0, 0, 0])],
    ppiucd: { decision: 'WITH_PARTNER' },
    counselling: [{ id: 'c4', at: iso(4, 19, 0), kind: 'FAMILY_PLANNING', mode: 'IN_PERSON', preferredTime: 'MORNING', partnerJoining: true, topics: [], status: 'CONFIRMED' }],
    nextVisit: iso(-3, 10, 0),
    lastSync: iso(1, 19, 22),
  },
  {
    id: 'p4',
    name: 'Fathima N.',
    age: 23,
    hospitalNo: '215066-K',
    phone: '+91 97xxxxxx02',
    village: 'Kottucherry',
    stage: 'PREGNANT',
    dueDate: dateOnly(112),
    gravida: 'G1 P0',
    conditions: ['Anaemia (Hb 9.6)'],
    language: 'ta',
    share: SHARE_BASIC,
    bp: bpSeries([
      [14, 112, 70],
      [7, 110, 72],
    ]),
    meds: [
      { name: 'Iron & Folic Acid', dose: '2 tablets', taken: 6, missed: 8, scheduled: 14 },
      { name: 'Calcium + Vitamin D3', dose: '500 mg', taken: 9, missed: 5, scheduled: 14 },
    ],
    vaccines: { td1: dateOnly(-44) },
    mood: [],
    counselling: [],
    nextVisit: iso(-2, 9, 30),
    lastSync: iso(3, 8, 10),
  },
  {
    id: 'p5',
    name: 'Sunita Devi',
    age: 34,
    hospitalNo: '187233-K',
    phone: '+91 93xxxxxx55',
    village: 'Karaikal',
    stage: 'POSTPARTUM',
    dueDate: dateOnly(-50),
    deliveryDate: dateOnly(-47),
    gravida: 'G3 P3',
    conditions: ['Pre-eclampsia (delivered)'],
    language: 'hi',
    share: SHARE_ALL,
    bp: bpSeries([
      [20, 148, 96],
      [14, 140, 90],
      [8, 134, 86],
      [2, 128, 82],
    ]),
    meds: [
      { name: 'Labetalol', dose: '100 mg', taken: 14, missed: 0, scheduled: 14 },
      { name: 'Iron & Folic Acid', dose: '1 tablet', taken: 7, missed: 0, scheduled: 7 },
    ],
    vaccines: { td1: dateOnly(-170), td2: dateOnly(-140), bcg: dateOnly(-47), opv0: dateOnly(-47), hepb0: dateOnly(-47) },
    mood: [epds(20, [0, 0, 1, 0, 0, 1, 0, 0, 0, 0])],
    ppiucd: { decision: 'YES' },
    counselling: [],
    nextVisit: iso(-1, 10, 0),
    lastSync: iso(0, 7, 55),
  },
  {
    id: 'p6',
    name: 'Meenakshi P.',
    age: 27,
    hospitalNo: '209871-K',
    phone: '+91 90xxxxxx38',
    village: 'Ambagarathur',
    stage: 'PREGNANT',
    dueDate: dateOnly(190),
    gravida: 'G1 P0',
    conditions: [],
    language: 'ta',
    share: SHARE_BASIC,
    bp: bpSeries([[5, 108, 68]]),
    meds: [{ name: 'Folic acid', dose: '1 tablet', taken: 7, missed: 0, scheduled: 7 }],
    vaccines: {},
    mood: [],
    counselling: [],
    nextVisit: iso(-6, 9, 0),
    lastSync: iso(0, 10, 30),
  },
  {
    id: 'p7',
    name: 'Rekha Kumari',
    age: 25,
    hospitalNo: '216402-K',
    phone: '+91 96xxxxxx71',
    village: 'Thirupattinam',
    stage: 'PREGNANT',
    dueDate: dateOnly(20),
    gravida: 'G1 P0',
    conditions: [],
    language: 'hi',
    share: SHARE_ALL,
    bp: bpSeries([
      [10, 118, 76],
      [3, 120, 78],
    ]),
    meds: [
      { name: 'Iron & Folic Acid', dose: '1 tablet', taken: 7, missed: 0, scheduled: 7 },
      { name: 'Calcium + Vitamin D3', dose: '500 mg', taken: 14, missed: 0, scheduled: 14 },
    ],
    vaccines: { td1: dateOnly(-120), td2: dateOnly(-92) },
    mood: [epds(6, [0, 1, 1, 1, 1, 0, 0, 0, 0, 0])],
    ppiucd: { decision: 'UNDECIDED' },
    counselling: [],
    nextVisit: iso(-5, 11, 30),
    lastSync: iso(0, 11, 2),
  },
  {
    id: 'p8',
    name: 'Lakshmi V.',
    age: 30,
    hospitalNo: '201377-K',
    phone: '+91 95xxxxxx64',
    village: 'Karaikal',
    stage: 'POSTPARTUM',
    dueDate: dateOnly(-70),
    deliveryDate: dateOnly(-66),
    gravida: 'G2 P2',
    conditions: [],
    language: 'ta',
    share: SHARE_BASIC,
    bp: bpSeries([[30, 120, 80]]),
    meds: [{ name: 'Iron & Folic Acid', dose: '1 tablet', taken: 5, missed: 2, scheduled: 7 }],
    vaccines: { td1: dateOnly(-190), td2: dateOnly(-160), bcg: dateOnly(-66), opv0: dateOnly(-66), hepb0: dateOnly(-66) },
    mood: [],
    counselling: [],
    lastSync: iso(5, 18, 0),
  },
];

export const DOCTOR = { id: 'DOC-1042', name: 'Dr. Meera Sharma', unit: 'Obstetrics OPD', clinic: 'Arogyama Women’s Health Centre' };
