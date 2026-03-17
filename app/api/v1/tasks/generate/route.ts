import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildTaskPrompt } from "@/lib/prd";
import type { Participant, Task } from "@/lib/types";

interface RawAiTask {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggestedAssigneeId: string | null;
  section: string;
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  let body: { prdText?: unknown; participants?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const { prdText, participants } = body;

  if (typeof prdText !== "string" || !prdText.trim()) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "prdText must be a non-empty string." } },
      { status: 400 }
    );
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "participants must be a non-empty array." } },
      { status: 400 }
    );
  }

  const typedParticipants = participants as Participant[];

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are a project manager assistant. Given a PRD and a team roster, extract actionable tasks and suggest the most appropriate assignee for each based on their department and role. Return ONLY valid JSON with no markdown fences and no preamble.`,
        },
        { role: "user", content: buildTaskPrompt(prdText, typedParticipants) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const clean = raw
      .replace(/^```[\w]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    let parsed: { tasks: RawAiTask[] };
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: { code: "AI_PARSE_ERROR", message: "Model returned non-JSON output." } },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed.tasks)) {
      return NextResponse.json(
        { error: { code: "AI_PARSE_ERROR", message: "Expected a tasks array in model response." } },
        { status: 502 }
      );
    }

    const tasks: Task[] = parsed.tasks.map(t => ({
      id: crypto.randomUUID(),
      title: t.title,
      description: t.description,
      priority: t.priority,
      section: t.section,
      suggestedAssignee: typedParticipants.find(p => p.id === t.suggestedAssigneeId) ?? null,
      confirmedAssignee: typedParticipants.find(p => p.id === t.suggestedAssigneeId) ?? null,
      status: "todo" as const,
    }));

    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof Groq.APIError) {
      return NextResponse.json(
        { error: { code: "EXTERNAL_SERVICE_ERROR", message: err.message } },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
      { status: 500 }
    );
  }
}
