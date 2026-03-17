"use client";

import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Participant } from "@/lib/types";

const NAMES = [
  "Alice","Bob","Carol","Dave","Eve","Frank","Grace","Hank","Ivy","Jack","Kate","Leo",
  "Mia","Nate","Olivia","Pete","Quinn","Rosa","Sam","Tara","Uma","Vince","Wren","Xavi",
  "Yara","Zoe","Aaron","Beth","Carlos","Diana",
];

const DEPARTMENTS = ["Product", "FE", "BE", "DC/ML"];

function randomSample(): Participant[] {
  const shuffled = [...NAMES].sort(() => Math.random() - 0.5);
  const count = 6 + Math.floor(Math.random() * 10);
  return shuffled.slice(0, count).map((name, i) => ({
    id: `p_${i}_${name.toLowerCase()}`,
    name,
    skillLevel: (1 + Math.floor(Math.random() * 5)) as 1 | 2 | 3 | 4 | 5,
    department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)],
  }));
}

function parseLines(raw: string): Participant[] {
  return raw
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [rawName, rawDept, rawSkill] = line.split(",").map(s => s.trim());
      const name = rawName;
      const department = rawDept || null;
      const skill = rawSkill ? Math.min(5, Math.max(1, parseInt(rawSkill))) : null;
      return {
        id: `p_${i}_${name.toLowerCase().replace(/\s+/g, "_")}`,
        name,
        department,
        skillLevel: skill !== null && !isNaN(skill) ? skill : null,
      };
    });
}

export function ParticipantInput() {
  const { participants, setParticipants } = useAppStore(useShallow(s => ({
    participants: s.participants,
    setParticipants: s.setParticipants,
  })));

  const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setParticipants(parseLines(e.target.value));
  }, [setParticipants]);

  const rawValue = participants.map(p => {
    const dept = p.department ? `, ${p.department}` : "";
    const skill = p.skillLevel != null ? `, ${p.skillLevel}` : "";
    return `${p.name}${dept}${skill}`;
  }).join("\n");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Participants
        </label>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[11px] text-primary hover:text-primary"
          onClick={() => setParticipants(randomSample())}
        >
          Load sample
        </Button>
      </div>
      <Textarea
        value={rawValue}
        onChange={onChange}
        rows={9}
        placeholder={"Alice, FE, 3\nBob, BE, 5\nCarol, Product, 2\nDave, DC/ML, 4"}
        className="font-mono text-sm leading-relaxed resize-none placeholder:font-sans placeholder:text-xs"
        spellCheck={false}
      />
      <p className="text-[11px] text-muted-foreground">
        {participants.length} participants
        <span className="ml-1 opacity-50">· Name, Dept, Skill</span>
      </p>
    </div>
  );
}
