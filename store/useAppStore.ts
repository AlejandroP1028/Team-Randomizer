import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Participant, TeamConfig, Team, SolverWarning, Preset } from "@/lib/types";

const EMPTY_CUSTOM: Team = { id: "custom", name: "Custom", members: [], stats: { avgSkill: 0, departments: {} } };

interface AppState {
  participants: Participant[];
  config: TeamConfig;
  teams: Team[];
  customTeam: Team;
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
  moveToCustom: (srcTi: number, srcMi: number) => void;
  moveFromCustom: (customMi: number, dstTi: number) => void;
  swapWithCustom: (customMi: number, dstTi: number, dstMi: number) => void;
  swapInCustom: (mi1: number, mi2: number) => void;
  promoteCustomTeam: () => void;
  undo: () => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
}

const MAX_HISTORY = 20;

function computeStats(members: Participant[]): { avgSkill: number; departments: Record<string, number> } {
  const skills = members.map(p => p.skillLevel ?? 3);
  const avg = skills.reduce((s, n) => s + n, 0) / (skills.length || 1);
  const departments: Record<string, number> = {};
  for (const p of members) if (p.department) departments[p.department] = (departments[p.department] ?? 0) + 1;
  return { avgSkill: Math.round(avg * 10) / 10, departments };
}

function cloneTeams(teams: Team[]): Team[] {
  return teams.map(t => ({ ...t, members: [...t.members] }));
}

function cloneCustom(t: Team): Team {
  return { ...t, members: [...t.members] };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      participants: [],
      config: { strategy: "balanced_skill", teamCount: 3 },
      teams: [],
      customTeam: { ...EMPTY_CUSTOM },
      warnings: [],
      teamHistory: [],
      presets: [],
      activePresetId: null,
      loading: false,

      setParticipants: (participants) => set({ participants }),
      setConfig: (c) => set(s => ({ config: { ...s.config, ...c } })),
      setLoading: (loading) => set({ loading }),
      setResult: (teams, warnings) => set({ teams, warnings, teamHistory: [], customTeam: { ...EMPTY_CUSTOM } }),

      swap: (srcTi, srcMi, dstTi, dstMi) => set(s => {
        const history = [...s.teamHistory, cloneTeams(s.teams)].slice(-MAX_HISTORY);
        const teams = cloneTeams(s.teams);
        const tmp = teams[srcTi].members[srcMi];
        teams[srcTi].members[srcMi] = teams[dstTi].members[dstMi];
        teams[dstTi].members[dstMi] = tmp;
        teams[srcTi].stats = computeStats(teams[srcTi].members);
        teams[dstTi].stats = computeStats(teams[dstTi].members);
        return { teams, teamHistory: history };
      }),

      move: (srcTi, srcMi, dstTi) => set(s => {
        const history = [...s.teamHistory, cloneTeams(s.teams)].slice(-MAX_HISTORY);
        const teams = cloneTeams(s.teams);
        const [member] = teams[srcTi].members.splice(srcMi, 1);
        teams[dstTi].members.push(member);
        teams[srcTi].stats = computeStats(teams[srcTi].members);
        teams[dstTi].stats = computeStats(teams[dstTi].members);
        return { teams, teamHistory: history };
      }),

      moveToCustom: (srcTi, srcMi) => set(s => {
        const history = [...s.teamHistory, cloneTeams(s.teams)].slice(-MAX_HISTORY);
        const teams = cloneTeams(s.teams);
        const custom = cloneCustom(s.customTeam);
        const [member] = teams[srcTi].members.splice(srcMi, 1);
        custom.members.push(member);
        teams[srcTi].stats = computeStats(teams[srcTi].members);
        custom.stats = computeStats(custom.members);
        return { teams, customTeam: custom, teamHistory: history };
      }),

      moveFromCustom: (customMi, dstTi) => set(s => {
        const history = [...s.teamHistory, cloneTeams(s.teams)].slice(-MAX_HISTORY);
        const teams = cloneTeams(s.teams);
        const custom = cloneCustom(s.customTeam);
        const [member] = custom.members.splice(customMi, 1);
        teams[dstTi].members.push(member);
        teams[dstTi].stats = computeStats(teams[dstTi].members);
        custom.stats = computeStats(custom.members);
        return { teams, customTeam: custom, teamHistory: history };
      }),

      swapWithCustom: (customMi, dstTi, dstMi) => set(s => {
        const history = [...s.teamHistory, cloneTeams(s.teams)].slice(-MAX_HISTORY);
        const teams = cloneTeams(s.teams);
        const custom = cloneCustom(s.customTeam);
        const tmp = custom.members[customMi];
        custom.members[customMi] = teams[dstTi].members[dstMi];
        teams[dstTi].members[dstMi] = tmp;
        teams[dstTi].stats = computeStats(teams[dstTi].members);
        custom.stats = computeStats(custom.members);
        return { teams, customTeam: custom, teamHistory: history };
      }),

      swapInCustom: (mi1, mi2) => set(s => {
        const custom = cloneCustom(s.customTeam);
        const tmp = custom.members[mi1];
        custom.members[mi1] = custom.members[mi2];
        custom.members[mi2] = tmp;
        custom.stats = computeStats(custom.members);
        return { customTeam: custom };
      }),

      promoteCustomTeam: () => set(s => {
        if (!s.customTeam.members.length) return s;
        const history = [...s.teamHistory, cloneTeams(s.teams)].slice(-MAX_HISTORY);
        const members = [...s.customTeam.members];
        const newTeam: Team = {
          id: `team_custom_${Date.now()}`,
          name: `Team ${s.teams.length + 1}`,
          members,
          stats: computeStats(members),
        };
        return { teams: [...s.teams, newTeam], customTeam: { ...EMPTY_CUSTOM }, teamHistory: history };
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
