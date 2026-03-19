"use client";

import { useDroppable } from "@dnd-kit/core";
import { useAppStore } from "@/store/useAppStore";
import { ParticipantCard } from "./ParticipantCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/types";

export const CUSTOM_TEAM_INDEX = -1;

interface Props { team: Team; isDragging?: boolean; }

export function CustomTeamCard({ team, isDragging }: Props) {
  const promoteCustomTeam = useAppStore(s => s.promoteCustomTeam);

  const { setNodeRef, isOver } = useDroppable({
    id: "team--1",
    data: { teamIndex: CUSTOM_TEAM_INDEX },
  });

  return (
    <Card
      ref={setNodeRef}
      className={`
    mx-1
        flex flex-col border-dashed border-border/60 bg-transparent
        transition-all duration-100
        ${isOver && isDragging ? "ring-2 ring-primary/30 bg-primary/5 border-primary/40" : ""}
      `}
    >
      <CardHeader className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground/60">
              Custom
            </span>
            {team.members.length > 0 && (
              <span className="font-mono text-[10px] text-muted-foreground/50">
                {team.members.length} member{team.members.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {team.members.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-5 px-2 text-[10px]"
              onClick={promoteCustomTeam}
            >
              + Create team
            </Button>
          ) : (
            <span className="text-[10px] text-muted-foreground/40 italic">
              Drag participants here to set them aside
            </span>
          )}
        </div>
      </CardHeader>

      {team.members.length > 0 && (
        <CardContent className="px-2 pb-2 flex flex-col gap-0.5 min-h-[48px]">
          {team.members.map((p, mi) => (
            <ParticipantCard
              key={p.id}
              participant={p}
              teamIndex={CUSTOM_TEAM_INDEX}
              memberIndex={mi}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
