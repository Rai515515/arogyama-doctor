import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CounsellingRequest } from '../../src/domain/types';

export interface AccessEntry {
  patientId: string;
  section: string;
  at: string;
}

interface DoctorState {
  signedIn: boolean;
  hideNames: boolean;
  reviewed: Record<string, string>; // patientId -> ISO time
  notes: Record<string, string>;
  counsellingStatus: Record<string, CounsellingRequest['status']>;
  sent: Record<string, string[]>; // patientId -> actions sent (demo)
  access: AccessEntry[];
  signIn: () => void;
  signOut: () => void;
  setHideNames: (v: boolean) => void;
  markReviewed: (id: string) => void;
  setNote: (id: string, text: string) => void;
  confirmCounselling: (requestId: string) => void;
  logAccess: (patientId: string, section: string) => void;
  recordSent: (patientId: string, what: string) => void;
}

export const useDoctor = create<DoctorState>()(
  persist(
    (set, get) => ({
      signedIn: false,
      hideNames: false,
      reviewed: {},
      notes: {},
      counsellingStatus: {},
      sent: {},
      access: [],
      signIn: () => set({ signedIn: true }),
      signOut: () => set({ signedIn: false }),
      setHideNames: (v) => set({ hideNames: v }),
      markReviewed: (id) => set({ reviewed: { ...get().reviewed, [id]: new Date().toISOString() } }),
      setNote: (id, text) => set({ notes: { ...get().notes, [id]: text } }),
      confirmCounselling: (requestId) => set({ counsellingStatus: { ...get().counsellingStatus, [requestId]: 'CONFIRMED' } }),
      logAccess: (patientId, section) => {
        const last = get().access[0];
        if (last && last.patientId === patientId && last.section === section && Date.now() - new Date(last.at).getTime() < 60000) return;
        set({ access: [{ patientId, section, at: new Date().toISOString() }, ...get().access].slice(0, 200) });
      },
      recordSent: (patientId, what) => set({ sent: { ...get().sent, [patientId]: [...(get().sent[patientId] ?? []), what] } }),
    }),
    { name: 'arogyama-doctor', version: 1 },
  ),
);
