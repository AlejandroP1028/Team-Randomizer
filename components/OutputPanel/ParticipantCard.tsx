"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
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

  const skill = Math.round(participant.skillLevel ?? 3);
  const skillClass = SKILL_STYLE[skill] ?? SKILL_STYLE[3];
  const dotColor = participant.department ? (DEPT_DOT[participant.department] ?? "bg-muted-foreground") : null;

  return (
    <div
      ref={(node: HTMLDivElement | null) => { setDragRef(node); setDropRef(node); }}
      className={`
        group flex items-center gap-2 px-2 py-1.5 rounded-md text-xs
        cursor-grab active:cursor-grabbing select-none
        border transition-all duration-100
        ${isDragging
          ? "opacity-25 border-transparent bg-transparent"
          : isOver
            ? "border-primary/40 bg-primary/5"
            : "border-transparent hover:border-border hover:bg-accent"
        }
      `}
      {...attributes}
      {...listeners}
    >
      {/* Grip */}
      <div className="grid grid-cols-2 gap-[3px] opacity-20 group-hover:opacity-60 transition-opacity shrink-0">
        {[...Array(6)].map((_, i) => (
          <span key={i} className="block w-[3px] h-[3px] rounded-full bg-foreground" />
        ))}
      </div>

      {/* Dept dot */}
      {dotColor && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}

      {/* Name */}
      <span className="flex-1 text-foreground font-medium truncate">{participant.name}</span>

      {/* Dept label on hover */}
      {participant.department && (
        <span className="text-muted-foreground text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {participant.department}
        </span>
      )}

      {/* Skill */}
      <Badge variant="outline" className={`font-mono text-[10px] px-1.5 h-4 border-0 ${skillClass} shrink-0`}>
        {skill}
      </Badge>
    </div>
  );
}
