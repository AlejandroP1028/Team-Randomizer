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

function error(
  code: ApiError["error"]["code"],
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}
