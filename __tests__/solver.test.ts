import { describe, it, expect } from "vitest";
import { generateTeams, ConstraintConflictError } from "@/lib/solver";
import { buildTaskPrompt } from "@/lib/prd";
import type { Participant, TeamConfig } from "@/lib/types";

function p(id: string, name: string, skill?: number, dept?: string): Participant {
  return { id, name, skillLevel: skill ?? null, department: dept ?? null };
}

const SIX_WITH_TAGS: Participant[] = [
  { id:"a", name:"Alice", skillLevel:4, department:"Eng",    seniority:"senior", tags:["backend","postgres"],  preferences:{mustSeparateFrom:[],preferTogetherWith:[]} },
  { id:"b", name:"Bob",   skillLevel:3, department:"Design", seniority:"mid",    tags:["figma","react"],       preferences:{mustSeparateFrom:[],preferTogetherWith:[]} },
  { id:"c", name:"Carol", skillLevel:2, department:"Eng",    seniority:"junior", tags:["frontend","react"],    preferences:{mustSeparateFrom:[],preferTogetherWith:[]} },
  { id:"d", name:"Dave",  skillLevel:5, department:"PM",     seniority:"senior", tags:[],                     preferences:{mustSeparateFrom:[],preferTogetherWith:[]} },
  { id:"e", name:"Eve",   skillLevel:1, department:"Design", seniority:"junior", tags:["figma"],               preferences:{mustSeparateFrom:[],preferTogetherWith:[]} },
  { id:"f", name:"Frank", skillLevel:3, department:"Eng",    seniority:"mid",    tags:["backend","python"],    preferences:{mustSeparateFrom:[],preferTogetherWith:[]} },
];

describe("solver", () => {
  it("1. skill imputation uses cohort median", () => {
    const participants = [p("a", "Alice", 2), p("b", "Bob", 4), p("c", "Carol")];
    const config: TeamConfig = { strategy: "balanced_skill", teamCount: 2 };
    const result = generateTeams(participants, config);
    const all = result.teams.flatMap(t => t.members);
    const carol = all.find(m => m.name === "Carol")!;
    expect(carol.skillLevel).toBe(3); // median of [2,4]
    expect(result.warnings.some(w => w.type === "skill_imputed" && w.participants.includes("Carol"))).toBe(true);
  });

  it("2. deduplication removes same-id entries", () => {
    const participants = [p("a", "Alice", 3), p("a", "Alice", 3), p("b", "Bob", 3), p("c", "Carol", 3)];
    const config: TeamConfig = { strategy: "random", teamCount: 2 };
    const result = generateTeams(participants, config);
    const all = result.teams.flatMap(t => t.members);
    expect(all.length).toBe(3); // duplicate removed
  });

  it("3. ConstraintConflictError thrown when must-separate group > team size", () => {
    const participants = [
      { ...p("a", "Alice", 3), preferences: { mustSeparateFrom: ["b", "c"], preferTogetherWith: [] } },
      { ...p("b", "Bob", 3),   preferences: { mustSeparateFrom: ["a", "c"], preferTogetherWith: [] } },
      { ...p("c", "Carol", 3), preferences: { mustSeparateFrom: ["a", "b"], preferTogetherWith: [] } },
      p("d", "Dave", 3),
    ];
    const config: TeamConfig = { strategy: "random", teamCount: 2 };
    expect(() => generateTeams(participants, config)).toThrow(ConstraintConflictError);
  });

  it("4. no error when constraints fit", () => {
    const participants = [
      { ...p("a", "Alice", 3), preferences: { mustSeparateFrom: ["b"], preferTogetherWith: [] } },
      { ...p("b", "Bob", 3),   preferences: { mustSeparateFrom: ["a"], preferTogetherWith: [] } },
      p("c", "Carol", 3),
      p("d", "Dave", 3),
    ];
    const config: TeamConfig = { strategy: "random", teamCount: 2 };
    expect(() => generateTeams(participants, config)).not.toThrow();
  });

  it("5. balanced_skill: all team avgs within ±0.5 of global avg", () => {
    const participants = [
      p("a", "Alice", 5), p("b", "Bob", 4), p("c", "Carol", 3),
      p("d", "Dave", 2), p("e", "Eve", 1), p("f", "Frank", 3),
    ];
    const config: TeamConfig = { strategy: "balanced_skill", teamCount: 3 };
    const result = generateTeams(participants, config);
    const globalAvg = participants.reduce((s, p) => s + (p.skillLevel ?? 3), 0) / participants.length;
    for (const team of result.teams) {
      expect(Math.abs(team.stats.avgSkill - globalAvg)).toBeLessThanOrEqual(0.5 + 0.05);
    }
  });

  it("6. all participants distributed (total members = input length)", () => {
    const participants = [p("a","A",1),p("b","B",2),p("c","C",3),p("d","D",4),p("e","E",5),p("f","F",3)];
    const config: TeamConfig = { strategy: "random", teamCount: 2 };
    const result = generateTeams(participants, config);
    const total = result.teams.reduce((s, t) => s + t.members.length, 0);
    expect(total).toBe(participants.length);
  });

  it("7. remainderCount computed correctly", () => {
    const participants = Array.from({ length: 7 }, (_, i) => p(`p${i}`, `P${i}`, 3));
    const config: TeamConfig = { strategy: "random", teamCount: 3 };
    const result = generateTeams(participants, config);
    expect(result.remainderCount).toBe(1);
  });

  it("8. hard constraint repair: mustSeparateFrom pair ends up on different teams", () => {
    const participants = [
      { ...p("a", "Alice", 3), preferences: { mustSeparateFrom: ["b"], preferTogetherWith: [] } },
      { ...p("b", "Bob", 3),   preferences: { mustSeparateFrom: ["a"], preferTogetherWith: [] } },
      p("c", "Carol", 3),
      p("d", "Dave", 3),
    ];
    const config: TeamConfig = { strategy: "random", teamCount: 2 };
    const result = generateTeams(participants, config);
    const team0Ids = result.teams[0].members.map(m => m.id);
    const team1Ids = result.teams[1].members.map(m => m.id);
    const aliceInT0 = team0Ids.includes("a");
    const bobInT0 = team0Ids.includes("b");
    expect(aliceInT0 && bobInT0).toBe(false);
    const aliceInT1 = team1Ids.includes("a");
    const bobInT1 = team1Ids.includes("b");
    expect(aliceInT1 && bobInT1).toBe(false);
  });

  it("9. soft constraint warning emitted when prefer-together can't be satisfied", () => {
    const participants = [
      { ...p("a", "Alice", 5), preferences: { mustSeparateFrom: [], preferTogetherWith: ["b"] } },
      { ...p("b", "Bob",   4), preferences: { mustSeparateFrom: [], preferTogetherWith: [] } },
      p("c", "Carol", 3),
      p("d", "Dave",  2),
      p("e", "Eve",   1),
      p("f", "Frank", 5),
    ];
    const config: TeamConfig = { strategy: "balanced_skill", teamCount: 3 };
    const result = generateTeams(participants, config);
    const hasSoftWarning = result.warnings.some(w => w.type === "soft_constraint_unmet");
    expect(hasSoftWarning).toBe(true);
  });

  it("10. computeStats avgSkill rounded to 1 decimal", () => {
    const participants = [p("a","A",1),p("b","B",2),p("c","C",3),p("d","D",4)];
    const config: TeamConfig = { strategy: "balanced_skill", teamCount: 2 };
    const result = generateTeams(participants, config);
    for (const team of result.teams) {
      const s = team.stats.avgSkill.toString();
      const decimals = s.includes(".") ? s.split(".")[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(1);
    }
  });

  // ─── Multi-objective solver tests ───────────────────────────────────────────

  it("11. composite score is between 0 and 100", () => {
    const result = generateTeams(SIX_WITH_TAGS, { strategy: "balanced_skill", teamCount: 3 });
    expect(result.scores.composite).toBeGreaterThan(0);
    expect(result.scores.composite).toBeLessThanOrEqual(100);
  });

  it("12. all individual scores are 0–100", () => {
    const result = generateTeams(SIX_WITH_TAGS, { strategy: "balanced_skill", teamCount: 3 });
    for (const key of ["skill", "department", "seniority", "headcount"] as const) {
      expect(result.scores[key]).toBeGreaterThanOrEqual(0);
      expect(result.scores[key]).toBeLessThanOrEqual(100);
    }
  });

  it("13. specialised mode produces high department score", () => {
    const result = generateTeams(SIX_WITH_TAGS, {
      strategy: "balanced_skill",
      teamCount: 3,
      groupingMode: "specialised",
    });
    expect(result.scores.department).toBeGreaterThan(50);
  });

  it("14. requireSeniorPerTeam places at least one senior on every team", () => {
    // SIX_WITH_TAGS has 2 seniors (Alice, Dave) — use 2 teams so each can have one
    const result = generateTeams(SIX_WITH_TAGS, {
      strategy: "balanced_skill",
      teamCount: 2,
      requireSeniorPerTeam: true,
    });
    const isSenior = (p: Participant) =>
      p.seniority === "senior" || (!p.seniority && (p.skillLevel ?? 3) >= 4);
    for (const team of result.teams) {
      expect(team.members.some(isSenior)).toBe(true);
    }
  });

  it("15. computeStats includes tags and seniority", () => {
    const result = generateTeams(SIX_WITH_TAGS, { strategy: "balanced_skill", teamCount: 3 });
    for (const team of result.teams) {
      expect(team.stats).toHaveProperty("tags");
      expect(team.stats).toHaveProperty("seniority");
    }
  });

  it("16. buildTaskPrompt includes tags in roster", () => {
    const prompt = buildTaskPrompt("# Test PRD\nBuild a login page.", SIX_WITH_TAGS);
    expect(prompt).toContain("backend");
    expect(prompt).toContain("figma");
  });
});
