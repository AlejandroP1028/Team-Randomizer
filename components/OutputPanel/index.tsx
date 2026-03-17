"use client";

import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { TeamGrid } from "./TeamGrid";
import { BalanceIndicator } from "./BalanceIndicator";
import { ExportBar } from "./ExportBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function OutputPanel() {
  const { teams, warnings, undo, teamHistory } = useAppStore(useShallow(s => ({
    teams: s.teams,
    warnings: s.warnings,
    undo: s.undo,
    teamHistory: s.teamHistory,
  })));

  const globalAvg = teams.length
    ? teams.flatMap(t => t.members).reduce((s, p) => s + (p.skillLevel ?? 3), 0) /
      teams.flatMap(t => t.members).length
    : 0;

  const softWarnings = warnings.filter(w => w.type === "soft_constraint_unmet");

  return (
    <div className="flex flex-col gap-4 p-5 h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          {teams.length > 0 && (
            <span className="text-sm font-semibold">
              {teams.length} teams
              <span className="text-muted-foreground font-mono font-normal text-xs ml-2">
                avg {globalAvg.toFixed(1)}
              </span>
            </span>
          )}
          {softWarnings.length > 0 && (
            <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-[11px]">
              ⚠ {softWarnings.length} constraint{softWarnings.length > 1 ? "s" : ""} unmet
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!teamHistory.length}
            title="Undo (Cmd/Ctrl+Z)"
            className="text-xs"
          >
            ↩ Undo
          </Button>
          <ExportBar />
        </div>
      </div>

      {/* Content */}
      {teams.length > 0 ? (
        <div className="flex flex-col gap-4 flex-1">
          <TeamGrid />
          <BalanceIndicator teams={teams} globalAvg={globalAvg} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center opacity-30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="6" r="3" fill="currentColor" opacity=".7"/>
              <circle cx="18" cy="6" r="3" fill="currentColor" opacity=".7"/>
              <circle cx="6" cy="18" r="3" fill="currentColor" opacity=".7"/>
              <circle cx="18" cy="18" r="3" fill="currentColor" opacity=".7"/>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            Add participants and click <span className="text-foreground font-semibold">Generate teams</span>
          </p>
        </div>
      )}
    </div>
  );
}
