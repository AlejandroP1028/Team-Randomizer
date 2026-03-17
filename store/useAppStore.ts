import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Participant, TeamConfig, Team, SolverWarning, Preset } from "@/lib/types";

interface AppState {
  participants: Participant[];
  config: TeamConfig;
  teams: Team[];
  warnings: SolverWarning[];
  teamHistory: Team[][];
  presets: Preset[];
  activePresetId: string | null;
  loading: boolean;

  setParticipants: (p: Participant[]) => void;
  setConfig: (c: Partial<TeamConfig>) => void;
  setLoading: (l: boolean) => void;
  setResult: (teams: Team[], warnings: SolverWarning[]) => void;
  swap: (srcTi: number, srcMi: number, dstTi: number, dstMi: number) => void;
  move: (srcTi: number, srcMi: number, dstTi: number) => void;
  undo: () => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
}

const MAX_HISTORY = 20;

function cloneTeams(teams: Team[]): Team[] {
  return teams.map(t => ({ ...t, members: [...t.members] }));
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      participants: [],
      config: { strategy: "balanced_skill", teamCount: 3 },
      teams: [],
      warnings: [],
      teamHistory: [],
      presets: [],
      activePresetId: null,
      loading: false,

      setParticipants: (participants) => set({ participants }),
      setConfig: (c) => set(s => ({ config: { ...s.config, ...c } })),
      setLoading: (loading) => set({ loading }),
      setResult: (teams, warnings) => set({ teams, warnings, teamHistory: [] }),

      swap: (srcTi, srcMi, dstTi, dstMi) => set(s => {
        const teams = cloneTeams(s.teams);
        const tmp = teams[srcTi].members[srcMi];
        teams[srcTi].members[srcMi] = teams[dstTi].members[dstMi];
        teams[dstTi].members[dstMi] = tmp;
        const history = [...s.teamHistory, cloneTeams(s.teams)].slice(-MAX_HISTORY);
        return { teams, teamHistory: history };
      }),

      move: (srcTi, srcMi, dstTi) => set(s => {
        const teams = cloneTeams(s.teams);
        const [member] = teams[srcTi].members.splice(srcMi, 1);
        teams[dstTi].members.push(member);
        const history = [...s.teamHistory, cloneTeams(s.teams)].slice(-MAX_HISTORY);
        return { teams, teamHistory: history };
      }),

      undo: () => set(s => {
        if (!s.teamHistory.length) return s;
        const history = [...s.teamHistory];
        const teams = history.pop()!;
        return { teams, teamHistory: history };
      }),

      savePreset: (name) => set(s => {
        const now = new Date().toISOString();
        const preset: Preset = {
          id: `preset_${Date.now()}`,
          name,
          participants: s.participants,
          config: s.config,
          createdAt: now,
          updatedAt: now,
        };
        return { presets: [...s.presets, preset] };
      }),

      loadPreset: (id) => set(s => {
        const preset = s.presets.find(p => p.id === id);
        if (!preset) return s;
        return { participants: preset.participants, config: preset.config, activePresetId: id };
      }),

      deletePreset: (id) => set(s => ({
        presets: s.presets.filter(p => p.id !== id),
        activePresetId: s.activePresetId === id ? null : s.activePresetId,
      })),
    }),
    {
      name: "teamrandomizer",
      partialize: (s) => ({ config: s.config, presets: s.presets, activePresetId: s.activePresetId }),
    }
  )
);
