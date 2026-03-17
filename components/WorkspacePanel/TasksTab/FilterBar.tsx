"use client";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import type { Participant } from "@/lib/types";

const EMPTY_PARTICIPANTS: Participant[] = [];

interface Props { presetId: string; }

export function FilterBar({ presetId }: Props) {
  const { activeFilter, setActiveFilter, participants } = useAppStore(useShallow(s => ({
    activeFilter: s.activeFilter,
    setActiveFilter: s.setActiveFilter,
    participants: s.presets.find(p => p.id === presetId)?.participants ?? EMPTY_PARTICIPANTS,
  })));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Button
        variant={activeFilter === null ? "secondary" : "ghost"}
        size="sm"
        className="h-6 px-2.5 text-xs rounded-full"
        onClick={() => setActiveFilter(null)}
      >
        All
      </Button>
      {participants.map(p => (
        <Button
          key={p.id}
          variant={activeFilter === p.name ? "secondary" : "ghost"}
          size="sm"
          className="h-6 px-2.5 text-xs rounded-full"
          onClick={() => setActiveFilter(p.name)}
        >
          {p.name}
        </Button>
      ))}
      <Button
        variant={activeFilter === "__unassigned__" ? "secondary" : "ghost"}
        size="sm"
        className="h-6 px-2.5 text-xs rounded-full"
        onClick={() => setActiveFilter("__unassigned__")}
      >
        Unassigned
      </Button>
    </div>
  );
}
