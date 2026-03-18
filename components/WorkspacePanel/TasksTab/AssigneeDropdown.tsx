"use client";
import { useAppStore } from "@/store/useAppStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { Participant, Task } from "@/lib/types";

interface Props {
  presetId: string;
  task: Task;
}

const EMPTY: Participant[] = [];

export function AssigneeDropdown({ presetId, task }: Props) {
  const updateTask   = useAppStore(s => s.updateTask);
  const participants = useAppStore(s =>
    s.presets.find(p => p.id === presetId)?.participants ??
    s.splits.find(sp => sp.id === presetId)?.allParticipants ??
    EMPTY
  );

  // Show confirmed name, fall back to suggested, then "Assign"
  const displayName =
    task.confirmedAssignee?.name ??
    task.suggestedAssignee?.name ??
    "Assign";

  const isMuted = !task.confirmedAssignee;

  function handleChange(value: string | null) {
    if (value === null) return;
    if (value === "__unassigned__") {
      updateTask(presetId, task.id, { confirmedAssignee: null });
    } else {
      const participant = participants.find(p => p.id === value) ?? null;
      updateTask(presetId, task.id, { confirmedAssignee: participant });
    }
  }

  return (
    <Select
      value={task.confirmedAssignee?.id ?? "__unassigned__"}
      onValueChange={handleChange}
    >
      <SelectTrigger className="h-6 w-auto border-0 bg-transparent p-0 text-xs gap-1 shadow-none focus:ring-0 [&>svg]:hidden">
        <span className={isMuted ? "text-muted-foreground" : "text-foreground"}>
          {displayName}
        </span>
        <svg className="h-3 w-3 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__unassigned__">Unassigned</SelectItem>
        {participants.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
