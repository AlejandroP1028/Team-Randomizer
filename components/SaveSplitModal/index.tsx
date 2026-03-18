"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import type { Team } from "@/lib/types";

const COLOR_PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
];

const PRD_DESCRIPTIONS = {
  per_team: "Each team writes and generates tasks from their own PRD.",
  shared:   "Write one brief for the whole split. Tasks are distributed across teams.",
};

interface Props {
  open: boolean;
  onClose: () => void;
  teams: Team[];
}

export function SaveSplitModal({ open, onClose, teams }: Props) {
  const saveSplit = useAppStore(s => s.saveSplit);
  const router = useRouter();

  const [splitName, setSplitName] = useState("");
  const [teamNames, setTeamNames] = useState<string[]>(() =>
    teams.map((_, i) => `Team ${i + 1}`)
  );
  const [prdMode, setPrdMode] = useState<"per_team" | "shared">("per_team");

  function handleTeamNameChange(index: number, value: string) {
    setTeamNames(prev => prev.map((n, i) => (i === index ? value : n)));
  }

  function handleSave() {
    if (!splitName.trim()) return;
    saveSplit(splitName.trim(), teamNames, prdMode);
    const splitId = useAppStore.getState().activeSplitId;
    onClose();
    if (splitId) router.push(`/workspace/${splitId}`);
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md gap-5">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Save split</DialogTitle>
        </DialogHeader>

        {/* Split name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Split name
          </label>
          <Input
            value={splitName}
            onChange={e => setSplitName(e.target.value)}
            placeholder="e.g. Hackathon Q2"
            className="h-9 text-sm"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter" && splitName.trim()) handleSave(); }}
          />
        </div>

        {/* Team rows */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Team names
          </label>
          <div className="flex flex-col gap-1.5">
            {teams.map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLOR_PALETTE[i % COLOR_PALETTE.length] }}
                />
                <Input
                  value={teamNames[i] ?? `Team ${i + 1}`}
                  onChange={e => handleTeamNameChange(i, e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">
                  {teams[i].members.length} member{teams[i].members.length !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PRD mode toggle */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            PRD mode
          </label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["per_team", "shared"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setPrdMode(mode)}
                className={[
                  "flex-1 py-2 text-xs font-medium transition-colors duration-150",
                  prdMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                {mode === "per_team" ? "Separate PRD per team" : "One shared PRD"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {PRD_DESCRIPTIONS[prdMode]}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!splitName.trim()} onClick={handleSave}>
            Save &amp; open →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
