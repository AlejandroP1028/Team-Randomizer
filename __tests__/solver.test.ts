import { describe, it, expect } from "vitest";
import { generateTeams, ConstraintConflictError } from "@/lib/solver";
import type { Participant, TeamConfig } from "@/lib/types";

function p(id: string, name: string, skill?: number, dept?: string): Participant {
  return { id, name, skillLevel: skill ?? null, department: dept ?? null };
}

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
    // Max team size is 2 but constraint group is 3
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
      expect(Math.abs(team.stats.avgSkill - globalAvg)).toBeLessThanOrEqual(0.5 + 0.05); // small float tolerance
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
    // 7 participants into 3 teams: 7 % 3 = 1 remainder
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
    expect(aliceInT0 && bobInT0).toBe(false); // not both in team 0
    const aliceInT1 = team1Ids.includes("a");
    const bobInT1 = team1Ids.includes("b");
    expect(aliceInT1 && bobInT1).toBe(false); // not both in team 1
  });

  it("9. soft constraint warning emitted when prefer-together can't be satisfied", () => {
    // Snake-draft with balanced_skill into 3 teams:
    // Sort desc: Alice(5), Bob(4), Carol(3), Dave(2), Eve(1), Frank(5)
    // Actually sort: Alice(5),Frank(5),Bob(4),Carol(3),Dave(2),Eve(1)
    // Round 0 (even): T0=Alice(5), T1=Frank(5), T2=Bob(4)
    // Round 1 (odd):  T2=Carol(3), T1=Dave(2),  T0=Eve(1)
    // T0=[Alice(5),Eve(1)] avg=3, T1=[Frank(5),Dave(2)] avg=3.5, T2=[Bob(4),Carol(3)] avg=3.5
    // globalAvg = (5+5+4+3+2+1)/6 = 3.33
    // Alice(T0) wants Bob(T2). To bring Bob to T0, must swap Eve(1) for Bob(4).
    // newT0avg = avg([Alice(5),Bob(4)]) = 4.5 -> diff from 3.33 = 1.17 > 0.5 -> blocked -> warning
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
});
