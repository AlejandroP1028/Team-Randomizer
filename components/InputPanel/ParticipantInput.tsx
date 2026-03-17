"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Participant } from "@/lib/types";

const NAMES = [
  "Alice","Bob","Carol","Dave","Eve","Frank","Grace","Hank","Ivy","Jack","Kate","Leo",
  "Mia","Nate","Olivia","Pete","Quinn","Rosa","Sam","Tara","Uma","Vince","Wren","Xavi",
  "Yara","Zoe","Aaron","Beth","Carlos","Diana",
];

const DEPARTMENTS = ["Product", "FE", "BE", "DC/ML"];

function randomSample(count: number): Participant[] {
  const shuffled = [...NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, NAMES.length)).map((name, i) => ({
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

function serialize(participants: Participant[]): string {
  return participants.map(p => {
    const dept = p.department ? `, ${p.department}` : "";
    const skill = p.skillLevel != null ? `, ${p.skillLevel}` : "";
    return `${p.name}${dept}${skill}`;
  }).join("\n");
}

export function ParticipantInput() {
  const { participants, setParticipants } = useAppStore(useShallow(s => ({
    participants: s.participants,
    setParticipants: s.setParticipants,
  })));
  const [sampleCount, setSampleCount] = useState(12);
  const [rawValue, setRawValue] = useState(() => serialize(participants));
  // True while the user is actively editing — prevents external sync from clobbering their input
  const editingRef = useRef(false);

  // When participants change externally (load sample, undo), overwrite the textarea
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
    // Allow external sync again after React has flushed the store update
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
