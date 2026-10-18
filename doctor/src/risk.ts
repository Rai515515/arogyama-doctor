import type { Patient } from './data';
import { bpLevel, latestReading } from '../../src/utils/bp';
import { vaccineRows } from '../../src/content/vaccines';
import { epdsBand } from '../../src/content/epds';
import { stageContext } from '../../src/domain/seed';

/**
 * Turns what the patient recorded into flags for the clinic. Flags say what to
 * look at and how soon — never a diagnosis or a dose change.
 */

export type FlagLevel = 'urgent' | 'attention' | 'info';

export interface Flag {
  id: string;
  level: FlagLevel;
  /** English label, translated with t() */
  label: string;
  vars?: Record<string, string | number>;
  /** English action text, translated with t() */
  action: string;
}

const DAY = 86400000;

export function flagsFor(p: Patient, today = new Date()): Flag[] {
  const flags: Flag[] = [];
  const ctx = stageContext(p.stage, p.dueDate, p.deliveryDate, today);

  if (p.share.bp) {
    const last = latestReading(p.bp);
    if (last) {
      const lv = bpLevel(last);
      if (lv === 'SEVERE')
        flags.push({ id: 'bp-severe', level: 'urgent', label: 'BP {s}/{d}{sym}', vars: { s: last.systolic, d: last.diastolic, sym: last.symptoms.length ? ' +' : '' }, action: 'Call her now and ask her to come to hospital.' });
      else if (lv === 'HIGH') flags.push({ id: 'bp-high', level: 'attention', label: 'BP {s}/{d}', vars: { s: last.systolic, d: last.diastolic }, action: 'Review today. Consider an earlier visit.' });
    }
    const inWindow = p.stage === 'POSTPARTUM' && ctx.ppDay <= 42;
    const lastAt = last ? new Date(last.at).getTime() : 0;
    if (inWindow && today.getTime() - lastAt > 3 * DAY) flags.push({ id: 'bp-gap', level: 'attention', label: 'No BP for {n} days', vars: { n: Math.floor((today.getTime() - lastAt) / DAY) }, action: 'Remind her to log BP — still inside the 40-day window.' });
  }

  if (p.share.mood && p.mood.length) {
    const m = [...p.mood].sort((a, b) => b.at.localeCompare(a.at))[0];
    const band = epdsBand(m.score, m.item10);
    if (band === 'urgent') flags.push({ id: 'mood-urgent', level: 'urgent', label: 'EPDS {s}, self-harm item positive', vars: { s: m.score }, action: 'Same-day assessment. Arrange psychiatry review.' });
    else if (band === 'possible') flags.push({ id: 'mood-possible', level: 'attention', label: 'EPDS {s}', vars: { s: m.score }, action: 'Offer counselling; repeat EPDS in 2 weeks.' });
  }

  if (p.share.medicines) {
    const missed = p.meds.reduce((a, m) => a + m.missed, 0);
    const scheduled = p.meds.reduce((a, m) => a + m.scheduled, 0);
    if (scheduled > 0 && missed / scheduled >= 0.25) flags.push({ id: 'meds', level: 'attention', label: '{n} doses missed this week', vars: { n: missed }, action: 'Ask what gets in the way (side effects, supply, family).' });
  }

  if (p.share.vaccines) {
    const rows = vaccineRows({ records: p.vaccines, stage: p.stage, dueDate: p.dueDate, birthDate: p.deliveryDate, today });
    const overdue = rows.filter((r) => r.status === 'overdue' && !(r.vaccine.who === 'mother' && p.stage === 'POSTPARTUM'));
    const due = rows.filter((r) => r.status === 'due' && !(r.vaccine.who === 'mother' && p.stage === 'POSTPARTUM'));
    if (overdue.length) flags.push({ id: 'vax-overdue', level: 'attention', label: 'Vaccine overdue: {v}', vars: { v: overdue.map((r) => r.vaccine.short).join(', ') }, action: 'Give at this visit or send to the immunisation session.' });
    else if (due.length) flags.push({ id: 'vax-due', level: 'info', label: 'Vaccine due: {v}', vars: { v: due.map((r) => r.vaccine.short).join(', ') }, action: 'Give at this visit.' });
  }

  if (p.share.counselling) {
    const open = p.counselling.filter((c) => c.status === 'REQUESTED');
    if (open.length) flags.push({ id: 'counsel', level: 'info', label: '{n} counselling request(s)', vars: { n: open.length }, action: 'Call back to fix a time.' });
  }

  if (p.share.contraception && p.ppiucd && (p.ppiucd.decision === 'MORE_INFO' || p.ppiucd.decision === 'WITH_PARTNER') && (p.stage === 'POSTPARTUM' || ctx.weeks >= 28)) {
    flags.push({ id: 'ppiucd', level: 'info', label: 'PPIUCD: wants to discuss', action: 'Counsel privately at the next visit.' });
  }

  return flags;
}

const RANK: Record<FlagLevel, number> = { urgent: 100, attention: 10, info: 1 };

export function riskScore(flags: Flag[]): number {
  return flags.reduce((a, f) => a + RANK[f.level], 0);
}

export function topLevel(flags: Flag[]): FlagLevel | null {
  if (flags.some((f) => f.level === 'urgent')) return 'urgent';
  if (flags.some((f) => f.level === 'attention')) return 'attention';
  if (flags.length) return 'info';
  return null;
}
