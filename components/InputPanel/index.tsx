"use client";

import { ParticipantInput } from "./ParticipantInput";
import { ConstraintConfig } from "./ConstraintConfig";
import { PresetSidebar } from "./PresetSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGenerate } from "@/hooks/useGenerate";
import { useAppStore } from "@/store/useAppStore";

export function InputPanel() {
  const { generate } = useGenerate();
  const loading = useAppStore(s => s.loading);
  const participants = useAppStore(s => s.participants);

  return (
    <div className="flex flex-col gap-5 p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Team Randomizer</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">v1.0</p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="4" r="2" fill="hsl(var(--chart-1))" />
              <circle cx="10" cy="4" r="2" fill="hsl(var(--chart-2))" />
              <circle cx="4" cy="10" r="2" fill="hsl(var(--chart-3))" />
              <circle cx="10" cy="10" r="2" fill="hsl(var(--chart-4))" />
            </svg>
          </div>
        </div>
      </div>

      <ParticipantInput />
      <Separator />
      <ConstraintConfig />
      <Separator />
      <PresetSidebar />

      <Button
        onClick={generate}
        disabled={loading || participants.length < 2}
        className="mt-auto w-full font-semibold"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Generating…
          </span>
        ) : "Generate teams"}
      </Button>
    </div>
  );
}
