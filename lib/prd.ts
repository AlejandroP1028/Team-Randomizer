import type { Participant } from "@/lib/types";

export function buildTaskPrompt(prdText: string, participants: Participant[]): string {
  const roster = participants.map(p => ({
    id: p.id,
    name: p.name,
    department: p.department ?? "Unknown",
    skillLevel: p.skillLevel ?? 3,
  }));
  return `PRD document:\n${prdText}\n\nTeam roster (use these exact IDs):\n${JSON.stringify(roster, null, 2)}\n\nReturn JSON: { "tasks": [{ "title": string, "description": string, "priority": "high"|"medium"|"low", "suggestedAssigneeId": string|null, "section": string }] }\n\nGenerate 5–20 tasks covering all major features and non-functional requirements.`;
}
