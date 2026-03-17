"use client";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { TaskColumn } from "./TaskColumn";
import type { Task, TaskStatus } from "@/lib/types";

const EMPTY_TASKS: Task[] = [];

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo",        label: "To do"       },
  { status: "in_progress", label: "In progress" },
  { status: "in_review",   label: "In review"   },
  { status: "done",        label: "Done"         },
];

interface Props { presetId: string; }

export function TaskBoard({ presetId }: Props) {
  const { tasks, activeFilter } = useAppStore(useShallow(s => ({
    tasks: s.workspaces[presetId]?.tasks ?? EMPTY_TASKS,
    activeFilter: s.activeFilter,
  })));

  const filtered = activeFilter
    ? tasks.filter(t => {
        if (activeFilter === "__unassigned__") return !t.confirmedAssignee;
        return t.confirmedAssignee?.name === activeFilter;
      })
    : tasks;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {COLUMNS.map(col => (
        <TaskColumn
          key={col.status}
          status={col.status}
          label={col.label}
          tasks={filtered.filter(t => t.status === col.status)}
          presetId={presetId}
        />
      ))}
    </div>
  );
}
