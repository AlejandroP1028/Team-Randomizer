import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Participant, TeamConfig, Team, SolverWarning, Preset, Task,
  TaskStatus, TaskPriority, TaskFilters, PrdWorkspace, ObjectiveScores,
  Seniority, Split, SubTeam, SplitWorkspace,
} from "@/lib/types";

const EMPTY_CUSTOM: Team = { id: "custom", name: "Custom", members: [], stats: { avgSkill: 0, departments: {}, tags: {}, seniority: {} } };

const PRESET_PALETTE = [
  "#7F77DD", // purple 400
  "#1D9E75", // teal 400
  "#EF9F27", // amber 400
  "#D85A30", // coral 400
  "#378ADD", // blue 400
  "#639922", // green 400
  "#D4537E", // pink 400
  "#888780", // gray 400
];

const SPLIT_PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
];

interface AppState {
  participants: Participant[];
  config: TeamConfig;
  teams: Team[];
  customTeam: Team;
  warnings: SolverWarning[];
  scores: ObjectiveScores | null;
  teamHistory: Team[][];
  presets: Preset[];
  activePresetId: string | null;
  loading: boolean;

  splits: Split[];
  activeSplitId: string | null;

  setParticipants: (p: Participant[]) => void;
  setConfig: (c: Partial<TeamConfig>) => void;
  setLoading: (l: boolean) => void;
  setResult: (teams: Team[], warnings: SolverWarning[], scores: ObjectiveScores) => void;
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

  workspaces: Record<string, PrdWorkspace | SplitWorkspace>;
  taskFilters: TaskFilters;
  setPrdText: (presetId: string, text: string) => void;
  setTasks: (presetId: string, tasks: Task[]) => void;
  addTask: (presetId: string, task: Omit<Task, "id">) => void;
  updateTask: (presetId: string, taskId: string, patch: Partial<Task>) => void;
  deleteTask: (presetId: string, taskId: string) => void;
  moveTask: (presetId: string, taskId: string, status: TaskStatus) => void;
  setTaskFilters: (filters: Partial<TaskFilters>) => void;
  clearTaskFilters: () => void;

  saveSplit: (name: string, teamNames: string[], prdMode: "shared" | "per_team") => void;
  updateSplitPrdMode: (splitId: string, prdMode: "shared" | "per_team") => void;
  renameSplit: (splitId: string, name: string) => void;
  renameSubTeam: (splitId: string, subTeamId: string, name: string) => void;
  deleteSplit: (splitId: string) => void;
}

const MAX_HISTORY = 20;

function imputeSeniority(skill: number): Seniority {
  if (skill <= 2) return "junior";
  if (skill <= 3) return "mid";
  return "senior";
}

function computeStats(members: Participant[]): { avgSkill: number; departments: Record<string, number>; tags: Record<string, number>; seniority: Record<string, number> } {
  const skills = members.map(p => p.skillLevel ?? 3);
  const avgSkill = Math.round((skills.reduce((s, n) => s + n, 0) / (skills.length || 1)) * 10) / 10;
  const departments: Record<string, number> = {};
  const tags: Record<string, number> = {};
  const seniority: Record<string, number> = {};
  for (const p of members) {
    if (p.department) departments[p.department] = (departments[p.department] ?? 0) + 1;
    for (const tag of p.tags ?? []) tags[tag] = (tags[tag] ?? 0) + 1;
    const sen = p.seniority ?? imputeSeniority(p.skillLevel ?? 3);
    seniority[sen] = (seniority[sen] ?? 0) + 1;
  }
  return { avgSkill, departments, tags, seniority };
}

function cloneTeams(teams: Team[]): Team[] {
  return teams.map(t => ({ ...t, members: [...t.members] }));
}

function cloneCustom(t: Team): Team {
  return { ...t, members: [...t.members] };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      participants: [],
      config: { strategy: "balanced_skill", teamCount: 3 },
      teams: [],
      customTeam: { ...EMPTY_CUSTOM },
      warnings: [],
      scores: null,
      teamHistory: [],
      presets: [],
      activePresetId: null,
      loading: false,
      workspaces: {},
      taskFilters: { assignees: [], priorities: [], statuses: [] },
      splits: [],
      activeSplitId: null,

      setParticipants: (participants) => set({ participants }),
      setConfig: (c) => set(s => ({ config: { ...s.config, ...c } })),
      setLoading: (loading) => set({ loading }),
      setResult: (teams, warnings, scores) => set({ teams, warnings, scores, teamHistory: [], customTeam: { ...EMPTY_CUSTOM } }),

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
          color: PRESET_PALETTE[s.presets.length % PRESET_PALETTE.length],
          createdAt: now,
          updatedAt: now,
        };
        return { presets: [...s.presets, preset], activePresetId: preset.id };
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

      setPrdText: (presetId, text) => set(s => ({
        workspaces: {
          ...s.workspaces,
          [presetId]: { ...s.workspaces[presetId], presetId, prdText: text, tasks: s.workspaces[presetId]?.tasks ?? [], lastGeneratedAt: s.workspaces[presetId]?.lastGeneratedAt ?? null },
        },
      })),
      setTasks: (presetId, tasks) => set(s => ({
        workspaces: {
          ...s.workspaces,
          [presetId]: { ...s.workspaces[presetId], presetId, prdText: s.workspaces[presetId]?.prdText ?? "", tasks, lastGeneratedAt: new Date().toISOString() },
        },
      })),
      addTask: (presetId, task) => set(s => {
        const ws = s.workspaces[presetId] ?? { presetId, prdText: "", tasks: [], lastGeneratedAt: null };
        return {
          workspaces: {
            ...s.workspaces,
            [presetId]: { ...ws, tasks: [...ws.tasks, { ...task, id: `task_${Date.now()}_${Math.random().toString(36).slice(2)}` }] },
          },
        };
      }),
      updateTask: (presetId, taskId, patch) => set(s => {
        const ws = s.workspaces[presetId];
        if (!ws) return s;
        return {
          workspaces: {
            ...s.workspaces,
            [presetId]: { ...ws, tasks: ws.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t) },
          },
        };
      }),
      deleteTask: (presetId, taskId) => set(s => {
        const ws = s.workspaces[presetId];
        if (!ws) return s;
        return {
          workspaces: {
            ...s.workspaces,
            [presetId]: { ...ws, tasks: ws.tasks.filter(t => t.id !== taskId) },
          },
        };
      }),
      moveTask: (presetId, taskId, status) => set(s => {
        const ws = s.workspaces[presetId];
        if (!ws) return s;
        return {
          workspaces: {
            ...s.workspaces,
            [presetId]: { ...ws, tasks: ws.tasks.map(t => t.id === taskId ? { ...t, status } : t) },
          },
        };
      }),
      setTaskFilters: (filters) => set(s => ({ taskFilters: { ...s.taskFilters, ...filters } })),
      clearTaskFilters: () => set({ taskFilters: { assignees: [], priorities: [], statuses: [] } }),

      // ── Split actions ────────────────────────────────────────────────────────

      saveSplit: (name, teamNames, prdMode) => {
        const { teams, config, splits } = get();
        if (teams.length === 0) {
          console.error("saveSplit: teams[] is empty — generate teams first.");
          return;
        }
        const now = new Date().toISOString();
        const splitId = `split_${Date.now()}`;
        const subTeams: SubTeam[] = teams.map((t, i) => ({
          id: `subteam_${Date.now()}_${i}`,
          splitId,
          name: teamNames[i] ?? `Team ${i + 1}`,
          members: t.members,
        }));
        const split: Split = {
          id: splitId,
          name,
          prdMode,
          color: SPLIT_PALETTE[splits.length % SPLIT_PALETTE.length],
          allParticipants: teams.flatMap(t => t.members),
          config,
          subTeams,
          createdAt: now,
          updatedAt: now,
        };
        const newWorkspaceEntries: Record<string, SplitWorkspace> = {};
        if (prdMode === "shared") {
          newWorkspaceEntries[splitId] = { subTeamId: splitId, prdText: "", tasks: [], lastGeneratedAt: null };
        } else {
          for (const st of subTeams) {
            newWorkspaceEntries[st.id] = { subTeamId: st.id, prdText: "", tasks: [], lastGeneratedAt: null };
          }
        }
        set(s => ({
          splits: [...s.splits, split],
          activeSplitId: splitId,
          workspaces: { ...s.workspaces, ...newWorkspaceEntries },
        }));
      },

      updateSplitPrdMode: (splitId, prdMode) => set(s => {
        const split = s.splits.find(sp => sp.id === splitId);
        if (!split || split.prdMode === prdMode) return s;

        const workspaces = { ...s.workspaces };

        if (prdMode === "shared") {
          // Merge all per-team prdTexts into one shared entry
          const mergedText = split.subTeams
            .map(st => workspaces[st.id]?.prdText ?? "")
            .filter(Boolean)
            .join("\n\n---\n\n");
          // Delete per-team entries
          for (const st of split.subTeams) {
            delete workspaces[st.id];
          }
          workspaces[splitId] = { subTeamId: splitId, prdText: mergedText, tasks: [], lastGeneratedAt: null };
        } else {
          // Copy shared text into each sub-team entry
          const sharedText = workspaces[splitId]?.prdText ?? "";
          delete workspaces[splitId];
          for (const st of split.subTeams) {
            workspaces[st.id] = { subTeamId: st.id, prdText: sharedText, tasks: [], lastGeneratedAt: null };
          }
        }

        const splits = s.splits.map(sp =>
          sp.id === splitId ? { ...sp, prdMode, updatedAt: new Date().toISOString() } : sp
        );
        return { splits, workspaces };
      }),

      renameSplit: (splitId, name) => set(s => ({
        splits: s.splits.map(sp =>
          sp.id === splitId ? { ...sp, name, updatedAt: new Date().toISOString() } : sp
        ),
      })),

      renameSubTeam: (splitId, subTeamId, name) => set(s => ({
        splits: s.splits.map(sp =>
          sp.id === splitId
            ? {
                ...sp,
                subTeams: sp.subTeams.map(st =>
                  st.id === subTeamId ? { ...st, name } : st
                ),
                updatedAt: new Date().toISOString(),
              }
            : sp
        ),
      })),

      deleteSplit: (splitId) => set(s => {
        const split = s.splits.find(sp => sp.id === splitId);
        const workspaces = { ...s.workspaces };
        if (split) {
          // Remove per-team workspace entries
          for (const st of split.subTeams) {
            delete workspaces[st.id];
          }
          // Remove shared workspace entry
          delete workspaces[splitId];
        }
        return {
          splits: s.splits.filter(sp => sp.id !== splitId),
          activeSplitId: s.activeSplitId === splitId ? null : s.activeSplitId,
          workspaces,
        };
      }),
    }),
    {
      name: "teamrandomizer-v2",
      partialize: (s) => ({
        config: s.config,
        presets: s.presets,
        activePresetId: s.activePresetId,
        workspaces: s.workspaces,
        splits: s.splits,
        activeSplitId: s.activeSplitId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Backfill color for presets that predate this field
        const needsColor = state.presets.some(p => !p.color);
        if (needsColor) {
          state.presets = state.presets.map((p, i) => ({
            ...p,
            color: p.color ?? PRESET_PALETTE[i % PRESET_PALETTE.length],
          }));
        }
      },
    }
  )
);
