"use client";

import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Strategy } from "@/lib/types";

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "balanced_skill",   label: "Balanced skill"   },
  { value: "mixed_department", label: "Mixed department" },
  { value: "random",           label: "Random"           },
  { value: "custom",           label: "Custom"           },
];

export function ConstraintConfig() {
  const { config, setConfig, participants } = useAppStore(useShallow(s => ({
    config: s.config,
    setConfig: s.setConfig,
    participants: s.participants,
  })));

  const mode = config.teamCount != null ? "count" : "size";
  const numVal = mode === "count" ? config.teamCount ?? 3 : config.teamSize ?? 2;
  const maxVal = Math.max(2, Math.floor(participants.length / 2));

  function setMode(m: "count" | "size") {
    if (m === "count") setConfig({ teamCount: numVal, teamSize: undefined });
    else               setConfig({ teamSize: numVal, teamCount: undefined });
  }

  function setNum(n: number) {
    const clamped = Math.max(2, Math.min(maxVal, n));
    if (mode === "count") setConfig({ teamCount: clamped });
    else                  setConfig({ teamSize: clamped });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">
          Team size
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-md overflow-hidden border border-input text-xs shrink-0">
            {(["count", "size"] as const).map(m => (
              <Button
                key={m}
                variant={mode === m ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode(m)}
                className="h-8 px-3 rounded-none text-xs"
              >
                {m === "count" ? "Count" : "Size"}
              </Button>
            ))}
          </div>
          <Input
            type="number"
            value={numVal}
            min={2}
            max={maxVal}
            onChange={e => setNum(parseInt(e.target.value) || 2)}
            className="w-16 h-8 font-mono text-center text-sm"
          />
          <span className="text-xs text-muted-foreground">
            {mode === "count" ? "teams" : "per team"}
          </span>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">
          Strategy
        </label>
        <Select value={config.strategy} onValueChange={v => setConfig({ strategy: v as Strategy })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STRATEGIES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
