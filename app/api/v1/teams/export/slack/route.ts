import { NextRequest, NextResponse } from "next/server";
import type { SlackExportRequest, ApiError } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: SlackExportRequest;
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

function error(
  code: ApiError["error"]["code"],
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}
