import type { Participant } from "@/lib/types";

export function buildTaskPrompt(prdText: string, participants: Participant[]): string {
  const roster = participants.map(p => ({
    id:         p.id,
    name:       p.name,
    department: p.department ?? "Unknown",
    seniority:  p.seniority ?? "mid",
    skillLevel: p.skillLevel ?? 3,
    tags:       p.tags ?? [],
  }));

  return `PRD document:\n${prdText}

Team roster — assign tasks using these exact participant IDs.
Use the "tags" field to match technical tasks to the right person
(e.g. a backend task should go to someone with "backend" in their tags):
${JSON.stringify(roster, null, 2)}

Return JSON: { "tasks": [{ "title": string, "description": string,
"priority": "high"|"medium"|"low", "suggestedAssigneeId": string|null,
"section": string }] }

Generate 5–20 tasks. Prefer assigning to someone whose tags match the
task's technical domain. Fall back to department if no tag match.`;
}
