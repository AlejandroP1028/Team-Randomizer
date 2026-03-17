"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AssigneeDropdown } from "./AssigneeDropdown";
import type { Task, TaskStatus } from "@/lib/types";

const PALETTE = [
  "bg-purple-100 text-purple-800",
  "bg-teal-100 text-teal-800",
  "bg-amber-100 text-amber-800",
  "bg-orange-100 text-orange-800",
  "bg-blue-100 text-blue-800",
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

const ALL_STATUSES: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

interface Props {
  task: Task;
  presetId: string;
  inProgress?: boolean;
  isDone?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function TaskCard({ task, presetId, inProgress, isDone }: Props) {
  const updateTask = useAppStore(s => s.updateTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const moveTask = useAppStore(s => s.moveTask);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [expanded, setExpanded] = useState(false);

  function commitTitle() {
    updateTask(presetId, task.id, { title: titleDraft });
    setEditingTitle(false);
  }

  const assigneeName = task.confirmedAssignee?.name ?? task.suggestedAssignee?.name;
  const avatarColor = assigneeName
    ? PALETTE[assigneeName.charCodeAt(0) % PALETTE.length]
    : "bg-muted text-muted-foreground";

  const otherStatuses = ALL_STATUSES.filter(s => s !== task.status);

  return (
    <div className={`group relative flex flex-col gap-2 p-3 rounded-lg bg-card border text-xs transition-all
      ${inProgress ? "border-primary/50" : "border-border/60"}
      ${isDone ? "opacity-60" : ""}
      hover:shadow-md hover:border-border
    `}>
      {/* Top row: priority + title + delete */}
      <div className="flex items-start gap-2">
        {task.priority === "high" && <Badge variant="destructive" className="text-[10px] px-1.5 h-4 shrink-0">high</Badge>}
        {task.priority === "medium" && <Badge className="text-[10px] px-1.5 h-4 shrink-0 bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-100">medium</Badge>}
        {task.priority === "low" && <Badge variant="secondary" className="text-[10px] px-1.5 h-4 shrink-0">low</Badge>}

        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
            className="flex-1 bg-transparent border-b border-primary outline-none text-xs font-medium"
          />
        ) : (
          <span
            className={`flex-1 font-medium leading-snug cursor-text ${isDone ? "line-through" : ""}`}
            onDoubleClick={() => { setTitleDraft(task.title); setEditingTitle(true); }}
          >
            {task.title || <span className="text-muted-foreground italic">Untitled</span>}
          </span>
        )}

        <button
          onClick={() => deleteTask(presetId, task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1 shrink-0 leading-none"
          aria-label="Delete task"
        >
          ×
        </button>
      </div>

      {/* Section */}
      {task.section && (
        <span className="text-[10px] text-muted-foreground">{task.section}</span>
      )}

      {/* Description */}
      {task.description && (
        <p
          className={`text-muted-foreground leading-relaxed cursor-pointer ${expanded ? "" : "line-clamp-2"}`}
          onClick={() => setExpanded(v => !v)}
        >
          {task.description}
        </p>
      )}

      {/* Bottom row: assignee + move */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          {assigneeName && (
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${avatarColor}`}>
              {getInitials(assigneeName)}
            </span>
          )}
          <AssigneeDropdown presetId={presetId} task={task} />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground">
              → {STATUS_LABELS[task.status]}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="end">
            {otherStatuses.map(s => (
              <button
                key={s}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
                onClick={() => moveTask(presetId, task.id, s)}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
