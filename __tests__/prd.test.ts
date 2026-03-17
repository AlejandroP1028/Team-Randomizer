import { buildTaskPrompt } from "@/lib/prd";
import { describe, it, expect } from "vitest";

const participants = [
  { id: "p1", name: "Alice", department: "Engineering", skillLevel: 4, preferences: { mustSeparateFrom: [], preferTogetherWith: [] } },
  { id: "p2", name: "Bob", department: "Design", skillLevel: 3, preferences: { mustSeparateFrom: [], preferTogetherWith: [] } },
];

describe("buildTaskPrompt", () => {
  it("includes participant IDs in the output", () => {
    const result = buildTaskPrompt("# Auth\nBuild login", participants);
    expect(result).toContain("p1");
    expect(result).toContain("p2");
  });

  it("includes the PRD text in the output", () => {
    const result = buildTaskPrompt("# Auth\nBuild login", participants);
    expect(result).toContain("Build login");
  });

  it("does not throw on empty participant array", () => {
    expect(() => buildTaskPrompt("Some PRD", [])).not.toThrow();
  });
});
