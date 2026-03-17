"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { TeamCard } from "./TeamCard";
import { ParticipantCard } from "./ParticipantCard";
import type { Participant, Team } from "@/lib/types";

interface DragData { participant: Participant; teamIndex: number; memberIndex: number; }

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : closestCenter(args);
};

function computeStats(members: Participant[]) {
  const skills = members.map(p => p.skillLevel ?? 3);
  const avg = skills.reduce((s, n) => s + n, 0) / (skills.length || 1);
  const departments: Record<string, number> = {};
  for (const p of members) if (p.department) departments[p.department] = (departments[p.department] ?? 0) + 1;
  return { avgSkill: Math.round(avg * 10) / 10, departments };
}

function applyPreview(teams: Team[], src: DragData, overId: string): Team[] {
  const cloned: Team[] = teams.map(t => ({ ...t, members: [...t.members] }));

  if (overId.startsWith("chip-")) {
    const parts = overId.split("-");
    const dstTi = parseInt(parts[1]);
    const dstMi = parseInt(parts[2]);
    if (src.teamIndex === dstTi && src.memberIndex === dstMi) return teams;
    // swap
    const tmp = cloned[src.teamIndex].members[src.memberIndex];
    cloned[src.teamIndex].members[src.memberIndex] = cloned[dstTi].members[dstMi];
    cloned[dstTi].members[dstMi] = tmp;
    cloned[src.teamIndex].stats = computeStats(cloned[src.teamIndex].members);
    cloned[dstTi].stats = computeStats(cloned[dstTi].members);
  } else if (overId.startsWith("team-")) {
    const dstTi = parseInt(overId.split("-")[1]);
    if (src.teamIndex === dstTi) return teams;
    // move
    const [member] = cloned[src.teamIndex].members.splice(src.memberIndex, 1);
    cloned[dstTi].members.push(member);
    cloned[src.teamIndex].stats = computeStats(cloned[src.teamIndex].members);
    cloned[dstTi].stats = computeStats(cloned[dstTi].members);
  }

  return cloned;
}

export function TeamGrid() {
  const { teams, swap, move } = useAppStore(useShallow(s => ({ teams: s.teams, swap: s.swap, move: s.move })));
  const [dragActive, setDragActive] = useState<DragData | null>(null);
  const [overIdState, setOverIdState] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Compute live preview teams during drag
  const previewTeams = useMemo(() => {
    if (!dragActive || !overIdState) return teams;
    return applyPreview(teams, dragActive, overIdState);
  }, [dragActive, overIdState, teams]);

  function onDragStart(e: DragStartEvent) {
    setDragActive(e.active.data.current as DragData);
  }

  function onDragOver(e: DragOverEvent) {
    setOverIdState(e.over ? String(e.over.id) : null);
  }

  function onDragEnd(e: DragEndEvent) {
    const src = e.active.data.current as DragData;
    const dst = e.over?.data.current as DragData | { teamIndex: number; memberIndex?: number } | undefined;

    setDragActive(null);
    setOverIdState(null);

    if (!dst) return;
    const { teamIndex: srcTi, memberIndex: srcMi } = src;
    const dstTi = dst.teamIndex;

    if ("memberIndex" in dst && dst.memberIndex !== undefined) {
      const dstMi = dst.memberIndex;
      if (srcTi === dstTi && srcMi === dstMi) return;
      swap(srcTi, srcMi, dstTi, dstMi);
    } else {
      if (srcTi === dstTi) return;
      move(srcTi, srcMi, dstTi);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {previewTeams.map((team, ti) => (
          <TeamCard key={team.id} team={team} teamIndex={ti} isDragging={dragActive !== null} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragActive && (
          <div className="rotate-1 scale-105 shadow-2xl opacity-95 pointer-events-none">
            <ParticipantCard
              participant={dragActive.participant}
              teamIndex={dragActive.teamIndex}
              memberIndex={dragActive.memberIndex}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
