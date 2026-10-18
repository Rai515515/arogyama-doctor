import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { PATIENTS, DOCTOR, type Patient } from './data';
import { flagsFor, riskScore, topLevel, type Flag } from './risk';
import { useDoctor } from './store';
import { useT, useFmt, usePick } from '../../src/i18n';
import LangSwitch from '../../src/components/LangSwitch';
import BpChart from '../../src/components/BpChart';
import CountRibbon from '../../src/components/CountRibbon';
import { stageContext } from '../../src/domain/seed';
import { bpLevel } from '../../src/utils/bp';
import { vaccineRows, VACCINE_GROUPS_BABY } from '../../src/content/vaccines';
import { epdsBand } from '../../src/content/epds';
import { FACTS } from '../../src/content/facts';
import { SOURCES } from '../../src/content/sources';
import { LockIcon, PhoneIcon, ArrowLeftIcon, ShieldIcon } from '../../src/components/icons';

const AUTO_LOCK_MS = 5 * 60 * 1000;

function useAutoLock() {
  const signOut = useDoctor((s) => s.signOut);
  useEffect(() => {
    let timer = setTimeout(signOut, AUTO_LOCK_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(signOut, AUTO_LOCK_MS);
    };
    const evs = ['pointerdown', 'keydown', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      evs.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [signOut]);
}

function displayName(p: Patient, hide: boolean) {
  if (!hide) return p.name;
  return p.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('. ') + '.';
}

function stageLabel(p: Patient, t: ReturnType<typeof useT>) {
  const ctx = stageContext(p.stage, p.dueDate, p.deliveryDate);
  return p.stage === 'POSTPARTUM' ? t('Day {d} after birth', { d: ctx.ppDay }) : t('{w} weeks pregnant', { w: ctx.weeks });
}

// ---------------------------------------------------------------------------

function Login() {
  const t = useT();
  const signIn = useDoctor((s) => s.signIn);
  const [id, setId] = useState(DOCTOR.id);
  const [pin, setPin] = useState('');
  return (
    <div className="d-login">
      <div className="d-login-card">
        <div className="d-brand">
          <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
            <path d="M20 6c7 5 10 11 10 16a10 10 0 0 1-20 0c0-5 3-11 10-16Z" fill="var(--turmeric)" />
            <path d="M20 14v20" stroke="var(--neem-dark)" strokeWidth="1.8" />
          </svg>
          <span>
            Arogyama <em>{t('for doctors')}</em>
          </span>
        </div>
        <LangSwitch />
        <h1>{t('Sign in to the clinic panel')}</h1>
        <p className="soft">{DOCTOR.clinic}</p>
        <div className="field">
          <label htmlFor="docid">{t('Doctor ID')}</label>
          <input id="docid" value={id} onChange={(e) => setId(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pin">{t('PIN')}</label>
          <input id="pin" type="password" inputMode="numeric" value={pin} placeholder="••••" onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <div className="field-hint">{t('Demo: any 4 digits.')}</div>
        </div>
        <button className="btn btn-primary btn-block" disabled={pin.length < 4 || !id} onClick={signIn}>
          {t('Sign in')}
        </button>
        <p className="d-login-note">
          <ShieldIcon width={16} height={16} /> {t('Demo data only. Every name and number is invented. The panel locks itself after 5 minutes without use.')}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

type Filter = 'ATTENTION' | 'ALL' | 'PREGNANT' | 'POSTPARTUM';

function Panel() {
  const t = useT();
  const fmt = useFmt();
  const { id } = useParams();
  const navigate = useNavigate();
  const hide = useDoctor((s) => s.hideNames);
  const setHide = useDoctor((s) => s.setHideNames);
  const signOut = useDoctor((s) => s.signOut);
  const reviewed = useDoctor((s) => s.reviewed);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('ATTENTION');
  useAutoLock();

  const rows = useMemo(
    () =>
      PATIENTS.map((p) => {
        const flags = flagsFor(p);
        return { p, flags, score: riskScore(flags), level: topLevel(flags) };
      }).sort((a, b) => b.score - a.score),
    [],
  );

  const shown = rows.filter(({ p, level }) => {
    if (q && !`${p.name} ${p.hospitalNo}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'ATTENTION') return level === 'urgent' || level === 'attention';
    if (filter === 'PREGNANT') return p.stage === 'PREGNANT';
    if (filter === 'POSTPARTUM') return p.stage === 'POSTPARTUM';
    return true;
  });

  const urgent = rows.filter((r) => r.level === 'urgent').length;
  const attention = rows.filter((r) => r.level === 'attention').length;
  const in40 = rows.filter((r) => r.p.stage === 'POSTPARTUM' && stageContext(r.p.stage, r.p.dueDate, r.p.deliveryDate).ppDay <= 42).length;
  const selected = rows.find((r) => r.p.id === id);

  return (
    <div className={`d-shell${selected ? ' has-selection' : ''}`}>
      <header className="d-top">
        <div className="d-brand small-brand">
          <svg viewBox="0 0 40 40" width="22" height="22" aria-hidden="true">
            <path d="M20 6c7 5 10 11 10 16a10 10 0 0 1-20 0c0-5 3-11 10-16Z" fill="var(--turmeric)" />
          </svg>
          <span>Arogyama</span>
        </div>
        <div className="d-top-mid">
          <strong>{t(DOCTOR.name)}</strong>
          <span>
            {t(DOCTOR.unit)}, {fmt.date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="d-top-actions">
          <label className="d-hide">
            <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
            {t('Hide names on screen')}
          </label>
          <LangSwitch compact />
          <button className="btn btn-outline btn-sm" onClick={signOut}>
            <LockIcon width={15} height={15} /> {t('Lock')}
          </button>
        </div>
      </header>

      <aside className="d-list">
        <div className="d-summary">
          <button className={`d-sum urgent${filter === 'ATTENTION' ? ' on' : ''}`} onClick={() => setFilter('ATTENTION')}>
            <span className="d-sum-n">{urgent}</span>
            <span>{t('urgent today')}</span>
          </button>
          <button className={`d-sum attention${filter === 'ATTENTION' ? ' on' : ''}`} onClick={() => setFilter('ATTENTION')}>
            <span className="d-sum-n">{attention}</span>
            <span>{t('need review')}</span>
          </button>
          <button className={`d-sum window${filter === 'POSTPARTUM' ? ' on' : ''}`} onClick={() => setFilter('POSTPARTUM')}>
            <span className="d-sum-n">{in40}</span>
            <span>{t('in the 40 days')}</span>
          </button>
        </div>
        <input className="d-search" placeholder={t('Search name or hospital number')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="d-filters">
          {(
            // i18n-list
            [
              ['ATTENTION', 'Needs attention'],
              ['ALL', 'All'],
              ['PREGNANT', 'Pregnant'],
              ['POSTPARTUM', 'After birth'],
            ] as [Filter, string][]
            // end-i18n-list
          ).map(([k, label]) => (
            <button key={k} className={`chip${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>
              {t(label)}
            </button>
          ))}
        </div>
        <ul className="d-rows">
          {shown.map(({ p, flags, level }) => (
            <li key={p.id}>
              <button className={`d-row${id === p.id ? ' selected' : ''}`} onClick={() => navigate(`/p/${p.id}`)}>
                <span className={`d-dot ${level ?? 'none'}`} aria-hidden="true" />
                <span className="d-row-main">
                  <span className="d-row-name">
                    {displayName(p, hide)}
                    {reviewed[p.id] && <span className="d-reviewed">{t('reviewed')}</span>}
                  </span>
                  <span className="d-row-meta">
                    {p.hospitalNo} — {stageLabel(p, t)}
                  </span>
                  {flags.length > 0 && (
                    <span className="d-row-flags">
                      {flags.slice(0, 3).map((f) => (
                        <span key={f.id} className={`flag flag-${f.level}`}>
                          {t(f.label, f.vars)}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="empty-state">{t('No patients match.')}</li>}
        </ul>
        <Updates />
      </aside>

      <main className="d-detail">{selected ? <Detail p={selected.p} flags={selected.flags} /> : <EmptyDetail />}</main>
    </div>
  );
}

function EmptyDetail() {
  const t = useT();
  return (
    <div className="d-empty">
      <h2>{t('Choose a patient')}</h2>
      <p className="soft">{t('Patients who need you first are at the top. Red means call today.')}</p>
    </div>
  );
}

/** Sourced programme updates, the same facts patients see. */
function Updates() {
  const t = useT();
  const p = usePick();
  const fmt = useFmt();
  const news = FACTS.filter((f) => f.kind === 'news').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return (
    <section className="d-updates">
      <h3>{t('Programme updates')}</h3>
      {news.slice(0, 3).map((f) => (
        <div key={f.id} className="d-update">
          <span className="muted small">{f.date && fmt.date(f.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span>{p(f.text)}</span>
          {f.source && (
            <a href={SOURCES[f.source].url} target="_blank" rel="noreferrer" className="small">
              {SOURCES[f.source].publisher.split(/[,(]/)[0].trim()}
            </a>
          )}
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------

function NotShared({ what }: { what: string }) {
  const t = useT();
  return (
    <div className="d-locked">
      <LockIcon width={18} height={18} />
      <span>{t('{what}: not shared by the patient.', { what: t(what) })}</span>
    </div>
  );
}

function Detail({ p, flags }: { p: Patient; flags: Flag[] }) {
  const t = useT();
  const fmt = useFmt();
  const navigate = useNavigate();
  const hide = useDoctor((s) => s.hideNames);
  const notes = useDoctor((s) => s.notes);
  const setNote = useDoctor((s) => s.setNote);
  const reviewed = useDoctor((s) => s.reviewed);
  const markReviewed = useDoctor((s) => s.markReviewed);
  const counsellingStatus = useDoctor((s) => s.counsellingStatus);
  const confirmCounselling = useDoctor((s) => s.confirmCounselling);
  const logAccess = useDoctor((s) => s.logAccess);
  const access = useDoctor((s) => s.access);
  const sent = useDoctor((s) => s.sent);
  const recordSent = useDoctor((s) => s.recordSent);
  const ctx = stageContext(p.stage, p.dueDate, p.deliveryDate);

  useEffect(() => {
    logAccess(p.id, 'summary');
  }, [p.id, logAccess]);

  const vRows = vaccineRows({ records: p.vaccines, stage: p.stage, dueDate: p.dueDate, birthDate: p.deliveryDate });
  const motherRows = vRows.filter((r) => r.vaccine.who === 'mother');
  const babyRows = vRows.filter((r) => r.vaccine.who === 'baby' && VACCINE_GROUPS_BABY.slice(0, 4).includes(r.vaccine.group));
  const moods = [...p.mood].sort((a, b) => b.at.localeCompare(a.at));
  const bpSorted = [...p.bp].sort((a, b) => b.at.localeCompare(a.at));
  const myAccess = access.filter((a) => a.patientId === p.id).slice(0, 4);

  return (
    <article className="d-patient">
      <button className="back-button d-back" onClick={() => navigate('/')}>
        <ArrowLeftIcon width={16} height={16} /> {t('All patients')}
      </button>

      <header className="d-head">
        <div>
          <h1>{displayName(p, hide)}</h1>
          <p className="soft">
            {t('{age} years', { age: p.age })}, {p.gravida}, {t('Hospital number')} {p.hospitalNo}
          </p>
          <p className="soft">
            {p.village}
            {p.conditions.length > 0 && <> — {p.conditions.map((c) => t(c)).join(', ')}</>}
          </p>
        </div>
        <div className="d-head-actions">
          <a className="btn btn-outline btn-sm" href={`tel:${p.phone.replace(/\s|x/g, '')}`}>
            <PhoneIcon width={15} height={15} /> {t('Call')}
          </a>
          <button className="btn btn-primary btn-sm" onClick={() => markReviewed(p.id)} disabled={Boolean(reviewed[p.id])}>
            {reviewed[p.id] ? t('Reviewed {time}', { time: fmt.time(reviewed[p.id]) }) : t('Mark reviewed')}
          </button>
        </div>
      </header>

      <div className="d-stage">
        <div className="d-stage-num">
          <span>{p.stage === 'POSTPARTUM' ? ctx.ppDay : ctx.weeks}</span>
          {p.stage === 'POSTPARTUM' ? t('days since birth') : t('weeks pregnant')}
        </div>
        <CountRibbon value={p.stage === 'POSTPARTUM' ? ctx.ppDay : ctx.weeks} label={stageLabel(p, t)} />
        <div className="muted small">
          {t('App last synced {time}', { time: `${fmt.date(p.lastSync)}, ${fmt.time(p.lastSync)}` })}
        </div>
      </div>

      {flags.length > 0 && (
        <section className="d-actions">
          <h2>{t('What needs doing')}</h2>
          <ul>
            {flags.map((f) => (
              <li key={f.id} className={`d-action d-action-${f.level}`}>
                <strong>{t(f.label, f.vars)}</strong>
                <span>{t(f.action)}</span>
              </li>
            ))}
          </ul>
          <div className="row-gap">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => recordSent(p.id, 'reminder')}
              disabled={(sent[p.id] ?? []).includes('reminder')}
            >
              {(sent[p.id] ?? []).includes('reminder') ? t('Reminder sent (demo)') : t('Send her a reminder (demo)')}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => recordSent(p.id, 'referral')}
              disabled={(sent[p.id] ?? []).includes('referral')}
            >
              {(sent[p.id] ?? []).includes('referral') ? t('Referred (demo)') : t('Refer to counsellor (demo)')}
            </button>
          </div>
        </section>
      )}

      <div className="d-grid">
        {/* BP */}
        <section className="d-card span2">
          <h2>{p.stage === 'POSTPARTUM' ? t('BP in the 40 days after birth') : t('Blood pressure')}</h2>
          {!p.share.bp ? (
            <NotShared what="BP readings" />
          ) : (
            <>
              <BpChart readings={p.bp} labels={{ high: t('140/90 line') }} height={140} />
              <table className="d-table">
                <thead>
                  <tr>
                    <th>{t('When')}</th>
                    <th>BP</th>
                    <th>{t('Symptoms')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bpSorted.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td>
                        {fmt.date(r.at)}, {fmt.time(r.at)}
                      </td>
                      <td className={`bp-${bpLevel(r).toLowerCase()}`}>
                        <strong>
                          {r.systolic}/{r.diastolic}
                        </strong>
                      </td>
                      <td>{r.symptoms.length ? r.symptoms.map((s) => t(SYMPTOM_LABEL[s])).join(', ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* Medicines */}
        <section className="d-card">
          <h2>{t('Medicines, last 7 days')}</h2>
          {!p.share.medicines ? (
            <NotShared what="Medicines" />
          ) : (
            p.meds.map((m) => {
              const pct = Math.round((m.taken / m.scheduled) * 100);
              return (
                <div key={m.name} className="d-med">
                  <div className="d-med-head">
                    <span>
                      {t(m.name)} <span className="muted">{t(m.dose)}</span>
                    </span>
                    <strong className={pct < 75 ? 'warn' : undefined}>{pct}%</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct < 75 ? 'var(--turmeric)' : undefined }} />
                  </div>
                  <span className="muted small">{t('{n} missed', { n: m.missed })}</span>
                </div>
              );
            })
          )}
        </section>

        {/* Vaccines */}
        <section className="d-card">
          <h2>{t('Vaccines')}</h2>
          {!p.share.vaccines ? (
            <NotShared what="Vaccines" />
          ) : (
            <>
              <div className="d-vax-label">{t('Mother')}</div>
              <div className="d-vax">
                {motherRows.map((r) => (
                  <span key={r.vaccine.id} className={`d-vax-pill v-${r.status === 'overdue' && p.stage === 'POSTPARTUM' ? 'missed' : r.status}`}>
                    {r.vaccine.short}
                  </span>
                ))}
              </div>
              <div className="d-vax-label">{t('Baby')}</div>
              <div className="d-vax">
                {babyRows.map((r) => (
                  <span key={r.vaccine.id} className={`d-vax-pill v-${r.status}`} title={t(r.vaccine.group)}>
                    {r.vaccine.short}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Mood */}
        <section className="d-card">
          <h2>{t('Mood checks (EPDS)')}</h2>
          {!p.share.mood ? (
            <NotShared what="Mood check results" />
          ) : moods.length === 0 ? (
            <p className="muted">{t('No checks yet.')}</p>
          ) : (
            <ul className="d-mood">
              {moods.map((m) => {
                const band = epdsBand(m.score, m.item10);
                return (
                  <li key={m.id} className={`mood-${band}`}>
                    <strong>{m.score}/30</strong>
                    <span>{fmt.date(m.at)}</span>
                    <span>{band === 'urgent' ? t('self-harm item positive') : band === 'possible' ? t('10 or more: possible depression') : t('below 10')}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="muted small">{t('Screening, not diagnosis. Cut-off 10; any positive answer to item 10 needs same-day assessment.')}</p>
        </section>

        {/* Counselling + contraception */}
        <section className="d-card">
          <h2>{t('Counselling and contraception')}</h2>
          {!p.share.counselling ? (
            <NotShared what="Counselling requests" />
          ) : p.counselling.length === 0 ? (
            <p className="muted">{t('No requests.')}</p>
          ) : (
            <ul className="d-req">
              {p.counselling.map((c) => {
                const status = counsellingStatus[c.id] ?? c.status;
                return (
                  <li key={c.id}>
                    <div>
                      <strong>{t(KIND_LABEL[c.kind])}</strong>
                      <span className="muted small">
                        {t(c.mode === 'PHONE' ? 'Phone call' : 'In person')}, {t(c.preferredTime === 'MORNING' ? 'Morning' : c.preferredTime === 'AFTERNOON' ? 'Afternoon' : 'Evening')}
                        {c.partnerJoining ? `, ${t('partner joining')}` : ''}
                      </span>
                      {c.topics.length > 0 && <span className="small">{c.topics.map((x) => t(x)).join(', ')}</span>}
                    </div>
                    {status === 'REQUESTED' ? (
                      <button className="btn btn-outline btn-sm" onClick={() => confirmCounselling(c.id)}>
                        {t('Confirm slot')}
                      </button>
                    ) : (
                      <span className="ok-line small">{t('Confirmed')}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="d-sub">
            <span className="d-vax-label">PPIUCD</span>
            {!p.share.contraception ? (
              <NotShared what="Contraception choice" />
            ) : p.ppiucd ? (
              <>
                <p>
                  <strong>{t(PPIUCD_LABEL[p.ppiucd.decision])}</strong>
                </p>
                {p.ppiucd.questions && <blockquote className="d-quote">{p.ppiucd.questions}</blockquote>}
              </>
            ) : (
              <p className="muted">{t('Not recorded')}</p>
            )}
          </div>
        </section>

        {/* Notes + access log */}
        <section className="d-card">
          <h2>{t('My notes')}</h2>
          <textarea className="d-notes" rows={4} value={notes[p.id] ?? ''} placeholder={t('Only you see these notes on this device.')} onChange={(e) => setNote(p.id, e.target.value)} />
          <h3 className="d-log-h">{t('Who opened this record')}</h3>
          <ul className="d-log">
            {myAccess.map((a, i) => (
              <li key={i}>
                {t(DOCTOR.name)} — {fmt.date(a.at)}, {fmt.time(a.at)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

// i18n-list
const SYMPTOM_LABEL: Record<string, string> = {
  HEADACHE: 'Severe headache',
  VISION: 'Blurred vision or seeing spots',
  RIB_PAIN: 'Pain below the ribs',
  SWELLING: 'Sudden swelling of face or hands',
  BREATHLESS: 'Short of breath',
  FITS: 'Fits (seizure)',
};
const KIND_LABEL: Record<string, string> = {
  MENTAL_HEALTH: 'Mental health counselling',
  COUPLE: 'Couple counselling',
  BREASTFEEDING: 'Breastfeeding help',
  FAMILY_PLANNING: 'Contraception and spacing',
};
const PPIUCD_LABEL: Record<string, string> = {
  YES: 'Wants PPIUCD',
  NO: 'Does not want PPIUCD',
  MORE_INFO: 'Wants more information',
  WITH_PARTNER: 'Will decide with partner',
  UNDECIDED: 'Not decided',
};
export const CONDITION_LABELS = ['Gestational hypertension', 'Previous caesarean', 'Anaemia (Hb 9.6)', 'Pre-eclampsia (delivered)', 'Obstetrics OPD'];
// end-i18n-list

export default function App() {
  const signedIn = useDoctor((s) => s.signedIn);
  return (
    <HashRouter>
      {!signedIn ? (
        <Login />
      ) : (
        <Routes>
          <Route path="/" element={<Panel />} />
          <Route path="/p/:id" element={<Panel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </HashRouter>
  );
}
