"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { TeamCard } from "./TeamCard";
import { ParticipantCard } from "./ParticipantCard";
import type { Participant } from "@/lib/types";

interface DragData { participant: Participant; teamIndex: number; memberIndex: number; }

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : closestCenter(args);
};

export function TeamGrid() {
  const { teams, swap, move } = useAppStore(useShallow(s => ({ teams: s.teams, swap: s.swap, move: s.move })));
  const [dragActive, setDragActive] = useState<DragData | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart(e: DragStartEvent) {
    setDragActive(e.active.data.current as DragData);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragActive(null);

    const src = e.active.data.current as DragData;
    const dst = e.over?.data.current as DragData | { teamIndex: number; memberIndex?: number } | undefined;
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
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {teams.map((team, ti) => (
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
