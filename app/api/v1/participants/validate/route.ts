import { NextRequest, NextResponse } from "next/server";
import type { ValidateRequest, SolverWarning, ApiError } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: ValidateRequest;
  try {
    body = await req.json();
  } catch {
    return error("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  if (!Array.isArray(body.participants) || body.participants.length === 0) {
    return error("VALIDATION_ERROR", "participants must be a non-empty array.", 400);
  }

  const { participants } = body;
  const warnings: SolverWarning[] = [];

  const names = new Set<string>();
  for (const p of participants) {
    if (names.has(p.name)) {
      warnings.push({ type: "skill_imputed", participants: [p.name], message: `Duplicate name: ${p.name}` });
    }
    names.add(p.name);
  }

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

function error(
  code: ApiError["error"]["code"],
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}
