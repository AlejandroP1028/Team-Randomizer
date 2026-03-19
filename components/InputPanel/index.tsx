"use client";

import { ParticipantInput } from "./ParticipantInput";
import { ConstraintConfig } from "./ConstraintConfig";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGenerate } from "@/hooks/useGenerate";
import { useAppStore } from "@/store/useAppStore";

export function InputPanel() {
  const { generate } = useGenerate();
  const loading = useAppStore(s => s.loading);
  const participants = useAppStore(s => s.participants);

  return (
    <div className="flex flex-col gap-2 p-4 h-full">
      <ParticipantInput />
      <ConstraintConfig />

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
