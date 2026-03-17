"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import type { Task, TaskStatus } from "@/lib/types";

interface Props {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  presetId: string;
}

export function TaskColumn({ status, label, tasks, presetId }: Props) {
  const addTask = useAppStore(s => s.addTask);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function commitAdd() {
    const title = newTitle.trim();
    if (title) {
      addTask(presetId, {
        title,
        status,
        priority: "medium",
        description: "",
        section: "",
        suggestedAssignee: null,
        confirmedAssignee: null,
      });
    }
    setNewTitle("");
    setAdding(false);
  }

  const inProgress = status === "in_progress";
  const isDone = status === "done";

  return (
    <div className="flex flex-col gap-2 min-w-[240px] w-[240px] shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">{tasks.length}</Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            presetId={presetId}
            inProgress={inProgress}
            isDone={isDone}
          />
        ))}
      </div>

      {/* Add task inline */}
      {adding ? (
        <input
          autoFocus
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") { setNewTitle(""); setAdding(false); } }}
          onBlur={commitAdd}
          placeholder="Task title…"
          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-card outline-none focus:border-primary"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
