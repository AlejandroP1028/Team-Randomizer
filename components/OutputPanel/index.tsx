"use client";

import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { TeamGrid } from "./TeamGrid";
import { ExportBar } from "./ExportBar";
import { ResultsSummary } from "./ResultsSummary";
import { SaveSplitModal } from "@/components/SaveSplitModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function OutputPanel() {
  const { teams, warnings, undo, teamHistory, scores, config } = useAppStore(useShallow(s => ({
    teams: s.teams,
    warnings: s.warnings,
    undo: s.undo,
    teamHistory: s.teamHistory,
    scores: s.scores,
    config: s.config,
  })));

  const [modalOpen, setModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Reset save state whenever a new generation comes in
  useEffect(() => { setIsSaved(false); }, [teams]);

  const allMembers = teams.flatMap(t => t.members);

  const globalAvg = allMembers.length
    ? allMembers.reduce((s, p) => s + (p.skillLevel ?? 3), 0) / allMembers.length
    : 0;

  const softWarnings = warnings.filter(w => w.type === "soft_constraint_unmet");

  // Summary derivations
  const avgTeamSize = teams.length ? allMembers.length / teams.length : 0;
  const teamAvgs = teams.map(t => t.stats.avgSkill);
  const skillSpread = teams.length > 1
    ? Math.max(...teamAvgs) - Math.min(...teamAvgs)
    : 0;
  const deptCount = new Set(allMembers.map(p => p.department).filter(Boolean)).size;
  const seniorityTotals = teams.reduce(
    (acc, t) => {
      acc.junior += t.stats.seniority["junior"] ?? 0;
      acc.mid    += t.stats.seniority["mid"]    ?? 0;
      acc.senior += t.stats.seniority["senior"] ?? 0;
      return acc;
    },
    { junior: 0, mid: 0, senior: 0 }
  );
  const hardFailCount = warnings.filter(w => w.type === "hard_constraint_partial").length;

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
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <ResultsSummary
            totalParticipants={allMembers.length}
            teamCount={teams.length}
            avgTeamSize={avgTeamSize}
            skillSpread={skillSpread}
            deptCount={deptCount}
            seniorityTotals={seniorityTotals}
            softUnmetCount={softWarnings.length}
            hardFailCount={hardFailCount}
          />
          <div className="flex-1 overflow-y-auto">
            <TeamGrid />
          </div>

          {/* Objective scores */}
          {scores && (
            <div className="px-3 pb-1 flex gap-3 border-t border-border pt-2">
              {(["skill", "department", "seniority", "headcount"] as const).map(key => {
                const val = Math.round(scores[key]);
                const colour = val >= 80 ? "text-green-600" : val >= 60 ? "text-amber-600" : "text-red-500";
                const label = key === "department"
                  ? (config.groupingMode === "specialised" ? "dept match" : "dept mix")
                  : key;
                return (
                  <div key={key} className="flex-1 text-center">
                    <div className={`text-sm font-medium ${colour}`}>{val}</div>
                    <div className="text-[9px] text-muted-foreground capitalize">{label}</div>
                  </div>
                );
              })}
              <div className="flex-1 text-center border-l border-border">
                <div className="text-sm font-medium text-foreground">
                  {Math.round(scores.composite)}
                </div>
                <div className="text-[9px] text-muted-foreground">overall</div>
              </div>
            </div>
          )}

          {/* Save CTA */}
          {!isSaved && (
            <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
              <p className="text-xs text-blue-700 flex-1">Happy with these? Save as a workspace →</p>
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white font-medium whitespace-nowrap hover:bg-blue-700 transition-colors"
              >
                Save &amp; open →
              </button>
            </div>
          )}

          <SaveSplitModal
            open={modalOpen}
            onClose={() => { setModalOpen(false); setIsSaved(true); }}
            teams={teams}
          />
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
