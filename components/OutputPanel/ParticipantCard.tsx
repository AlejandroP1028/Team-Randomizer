"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Participant } from "@/lib/types";

const SKILL_STYLE: Record<number, string> = {
  1: "bg-red-500/20     text-red-300",
  2: "bg-orange-500/20  text-orange-300",
  3: "bg-amber-500/20   text-amber-300",
  4: "bg-teal-500/20    text-teal-300",
  5: "bg-blue-500/20    text-blue-300",
};

const DEPT_DOT: Record<string, string> = {
  "Product": "bg-violet-400",
  "FE":      "bg-sky-400",
  "BE":      "bg-emerald-400",
  "DC/ML":   "bg-amber-400",
};

interface Props { participant: Participant; teamIndex: number; memberIndex: number; }

export function ParticipantCard({ participant, teamIndex, memberIndex }: Props) {
  const dragData = { participant, teamIndex, memberIndex };

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `${participant.id}-${teamIndex}-${memberIndex}`,
    data: dragData,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `chip-${teamIndex}-${memberIndex}`,
    data: dragData,
  });

  const skill      = Math.round(participant.skillLevel ?? 3);
  const skillClass = SKILL_STYLE[skill] ?? SKILL_STYLE[3];
  const dotColor   = participant.department ? (DEPT_DOT[participant.department] ?? "bg-muted-foreground") : null;
  const hasMeta    = !!participant.department || (participant.tags && participant.tags.length > 0);

  return (
    <Card
      ref={(node: HTMLDivElement | null) => { setDragRef(node); setDropRef(node); }}
      className={[
        "group flex-col rounded-md text-xs gap-0 py-0",
        "cursor-grab active:cursor-grabbing select-none",
        "transition-all duration-150",
        isDragging
          ? "opacity-25 ring-transparent bg-transparent"
          : isOver
            ? "ring-primary/40 bg-primary/5"
            : "hover:ring-foreground/25 hover:bg-accent",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      {/* Main row — always visible */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="grid grid-cols-2 gap-[3px] opacity-20 group-hover:opacity-60 transition-opacity shrink-0">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="block w-[3px] h-[3px] rounded-full bg-foreground" />
          ))}
        </div>

        {dotColor && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}

        <span className="flex-1 text-foreground font-medium truncate">{participant.name}</span>

        <Badge variant="outline" className={`font-mono text-[10px] px-1.5 h-4 border-0 ${skillClass} shrink-0`}>
          {skill}
        </Badge>
      </div>

      {/* Meta row — space always reserved when hasMeta, opacity toggles on hover (no reflow) */}
      {hasMeta && (
        <div className="flex items-center gap-1.5 flex-wrap px-2 pb-1.5 pl-9 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {participant.department && (
            <span className="text-muted-foreground text-[10px] shrink-0">
              {participant.department}
            </span>
          )}
          {participant.tags && participant.tags.length > 0 && (
            <>
              {participant.department && <span className="text-border text-[10px]">·</span>}
              {participant.tags.slice(0, 3).map(tag => (
                <span key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                  {tag}
                </span>
              ))}
              {participant.tags.length > 3 && (
                <span className="text-[9px] text-muted-foreground">+{participant.tags.length - 3}</span>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
