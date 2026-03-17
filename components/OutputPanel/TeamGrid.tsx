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
import { CustomTeamCard, CUSTOM_TEAM_INDEX } from "./CustomTeamCard";
import { ParticipantCard } from "./ParticipantCard";
import type { Participant } from "@/lib/types";

interface DragData { participant: Participant; teamIndex: number; memberIndex: number; }

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : closestCenter(args);
};

export function TeamGrid() {
  const { teams, customTeam, swap, move, moveToCustom, moveFromCustom, swapWithCustom, swapInCustom } =
    useAppStore(useShallow(s => ({
      teams: s.teams,
      customTeam: s.customTeam,
      swap: s.swap,
      move: s.move,
      moveToCustom: s.moveToCustom,
      moveFromCustom: s.moveFromCustom,
      swapWithCustom: s.swapWithCustom,
      swapInCustom: s.swapInCustom,
    })));
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

    const srcTi = src.teamIndex;
    const srcMi = src.memberIndex;
    const dstTi = dst.teamIndex;

    const hasSlot = "memberIndex" in dst && dst.memberIndex !== undefined;
    const dstMi = hasSlot ? (dst as DragData).memberIndex : -1;

    if (srcTi === dstTi && srcMi === dstMi) return;

    const srcIsCustom = srcTi === CUSTOM_TEAM_INDEX;
    const dstIsCustom = dstTi === CUSTOM_TEAM_INDEX;

    if (hasSlot) {
      if (srcIsCustom && dstIsCustom) {
        swapInCustom(srcMi, dstMi);
      } else if (srcIsCustom) {
        swapWithCustom(srcMi, dstTi, dstMi);
      } else if (dstIsCustom) {
        swapWithCustom(dstMi, srcTi, srcMi);
      } else {
        swap(srcTi, srcMi, dstTi, dstMi);
      }
    } else {
      if (srcTi === dstTi) return;
      if (srcIsCustom) {
        moveFromCustom(srcMi, dstTi);
      } else if (dstIsCustom) {
        moveToCustom(srcTi, srcMi);
      } else {
        move(srcTi, srcMi, dstTi);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          {teams.map((team, ti) => (
            <TeamCard key={team.id} team={team} teamIndex={ti} isDragging={dragActive !== null} />
          ))}
        </div>
        <CustomTeamCard team={customTeam} isDragging={dragActive !== null} />
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
