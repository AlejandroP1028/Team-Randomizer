"use client";

import { useDroppable } from "@dnd-kit/core";
import { useAppStore } from "@/store/useAppStore";
import { ParticipantCard } from "./ParticipantCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Team } from "@/lib/types";

const TEAM_ACCENTS = [
  { border: "border-t-blue-500",    text: "text-blue-400"    },
  { border: "border-t-violet-500",  text: "text-violet-400"  },
  { border: "border-t-emerald-500", text: "text-emerald-400" },
  { border: "border-t-amber-500",   text: "text-amber-400"   },
  { border: "border-t-rose-500",    text: "text-rose-400"    },
  { border: "border-t-cyan-500",    text: "text-cyan-400"    },
];

const DEPT_BADGE_CLASS: Record<string, string> = {
  "Product": "bg-violet-500/15 text-violet-300 border-violet-500/20 hover:bg-violet-500/20",
  "FE":      "bg-sky-500/15    text-sky-300    border-sky-500/20    hover:bg-sky-500/20",
  "BE":      "bg-emerald-500/15 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20",
  "DC/ML":   "bg-amber-500/15  text-amber-300  border-amber-500/20  hover:bg-amber-500/20",
};


interface Props { team: Team; teamIndex: number; isDragging?: boolean; }

export function TeamCard({ team, teamIndex, isDragging }: Props) {
  const globalAvg = useAppStore(s => {
    const all = s.teams.flatMap(t => t.members);
    return all.reduce((sum, p) => sum + (p.skillLevel ?? 3), 0) / Math.max(1, all.length);
  });

  const { setNodeRef, isOver } = useDroppable({
    id: `team-${teamIndex}`,
    data: { teamIndex },
  });

  const accent    = TEAM_ACCENTS[teamIndex % TEAM_ACCENTS.length];
  const pct       = Math.round((team.stats.avgSkill / 5) * 100);
  const inBalance = Math.abs(team.stats.avgSkill - globalAvg) <= 0.5;
  const depts     = Object.entries(team.stats.departments);

  return (
    <Card
      ref={setNodeRef}
      className={`
        flex flex-col border-t-2 transition-all duration-100
        ${accent.border}
        ${isOver && isDragging ? "ring-2 ring-primary/30 bg-primary/5" : ""}
      `}
    >
      <CardHeader className="px-3 pt-3 pb-2 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className={`text-xs font-bold tracking-widest uppercase ${accent.text}`}>
            {team.name}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            avg <span className="text-foreground font-semibold">{team.stats.avgSkill}</span>
          </span>
        </div>

        {/* Skill bar */}
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${inBalance ? "bg-emerald-500" : "bg-amber-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Dept breakdown */}
        {depts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {depts.map(([dept, count]) => (
              <Badge
                key={dept}
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-4 font-normal border ${DEPT_BADGE_CLASS[dept] ?? "bg-secondary text-secondary-foreground"}`}
              >
                {dept} <span className="ml-0.5 opacity-60">×{count}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-2 pb-2 flex flex-col gap-0.5 min-h-[48px]">
        {team.members.map((p, mi) => (
          <ParticipantCard key={p.id} participant={p} teamIndex={teamIndex} memberIndex={mi} />
        ))}
      </CardContent>

    </Card>
  );
}
