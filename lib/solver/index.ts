import type {
  Participant, Team, TeamConfig, TeamStats,
  SolverResult, SolverWarning,
  GroupingMode, BalanceWeights, ObjectiveScores, Seniority,
} from "@/lib/types";

export class ConstraintConflictError extends Error {
  constructor(message: string, public conflictingParticipants: string[]) {
    super(message);
    this.name = "ConstraintConflictError";
  }
}

const MAX_REPAIR_ITER = 1000;
const BALANCE_TOLERANCE = 0.5;
const DEFAULT_SKILL = 3;

const DEFAULT_WEIGHTS_MIXED: BalanceWeights = {
  skill: 8, department: 7, seniority: 9, headcount: 6,
};

// In specialised mode department weight is 0 here;
// homogeneity is handled by the seed phase instead.
const DEFAULT_WEIGHTS_SPECIALISED: BalanceWeights = {
  skill: 8, department: 0, seniority: 9, headcount: 6,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((s, n) => s + n, 0) / nums.length;
}

function imputeSeniority(skill: number): Seniority {
  if (skill <= 2) return "junior";
  if (skill <= 3) return "mid";
  return "senior";
}

function mode_dept(arr: string[]): string {
  const counts = new Map<string, number>();
  arr.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

// ─── Phase 1: Normalise ───────────────────────────────────────────────────────

function normalise(raw: Participant[]): { out: Participant[]; warnings: SolverWarning[] } {
  const warnings: SolverWarning[] = [];
  const seen = new Set<string>();
  const deduped = raw.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

  const skilled = deduped.filter(p => p.skillLevel != null).map(p => p.skillLevel as number).sort((a, b) => a - b);
  const median =
    skilled.length === 0 ? DEFAULT_SKILL
    : skilled.length % 2 === 1 ? skilled[Math.floor(skilled.length / 2)]
    : (skilled[skilled.length / 2 - 1] + skilled[skilled.length / 2]) / 2;

  const out = deduped.map(p => {
    const withSkill = p.skillLevel != null ? p : (() => {
      warnings.push({ type: "skill_imputed", participants: [p.name], message: `${p.name}'s missing skill level set to cohort median (${median}).` });
      return { ...p, skillLevel: median };
    })();
    // Impute seniority from skill when absent
    const seniority = withSkill.seniority ?? imputeSeniority(withSkill.skillLevel as number);
    // Normalise tags to lowercase trimmed strings
    const tags = (withSkill.tags ?? []).map(t => t.trim().toLowerCase()).filter(Boolean);
    return { ...withSkill, seniority, tags };
  });

  return { out, warnings };
}

// ─── Phase 2: Constraint graph validation ─────────────────────────────────────

function validateConstraints(participants: Participant[], maxTeamSize: number): void {
  const adj = new Map<string, Set<string>>();
  for (const p of participants) {
    if (!adj.has(p.id)) adj.set(p.id, new Set());
    for (const id of p.preferences?.mustSeparateFrom ?? []) {
      adj.get(p.id)!.add(id);
      if (!adj.has(id)) adj.set(id, new Set());
      adj.get(id)!.add(p.id);
    }
  }

  const visited = new Set<string>();
  for (const start of adj.keys()) {
    if (visited.has(start)) continue;
    const component: string[] = [];
    const queue = [start];
    while (queue.length) {
      const node = queue.shift()!;
      if (visited.has(node)) continue;
      visited.add(node); component.push(node);
      for (const n of adj.get(node) ?? []) if (!visited.has(n)) queue.push(n);
    }
    if (component.length > maxTeamSize) {
      const names = component.map(id => participants.find(p => p.id === id)?.name ?? id);
      throw new ConstraintConflictError(
        `mustSeparateFrom constraints form a group of ${component.length} (${names.join(", ")}) but max team size is ${maxTeamSize}.`,
        names
      );
    }
  }
}

// ─── Phase 3: Seed ────────────────────────────────────────────────────────────

function snakeDraft(sorted: Participant[], n: number): Participant[][] {
  const teams: Participant[][] = Array.from({ length: n }, () => []);
  sorted.forEach((p, i) => {
    const round = Math.floor(i / n), pos = i % n;
    teams[round % 2 === 0 ? pos : n - 1 - pos].push(p);
  });
  return teams;
}

function seedSpecialised(participants: Participant[], teamCount: number): Participant[][] {
  const teams: Participant[][] = Array.from({ length: teamCount }, () => []);

  const byDept = new Map<string, Participant[]>();
  for (const p of participants) {
    const dept = p.department ?? "unknown";
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept)!.push(p);
  }

  // Largest dept fills first
  const depts = [...byDept.entries()].sort((a, b) => b[1].length - a[1].length);

  let teamIdx = 0;
  for (const [, members] of depts) {
    const sorted = [...members].sort((a, b) => (b.skillLevel ?? 3) - (a.skillLevel ?? 3));
    const teamsNeeded = Math.ceil(sorted.length / Math.ceil(participants.length / teamCount));

    for (let i = 0; i < teamsNeeded && teamIdx < teamCount; i++, teamIdx++) {
      const perTeam = Math.ceil(sorted.length / teamsNeeded);
      const start = i * perTeam;
      const end = Math.min(start + perTeam, sorted.length);
      teams[teamIdx].push(...sorted.slice(start, end));
    }
  }

  // Fill any empty teams with unassigned participants
  const assigned = new Set(teams.flat().map(p => p.id));
  const unassigned = participants.filter(p => !assigned.has(p.id));
  unassigned.forEach((p, i) => teams[i % teamCount].push(p));

  return teams;
}

// ─── Phase 4a: Scoring ────────────────────────────────────────────────────────

function scoreSkill(teams: Participant[][]): number {
  const avgs = teams.map(t => avg(t.map(p => p.skillLevel ?? 3)));
  const globalAvg = avg(avgs);
  const variance = avg(avgs.map(a => (a - globalAvg) ** 2));
  return Math.max(0, 100 - (variance / 4) * 100);
}

function scoreDepartment(teams: Participant[][], mode: GroupingMode): number {
  if (mode === "specialised") {
    // Reward same-department grouping
    const scores = teams.map(t => {
      const depts = t.map(p => p.department ?? "unknown");
      const dominant = mode_dept(depts);
      const dominantCount = depts.filter(d => d === dominant).length;
      return dominantCount / Math.max(1, t.length);
    });
    return avg(scores) * 100;
  } else {
    // Reward department diversity within each team
    const scores = teams.map(t => {
      const depts = new Set(t.map(p => p.department ?? "unknown"));
      return Math.min(1, (depts.size - 1) / Math.max(1, t.length - 1));
    });
    return avg(scores) * 100;
  }
}

function scoreSeniority(teams: Participant[][]): number {
  const scores = teams.map(t => {
    const levels = new Set(
      t.map(p => p.seniority ?? imputeSeniority(p.skillLevel ?? 3))
    );
    let s = 0;
    if (levels.has("senior")) s += 50;
    if (levels.has("junior") || levels.has("mid")) s += 50;
    return s;
  });
  return avg(scores);
}

function scoreHeadcount(teams: Participant[][]): number {
  const sizes = teams.map(t => t.length);
  const diff = Math.max(...sizes) - Math.min(...sizes);
  return Math.max(0, 100 - diff * 20);
}

function scoreAssignment(
  teams: Participant[][],
  w: BalanceWeights,
  mode: GroupingMode,
): number {
  const total = w.skill + w.department + w.seniority + w.headcount;
  if (total === 0) return 0;
  return (
    w.skill      * scoreSkill(teams)              +
    w.department * scoreDepartment(teams, mode)    +
    w.seniority  * scoreSeniority(teams)           +
    w.headcount  * scoreHeadcount(teams)
  ) / total;
}

// ─── Phase 4b: Hard constraint helpers ────────────────────────────────────────

function wouldViolate(p: Participant, team: Participant[], excludeIdx: number): boolean {
  const sep = new Set(p.preferences?.mustSeparateFrom ?? []);
  return team.some((m, i) => i !== excludeIdx && sep.has(m.id));
}

function findViolation(teams: Participant[][]): { ti: number; oi: number } | null {
  for (let ti = 0; ti < teams.length; ti++) {
    const team = teams[ti];
    for (let mi = 0; mi < team.length; mi++) {
      const sep = new Set(team[mi].preferences?.mustSeparateFrom ?? []);
      for (let oi = 0; oi < team.length; oi++) {
        if (oi !== mi && sep.has(team[oi].id)) {
          return { ti, oi: (team[mi].skillLevel ?? 3) <= (team[oi].skillLevel ?? 3) ? mi : oi };
        }
      }
    }
  }
  return null;
}

function repairMustSeparate(teams: Participant[][]): SolverWarning[] {
  const warnings: SolverWarning[] = [];
  for (let iter = 0; iter < MAX_REPAIR_ITER; iter++) {
    const v = findViolation(teams);
    if (!v) break;
    const offender = teams[v.ti][v.oi];
    let best: { ti: number; mi: number; diff: number } | null = null;
    for (let ti = 0; ti < teams.length; ti++) {
      if (ti === v.ti) continue;
      for (let mi = 0; mi < teams[ti].length; mi++) {
        const c = teams[ti][mi];
        if (wouldViolate(offender, teams[ti], mi) || wouldViolate(c, teams[v.ti], v.oi)) continue;
        const diff = Math.abs((c.skillLevel ?? 3) - (offender.skillLevel ?? 3));
        if (!best || diff < best.diff) best = { ti, mi, diff };
      }
    }
    if (!best) {
      warnings.push({ type: "hard_constraint_partial", participants: [offender.name], message: `Could not fully satisfy mustSeparateFrom constraint for ${offender.name}.` });
      break;
    }
    [teams[v.ti][v.oi], teams[best.ti][best.mi]] = [teams[best.ti][best.mi], teams[v.ti][v.oi]];
  }
  return warnings;
}

function repairSeniorPerTeam(teams: Participant[][]): void {
  const isSenior = (p: Participant) =>
    p.seniority === "senior" || (!p.seniority && (p.skillLevel ?? 3) >= 4);

  for (let ti = 0; ti < teams.length; ti++) {
    if (teams[ti].some(isSenior)) continue;

    for (let fti = 0; fti < teams.length; fti++) {
      if (fti === ti) continue;
      const seniorsInSource = teams[fti].filter(isSenior);
      if (seniorsInSource.length <= 1) continue;

      const fromMi = teams[fti].indexOf(seniorsInSource[0]);
      const nonSeniors = teams[ti]
        .map((p, i) => ({ p, i }))
        .filter(x => !isSenior(x.p))
        .sort((a, b) => (b.p.skillLevel ?? 3) - (a.p.skillLevel ?? 3));

      if (!nonSeniors.length) continue;
      const toMi = nonSeniors[0].i;

      [teams[ti][toMi], teams[fti][fromMi]] = [teams[fti][fromMi], teams[ti][toMi]];
      break;
    }
  }
}

// ─── Phase 4c: Iterative improvement ──────────────────────────────────────────

function solve(
  participants: Participant[],
  teamCount: number,
  mode: GroupingMode,
  weights: BalanceWeights,
  requireSeniorPerTeam: boolean,
): { teams: Participant[][]; warnings: SolverWarning[] } {
  const seed = mode === "specialised"
    ? seedSpecialised(participants, teamCount)
    : snakeDraft(
        [...participants].sort((a, b) => (b.skillLevel ?? 3) - (a.skillLevel ?? 3)),
        teamCount
      );

  let best = seed.map(t => [...t]);
  let bestScore = scoreAssignment(best, weights, mode);
  const current = seed.map(t => [...t]);

  const MAX_ITER = Math.min(5000, participants.length * 200);

  for (let i = 0; i < MAX_ITER; i++) {
    const ti = Math.floor(Math.random() * teamCount);
    let tj = Math.floor(Math.random() * teamCount);
    while (tj === ti) tj = Math.floor(Math.random() * teamCount);
    if (!current[ti].length || !current[tj].length) continue;

    const mi = Math.floor(Math.random() * current[ti].length);
    const mj = Math.floor(Math.random() * current[tj].length);

    [current[ti][mi], current[tj][mj]] = [current[tj][mj], current[ti][mi]];

    const score = scoreAssignment(current, weights, mode);
    if (score > bestScore) {
      best = current.map(t => [...t]);
      bestScore = score;
    } else {
      [current[ti][mi], current[tj][mj]] = [current[tj][mj], current[ti][mi]];
    }
  }

  const repairWarnings = repairMustSeparate(best);
  if (requireSeniorPerTeam) repairSeniorPerTeam(best);

  return { teams: best, warnings: repairWarnings };
}

// ─── Phase 5: Soft constraint nudge ───────────────────────────────────────────

function nudgeSoft(teams: Participant[][], globalAvg: number): SolverWarning[] {
  const warnings: SolverWarning[] = [];
  for (let ti = 0; ti < teams.length; ti++) {
    for (const member of teams[ti]) {
      for (const pid of member.preferences?.preferTogetherWith ?? []) {
        if (teams[ti].some(m => m.id === pid)) continue;
        const targetTi = teams.findIndex(t => t.some(m => m.id === pid));
        if (targetTi === -1) continue;
        const targetMi = teams[targetTi].findIndex(m => m.id === pid);
        const incoming = teams[targetTi][targetMi];

        let swapIdx = -1;
        for (let mi = 0; mi < teams[ti].length; mi++) {
          const leaving = teams[ti][mi];
          if (wouldViolate(incoming, teams[ti], mi) || wouldViolate(leaving, teams[targetTi], targetMi)) continue;
          const newFromAvg = avg([...teams[ti].filter((_, i) => i !== mi), incoming].map(p => p.skillLevel ?? 3));
          const newToAvg = avg([...teams[targetTi].filter((_, i) => i !== targetMi), leaving].map(p => p.skillLevel ?? 3));
          if (Math.abs(newFromAvg - globalAvg) <= BALANCE_TOLERANCE && Math.abs(newToAvg - globalAvg) <= BALANCE_TOLERANCE) {
            swapIdx = mi; break;
          }
        }

        if (swapIdx === -1) {
          warnings.push({ type: "soft_constraint_unmet", participants: [member.name, incoming.name], message: `Could not place ${member.name} and ${incoming.name} together without breaking skill balance.` });
          continue;
        }
        const leaving = teams[ti].splice(swapIdx, 1)[0];
        teams[targetTi].splice(targetMi, 1);
        teams[ti].push(incoming);
        teams[targetTi].push(leaving);
      }
    }
  }
  return warnings;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function computeStats(members: Participant[]): TeamStats {
  const skills = members.map(p => p.skillLevel ?? 3);
  const departments: Record<string, number> = {};
  const tags: Record<string, number> = {};
  const seniority: Record<string, number> = {};

  for (const p of members) {
    if (p.department)
      departments[p.department] = (departments[p.department] ?? 0) + 1;

    for (const tag of p.tags ?? [])
      tags[tag] = (tags[tag] ?? 0) + 1;

    const sen = p.seniority ?? imputeSeniority(p.skillLevel ?? 3);
    seniority[sen] = (seniority[sen] ?? 0) + 1;
  }

  return {
    avgSkill: Math.round(avg(skills) * 10) / 10,
    departments,
    tags,
    seniority,
  };
}

function computeObjectiveScores(
  teams: Participant[][], w: BalanceWeights, mode: GroupingMode
): ObjectiveScores {
  const skill      = scoreSkill(teams);
  const department = scoreDepartment(teams, mode);
  const seniority  = scoreSeniority(teams);
  const headcount  = scoreHeadcount(teams);
  const total = w.skill + w.department + w.seniority + w.headcount || 1;
  const composite = (w.skill * skill + w.department * department +
    w.seniority * seniority + w.headcount * headcount) / total;
  return { skill, department, seniority, headcount, composite };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function generateTeams(raw: Participant[], config: TeamConfig): SolverResult {
  if (raw.length < 2) throw new Error("At least 2 participants required.");
  if (!config.teamCount && !config.teamSize) throw new Error("Provide teamCount or teamSize.");

  const teamCount   = config.teamCount ?? Math.ceil(raw.length / config.teamSize!);
  const remainder   = raw.length % teamCount;
  const maxTeamSize = Math.floor(raw.length / teamCount) + (remainder > 0 ? 1 : 0);
  const mode        = config.groupingMode ?? "mixed";
  const weights     = {
    ...(mode === "specialised" ? DEFAULT_WEIGHTS_SPECIALISED : DEFAULT_WEIGHTS_MIXED),
    ...config.weights,
  };

  if (teamCount < 2) throw new Error("At least 2 teams required.");

  const { out: normalised, warnings: w1 } = normalise(raw);
  validateConstraints(normalised, maxTeamSize);

  const globalAvg = avg(normalised.map(p => p.skillLevel ?? 3));
  const { teams: mutable, warnings: w2 } = solve(
    normalised, teamCount, mode, weights, config.requireSeniorPerTeam ?? false,
  );

  const w3 = nudgeSoft(mutable, globalAvg);

  const scores = computeObjectiveScores(mutable, weights, mode);

  const teams: Team[] = mutable.map((members, i) => ({
    id: `team_${i + 1}`,
    name: `Team ${i + 1}`,
    members,
    stats: computeStats(members),
  }));

  return { teams, warnings: [...w1, ...w2, ...w3], remainderCount: remainder, scores };
}
