"use client";

import { useState } from "react";
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
import type { Strategy, GroupingMode, BalanceWeights } from "@/lib/types";

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "balanced_skill",   label: "Balanced skill"   },
  { value: "mixed_department", label: "Mixed department" },
  { value: "random",           label: "Random"           },
  { value: "custom",           label: "Custom"           },
];

const DEFAULT_WEIGHTS: BalanceWeights = { skill: 8, department: 7, seniority: 9, headcount: 6 };

export function ConstraintConfig() {
  const { config, setConfig, participants } = useAppStore(useShallow(s => ({
    config: s.config,
    setConfig: s.setConfig,
    participants: s.participants,
  })));
  const [weightsOpen, setWeightsOpen] = useState(false);

  const mode    = config.groupingMode ?? "mixed";
  const weights = config.weights ?? DEFAULT_WEIGHTS;

  const sizeMode = config.teamCount != null ? "count" : "size";
  const numVal   = sizeMode === "count" ? config.teamCount ?? 3 : config.teamSize ?? 2;
  const maxVal   = Math.max(2, Math.floor(participants.length / 2));

  function setSizeMode(m: "count" | "size") {
    if (m === "count") setConfig({ teamCount: numVal, teamSize: undefined });
    else               setConfig({ teamSize: numVal, teamCount: undefined });
  }

  function setNum(n: number) {
    const clamped = Math.max(2, Math.min(maxVal, n));
    if (sizeMode === "count") setConfig({ teamCount: clamped });
    else                      setConfig({ teamSize: clamped });
  }

  function setWeight(key: keyof BalanceWeights, val: number) {
    setConfig({ weights: { ...weights, [key]: val } });
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Grouping mode */}
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
          Grouping mode
        </div>
        <div className="flex border border-border rounded-md overflow-hidden text-xs">
          {(["mixed", "specialised"] as GroupingMode[]).map(m => (
            <button
              key={m}
              onClick={() => setConfig({ groupingMode: m })}
              className={`flex-1 py-1.5 capitalize transition-colors
                ${mode === m
                  ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950 dark:text-blue-300"
                  : "text-muted-foreground hover:bg-secondary"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
          {mode === "mixed"
            ? "Each team gets a mix of departments and skill levels."
            : "Teams are grouped by department — each team is a discipline squad."}
        </p>
      </div>

      {/* Team size */}
      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">
          Team size
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-md overflow-hidden border border-input text-xs shrink-0">
            {(["count", "size"] as const).map(m => (
              <Button
                key={m}
                variant={sizeMode === m ? "default" : "ghost"}
                size="sm"
                onClick={() => setSizeMode(m)}
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
            {sizeMode === "count" ? "teams" : "per team"}
          </span>
        </div>
      </div>

      {/* Strategy */}
      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">
          Strategy
        </label>
        <Select value={config.strategy} onValueChange={v => setConfig({ strategy: v as Strategy })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>
              {STRATEGIES.find(s => s.value === config.strategy)?.label ?? config.strategy}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STRATEGIES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Balance weights — collapsible */}
      <div>
        <button
          onClick={() => setWeightsOpen(o => !o)}
          className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide
            text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{weightsOpen ? "▾" : "▸"}</span>
          Balance weights
        </button>

        {weightsOpen && (
          <div className="mt-2 flex flex-col gap-2 pl-2 border-l border-border">
            {(Object.entries(weights) as [keyof BalanceWeights, number][]).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] capitalize text-muted-foreground w-24 shrink-0">
                  {key}
                </span>
                <input
                  type="range" min={0} max={10} step={1} value={val}
                  onChange={e => setWeight(key, parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-[10px] text-muted-foreground w-4 text-right">{val}</span>
              </div>
            ))}

            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={config.requireSeniorPerTeam ?? false}
                onChange={e => setConfig({ requireSeniorPerTeam: e.target.checked })}
                className="w-3 h-3"
              />
              <span className="text-[10px] text-muted-foreground">
                Require at least one senior per team
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
