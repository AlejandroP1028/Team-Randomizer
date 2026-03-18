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
  const { teams, warnings, undo, teamHistory, scores } = useAppStore(useShallow(s => ({
    teams: s.teams,
    warnings: s.warnings,
    undo: s.undo,
    teamHistory: s.teamHistory,
    scores: s.scores,
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

          {/* Summary strip */}
          {scores && (
            <div className="shrink-0 px-3 pt-3 pb-1 grid grid-cols-4 gap-3 border-t border-border">
              {(
                [
                  {
                    key:   "skill",
                    label: "Skill",
                    value: `${skillSpread.toFixed(1)} spread`,
                    desc:  skillSpread <= 0.5 ? "evenly balanced" : skillSpread <= 1 ? "slight variance" : "notable imbalance",
                    tone:  skillSpread <= 0.5 ? "good" : skillSpread <= 1 ? "neutral" : "warn",
                  },
                  {
                    key:   "department",
                    label: "Dept mix",
                    value: `${deptCount} dept${deptCount !== 1 ? "s" : ""}`,
                    desc:  deptCount === 0 ? "no dept data" : deptCount === 1 ? "single dept" : deptCount <= 2 ? "some variety" : "cross-functional",
                    tone:  deptCount >= 3 ? "good" : deptCount === 2 ? "neutral" : "warn",
                  },
                  {
                    key:   "seniority",
                    label: "Seniority",
                    value: [
                      seniorityTotals.senior > 0 ? `${seniorityTotals.senior}s` : "",
                      seniorityTotals.mid    > 0 ? `${seniorityTotals.mid}m`    : "",
                      seniorityTotals.junior > 0 ? `${seniorityTotals.junior}j` : "",
                    ].filter(Boolean).join(" · ") || "—",
                    desc:
                      seniorityTotals.senior > 0 && seniorityTotals.junior > 0 ? "senior–junior spread" :
                      seniorityTotals.senior > 0 ? "senior-heavy" :
                      seniorityTotals.junior > 0 ? "junior-heavy" : "mid-level focus",
                    tone: seniorityTotals.senior > 0 && (seniorityTotals.mid > 0 || seniorityTotals.junior > 0) ? "good" : "neutral",
                  },
                  {
                    key:   "headcount",
                    label: "Headcount",
                    value: `${avgTeamSize.toFixed(1)} avg`,
                    desc:  `${allMembers.length} members across ${teams.length} team${teams.length !== 1 ? "s" : ""}`,
                    tone:  "neutral" as const,
                  },
                ] as { key: string; label: string; value: string; desc: string; tone: "good" | "warn" | "neutral" }[]
              ).map(({ key, label, value, desc, tone }) => {
                const scoreVal = scores[key as keyof typeof scores] as number | undefined;
                const valueColor =
                  tone === "good" ? "text-emerald-400" :
                  tone === "warn" ? "text-amber-400"   :
                  "text-foreground/80";
                return (
                  <div key={key} className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      {label}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-[11px] font-semibold leading-tight ${valueColor}`}>{value}</span>
                      {scoreVal !== undefined && (
                        <span className={`text-[10px] font-mono ${valueColor}`}>
                          {Math.round(scoreVal)}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground/50 leading-tight">{desc}</span>
                  </div>
                );
              })}
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
