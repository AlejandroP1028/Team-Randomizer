"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Participant, Seniority } from "@/lib/types";

const NAMES = [
  "Alice","Bob","Carol","Dave","Eve","Frank","Grace","Hank","Ivy","Jack","Kate","Leo",
  "Mia","Nate","Olivia","Pete","Quinn","Rosa","Sam","Tara","Uma","Vince","Wren","Xavi",
  "Yara","Zoe","Aaron","Beth","Carlos","Diana",
];

const DEPARTMENTS = ["Product", "FE", "BE", "DC/ML"];
const SENIORITIES: Seniority[] = ["junior", "mid", "senior"];
const SAMPLE_TAGS = ["react", "node", "python", "postgres", "figma", "devops", "ml", "backend", "frontend", "api"];

function randomSample(count: number): Participant[] {
  const shuffled = [...NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, NAMES.length)).map((name, i) => {
    const skillLevel = (1 + Math.floor(Math.random() * 5)) as 1 | 2 | 3 | 4 | 5;
    const seniority: Seniority = skillLevel >= 4 ? "senior" : skillLevel >= 3 ? "mid" : "junior";
    const tagCount = Math.floor(Math.random() * 3); // 0–2 tags
    const tags = [...SAMPLE_TAGS].sort(() => Math.random() - 0.5).slice(0, tagCount);
    return {
      id: `p_${i}_${name.toLowerCase()}`,
      name,
      skillLevel,
      department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)],
      seniority,
      tags,
      preferences: { mustSeparateFrom: [], preferTogetherWith: [] },
    };
  });
}

function parseSeniority(raw: string): Seniority | null {
  const s = raw.trim().toLowerCase();
  if (["junior", "jr"].includes(s)) return "junior";
  if (["mid", "middle"].includes(s)) return "mid";
  if (["senior", "sr"].includes(s)) return "senior";
  return null;
}

function parseLines(raw: string): Participant[] {
  return raw
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.split(",").map(p => p.trim());
      const name       = parts[0] ?? "";
      const department = parts[1] || null;
      const skillRaw   = parseInt(parts[2] ?? "");
      const skillLevel = isNaN(skillRaw) ? null : Math.max(1, Math.min(5, skillRaw));
      const seniority  = parts[3] ? parseSeniority(parts[3]) : null;
      const tags = parts[4]
        ? parts[4].split(" ").map(t => t.trim().toLowerCase()).filter(Boolean)
        : [];

      return {
        id: `p_${i}_${name.toLowerCase().replace(/\s+/g, "_")}`,
        name,
        department,
        skillLevel,
        seniority,
        tags,
        preferences: { mustSeparateFrom: [], preferTogetherWith: [] },
      };
    });
}

function serialize(participants: Participant[]): string {
  return participants.map(p => {
    const dept = p.department ? `, ${p.department}` : "";
    const skill = p.skillLevel != null ? `, ${p.skillLevel}` : "";
    const hasTags = p.tags && p.tags.length > 0;
    const seniority = (p.seniority || hasTags) ? `, ${p.seniority ?? ""}` : "";
    const tags = hasTags ? `, ${p.tags!.join(" ")}` : "";
    return `${p.name}${dept}${skill}${seniority}${tags}`;
  }).join("\n");
}

export function ParticipantInput() {
  const { participants, setParticipants } = useAppStore(useShallow(s => ({
    participants: s.participants,
    setParticipants: s.setParticipants,
  })));
  const [sampleCount, setSampleCount] = useState(12);
  const [rawValue, setRawValue] = useState(() => serialize(participants));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setRawValue(serialize(participants));
    }
  }, [participants]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    editingRef.current = true;
    const text = e.target.value;
    setRawValue(text);
    setParticipants(parseLines(text));
    setTimeout(() => { editingRef.current = false; }, 0);
  }, [setParticipants]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Participants
        </label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={1}
            max={NAMES.length}
            value={sampleCount}
            onChange={e => setSampleCount(Math.min(NAMES.length, Math.max(1, parseInt(e.target.value) || 1)))}
            className="h-5 w-12 px-1.5 text-[11px] text-center font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[11px] text-primary hover:text-primary"
            onClick={() => setParticipants(randomSample(sampleCount))}
          >
            Load sample
          </Button>
        </div>
      </div>
      <Textarea
        value={rawValue}
        onChange={onChange}
        rows={9}
        placeholder={"Alice, Engineering, 4, senior, backend postgres\nBob, Design, 3, mid, figma react\nCarol, Engineering, 2, junior\nDave, PM, 5, senior"}
        className="font-mono text-sm leading-relaxed resize-none placeholder:font-sans placeholder:text-xs"
        spellCheck={false}
      />
      <p className="text-[10px] text-muted-foreground">
        {participants.length} participants
        {participants.some(p => p.tags?.length) && (
          <span className="ml-1 text-muted-foreground/60">· tags detected</span>
        )}
      </p>
    </div>
  );
}
