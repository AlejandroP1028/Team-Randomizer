"use client";

import type { Team } from "@/lib/types";

const TEAM_BAR = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500"];

interface Props { teams: Team[]; globalAvg: number; }

export function BalanceIndicator({ teams, globalAvg }: Props) {
  return (
    <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Skill balance
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          global avg <span className="text-foreground">{globalAvg.toFixed(1)}</span>
        </span>
      </div>
      <div className="flex gap-1.5">
        {teams.map((team, i) => {
          const delta = team.stats.avgSkill - globalAvg;
          const ok = Math.abs(delta) <= 0.5;
          return (
            <div
              key={i}
              title={`${team.name} · avg ${team.stats.avgSkill} · ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}
              className="flex-1 flex flex-col gap-1"
            >
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${ok ? TEAM_BAR[i % TEAM_BAR.length] : "bg-amber-400"}`}
                  style={{ width: `${Math.round((team.stats.avgSkill / 5) * 100)}%` }}
                />
              </div>
              <span className={`font-mono text-[10px] text-center ${ok ? "text-muted-foreground" : "text-amber-400"}`}>
                {team.stats.avgSkill}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
