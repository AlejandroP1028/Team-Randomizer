import type { Participant, Team, TeamConfig, SolverResult, SolverWarning } from "@/lib/types";

export class ConstraintConflictError extends Error {
  constructor(message: string, public conflictingParticipants: string[]) {
    super(message);
    this.name = "ConstraintConflictError";
  }
}

const MAX_REPAIR_ITER = 1000;
const BALANCE_TOLERANCE = 0.5;
const DEFAULT_SKILL = 3;

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
    if (p.skillLevel != null) return p;
    warnings.push({ type: "skill_imputed", participants: [p.name], message: `${p.name}'s missing skill level set to cohort median (${median}).` });
    return { ...p, skillLevel: median };
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

function fisherYates<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function snakeDraft(sorted: Participant[], n: number): Participant[][] {
  const teams: Participant[][] = Array.from({ length: n }, () => []);
  sorted.forEach((p, i) => {
    const round = Math.floor(i / n), pos = i % n;
    teams[round % 2 === 0 ? pos : n - 1 - pos].push(p);
  });
  return teams;
}

function seed(participants: Participant[], teamCount: number, strategy: TeamConfig["strategy"]): Participant[][] {
  if (strategy === "random" || strategy === "custom") {
    const shuffled = fisherYates([...participants]);
    const teams: Participant[][] = Array.from({ length: teamCount }, () => []);
    shuffled.forEach((p, i) => teams[i % teamCount].push(p));
    return teams;
  }
  if (strategy === "mixed_department") {
    const sorted = [...participants].sort((a, b) => {
      const d = (a.department ?? "").localeCompare(b.department ?? "");
      return d !== 0 ? d : (b.skillLevel ?? 3) - (a.skillLevel ?? 3);
    });
    return snakeDraft(sorted, teamCount);
  }
  return snakeDraft([...participants].sort((a, b) => (b.skillLevel ?? 3) - (a.skillLevel ?? 3)), teamCount);
}

// ─── Phase 4: Hard constraint repair ──────────────────────────────────────────

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

function repairHard(teams: Participant[][]): SolverWarning[] {
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
    const tmp = teams[v.ti][v.oi];
    teams[v.ti][v.oi] = teams[best.ti][best.mi];
    teams[best.ti][best.mi] = tmp;
  }
  return warnings;
}

// ─── Phase 5: Soft constraint nudge ───────────────────────────────────────────

function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((s, n) => s + n, 0) / nums.length;
}

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

function computeStats(members: Participant[]): import("@/lib/types").TeamStats {
  const skills = members.map(p => p.skillLevel ?? 3);
  const departments: Record<string, number> = {};
  for (const p of members) if (p.department) departments[p.department] = (departments[p.department] ?? 0) + 1;
  return { avgSkill: Math.round(avg(skills) * 10) / 10, departments };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function generateTeams(raw: Participant[], config: TeamConfig): SolverResult {
  if (raw.length < 2) throw new Error("At least 2 participants required.");
  if (!config.teamCount && !config.teamSize) throw new Error("Provide teamCount or teamSize.");

  const teamCount = config.teamCount ?? Math.ceil(raw.length / config.teamSize!);
  const remainder = raw.length % teamCount;
  const maxTeamSize = Math.floor(raw.length / teamCount) + (remainder > 0 ? 1 : 0);

  if (teamCount < 2) throw new Error("At least 2 teams required.");

  const { out: normalised, warnings: w1 } = normalise(raw);
  validateConstraints(normalised, maxTeamSize);

  const mutable = seed(normalised, teamCount, config.strategy);
  const globalAvg = avg(normalised.map(p => p.skillLevel ?? 3));
  const w2 = repairHard(mutable);
  const w3 = nudgeSoft(mutable, globalAvg);

  const teams: Team[] = mutable.map((members, i) => ({
    id: `team_${i + 1}`,
    name: `Team ${i + 1}`,
    members,
    stats: computeStats(members),
  }));

  return { teams, warnings: [...w1, ...w2, ...w3], remainderCount: remainder };
}