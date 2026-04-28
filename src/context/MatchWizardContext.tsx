import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FONDO } from "@/lib/scoring";

const STORAGE_KEY = "fyp_match_wizard_draft_v1";

export interface MatchDraft {
  players: string[];
  teamA: string[];
  teamB: string[];
  contribution: number;
  fecha: string;
  venuePreset: string;
  venueCustom: string;
  isFriendly: boolean;
}

interface MatchWizardContextValue {
  draft: MatchDraft;
  setDraft: (patch: Partial<MatchDraft>) => void;
  resetDraft: () => void;
}

const MatchWizardContext = createContext<MatchWizardContextValue | null>(null);

const unique = (ids: string[]) => [...new Set(ids)];

const nextSundayAt11 = () => {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(11, 0, 0, 0);
  const iso = d.toISOString();
  return iso.slice(0, 16);
};

const defaultDraft = (): MatchDraft => ({
  players: [],
  teamA: [],
  teamB: [],
  contribution: FONDO.APORTE_POR_PARTIDO,
  fecha: nextSundayAt11(),
  venuePreset: "Cancha Norte",
  venueCustom: "",
  isFriendly: false,
});

const normalizeDraft = (input: MatchDraft): MatchDraft => {
  const players = unique(input.players);
  const selected = new Set(players);
  const teamA = unique(input.teamA).filter((id) => selected.has(id));
  const teamASet = new Set(teamA);
  const teamB = unique(input.teamB).filter((id) => selected.has(id) && !teamASet.has(id));

  return {
    ...input,
    players,
    teamA,
    teamB,
    contribution: Number.isFinite(input.contribution) ? Math.max(0, Math.round(input.contribution)) : FONDO.APORTE_POR_PARTIDO,
  };
};

const loadInitialDraft = (): MatchDraft => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDraft();
    const parsed = JSON.parse(raw) as MatchDraft;
    return normalizeDraft({ ...defaultDraft(), ...parsed });
  } catch {
    return defaultDraft();
  }
};

export const MatchWizardProvider = ({ children }: { children: ReactNode }) => {
  const [draft, setDraftState] = useState<MatchDraft>(loadInitialDraft);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const value = useMemo<MatchWizardContextValue>(
    () => ({
      draft,
      setDraft: (patch) => {
        setDraftState((prev) => normalizeDraft({ ...prev, ...patch }));
      },
      resetDraft: () => {
        const next = defaultDraft();
        setDraftState(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
    }),
    [draft],
  );

  return <MatchWizardContext.Provider value={value}>{children}</MatchWizardContext.Provider>;
};

export const useMatchWizard = () => {
  const ctx = useContext(MatchWizardContext);
  if (!ctx) {
    throw new Error("useMatchWizard debe usarse dentro de MatchWizardProvider");
  }
  return ctx;
};
