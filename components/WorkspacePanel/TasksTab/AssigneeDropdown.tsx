"use client";
import { useAppStore } from "@/store/useAppStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task } from "@/lib/types";

interface Props {
  presetId: string;
  task: Task;
}

export function AssigneeDropdown({ presetId, task }: Props) {
  const updateTask = useAppStore(s => s.updateTask);
  const participants = useAppStore(s => s.presets.find(p => p.id === presetId)?.participants ?? []);

  function handleChange(value: string | null) {
    if (!value) return;
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
      <SelectTrigger className="h-6 w-auto border-0 bg-transparent p-0 text-xs gap-1 shadow-none focus:ring-0">
        <SelectValue />
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
