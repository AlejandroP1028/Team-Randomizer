// ─── app/api/v1/teams/generate/route.ts ──────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { generateTeams, ConstraintConflictError } from "@/lib/solver";
import type { GenerateRequest, ApiError } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return error("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  const { participants, config } = body;

  if (!Array.isArray(participants) || participants.length < 2) {
    return error("VALIDATION_ERROR", "participants must be an array of at least 2.", 400);
  }
  if (!config?.strategy) {
    return error("VALIDATION_ERROR", "config.strategy is required.", 400);
  }
  if (config.teamCount == null && config.teamSize == null) {
    return error("VALIDATION_ERROR", "Provide config.teamCount or config.teamSize.", 400);
  }
  if (config.teamCount != null && config.teamSize != null) {
    return error("VALIDATION_ERROR", "teamCount and teamSize are mutually exclusive.", 400);
  }

  try {
    const result = generateTeams(participants, config);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof ConstraintConflictError) {
      return error("CONSTRAINT_CONFLICT", e.message, 422, { conflictingParticipants: e.conflictingParticipants });
    }
    if (e instanceof Error) {
      return error("VALIDATION_ERROR", e.message, 400);
    }
    return error("INTERNAL_ERROR", "Unexpected server error.", 500);
  }
}

// ─── app/api/v1/participants/validate/route.ts ────────────────────────────────

// import { NextRequest, NextResponse } from "next/server";
// import type { ValidateRequest } from "@/lib/types";

export async function validatePOST(req: NextRequest) {
  let body: import("@/lib/types").ValidateRequest;
  try {
    body = await req.json();
  } catch {
    return error("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  if (!Array.isArray(body.participants) || body.participants.length === 0) {
    return error("VALIDATION_ERROR", "participants must be a non-empty array.", 400);
  }

  const { participants } = body;
  const warnings: import("@/lib/types").SolverWarning[] = [];

  // Duplicate check
  const names = new Set<string>();
  for (const p of participants) {
    if (names.has(p.name)) {
      warnings.push({ type: "skill_imputed", participants: [p.name], message: `Duplicate name: ${p.name}` });
    }
    names.add(p.name);
  }

  // Impute median
  const skilled = participants.filter(p => p.skillLevel != null).map(p => p.skillLevel as number).sort((a, b) => a - b);
  const median = skilled.length === 0 ? null
    : skilled.length % 2 === 1 ? skilled[Math.floor(skilled.length / 2)]
    : (skilled[skilled.length / 2 - 1] + skilled[skilled.length / 2]) / 2;

  const normalised = participants.map(p => {
    if (p.skillLevel != null) return p;
    if (median != null) warnings.push({ type: "skill_imputed", participants: [p.name], message: `${p.name}'s skill set to median (${median}).` });
    return { ...p, skillLevel: median ?? 3 };
  });

  return NextResponse.json({ normalised, warnings, imputedMedian: median }, { status: 200 });
}

// ─── app/api/v1/teams/export/slack/route.ts ───────────────────────────────────

// import { NextRequest, NextResponse } from "next/server";
// import type { SlackExportRequest } from "@/lib/types";

export async function slackPOST(req: NextRequest) {
  let body: import("@/lib/types").SlackExportRequest;
  try {
    body = await req.json();
  } catch {
    return error("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  if (!Array.isArray(body.teams) || body.teams.length === 0) {
    return error("VALIDATION_ERROR", "teams must be a non-empty array.", 400);
  }

  const lines = body.teams.map(team => {
    const members = team.members.map(m => `• ${m.name}${m.department ? ` (${m.department})` : ""}`).join("\n");
    const header = `*${team.name}*`;
    const stats = body.includeStats
      ? `\n_Avg skill: ${team.stats.avgSkill} · ${Object.entries(team.stats.departments).map(([d, n]) => `${d} ${n}`).join(" · ")}_`
      : "";
    return `${header}\n${members}${stats}`;
  });

  return NextResponse.json({ text: lines.join("\n\n") }, { status: 200 });
}

// ─── Shared error helper ──────────────────────────────────────────────────────

function error(
  code: ApiError["error"]["code"],
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

/*
NOTE: The three handlers above need to live in separate files as actual
Next.js route handlers. Each file exports a named `POST` function:

  // app/api/v1/teams/generate/route.ts  → export { POST }
  // app/api/v1/participants/validate/route.ts → rename validatePOST → POST, export it
  // app/api/v1/teams/export/slack/route.ts → rename slackPOST → POST, export it

They are combined here for readability. The `error()` helper can be
extracted to lib/api.ts and imported by each route.
*/