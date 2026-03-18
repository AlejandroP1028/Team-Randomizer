"use client";
import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useAppStore } from "@/store/useAppStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AssigneeDropdown } from "./AssigneeDropdown";
import type { Task, TaskStatus } from "@/lib/types";

const AVATAR_PALETTE = [
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
];

const PRIORITY_BORDER: Record<string, string> = {
  high:   "border-l-red-400 dark:border-l-red-500",
  medium: "border-l-amber-400 dark:border-l-amber-500",
  low:    "border-l-slate-300 dark:border-l-slate-600",
};

const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-red-400",
  medium: "bg-amber-400",
  low:    "bg-slate-300 dark:bg-slate-600",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo:        "To do",
  in_progress: "In progress",
  in_review:   "In review",
  done:        "Done",
};

const ALL_STATUSES: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

interface Props {
  task: Task;
  presetId: string;
  inProgress?: boolean;
  isDone?: boolean;
}

export function TaskCard({ task, presetId, inProgress, isDone }: Props) {
  const updateTask = useAppStore(s => s.updateTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const moveTask   = useAppStore(s => s.moveTask);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]     = useState(task.title);
  const [expanded, setExpanded]         = useState(false);

  function commitTitle() {
    updateTask(presetId, task.id, { title: titleDraft });
    setEditingTitle(false);
  }

  const assigneeName = task.confirmedAssignee?.name ?? task.suggestedAssignee?.name;
  const avatarCls    = assigneeName
    ? AVATAR_PALETTE[assigneeName.charCodeAt(0) % AVATAR_PALETTE.length]
    : "bg-muted text-muted-foreground";

  const otherStatuses = ALL_STATUSES.filter(s => s !== task.status);

  return (
    <div
      ref={setNodeRef}
      className={[
        "group relative flex flex-col gap-2 p-3 rounded-xl bg-card border-l-2 border border-border/50 text-xs transition-all duration-150",
        PRIORITY_BORDER[task.priority] ?? "border-l-slate-300",
        isDone    ? "opacity-50" : "",
        isDragging ? "opacity-20 scale-[0.97] shadow-none" : "hover:shadow-md hover:border-border",
        inProgress && !isDragging ? "shadow-sm shadow-blue-500/10" : "",
      ].join(" ")}
    >
      {/* Top row */}
      <div className="flex items-start gap-2">

        {/* Drag handle — only visible on hover */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 grid grid-cols-2 gap-[3px] opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity shrink-0 cursor-grab active:cursor-grabbing"
          aria-label="Drag"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="block w-[3px] h-[3px] rounded-full bg-foreground" />
          ))}
        </div>

        {/* Priority dot */}
        <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? ""}`} />

        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === "Enter")  commitTitle();
              if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); }
            }}
            className="flex-1 bg-transparent border-b border-primary outline-none text-xs font-medium"
          />
        ) : (
          <span
            className={`flex-1 font-medium leading-snug cursor-text select-none ${isDone ? "line-through text-muted-foreground" : ""}`}
            onDoubleClick={() => { setTitleDraft(task.title); setEditingTitle(true); }}
          >
            {task.title || <span className="italic text-muted-foreground">Untitled</span>}
          </span>
        )}

        {/* Delete */}
        <button
          onClick={() => deleteTask(presetId, task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 text-base leading-none -mt-0.5"
          aria-label="Delete task"
        >
          ×
        </button>
      </div>

      {/* Section chip */}
      {task.section && (
        <span className="self-start text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
          {task.section}
        </span>
      )}

      {/* Description */}
      {task.description && (
        <p
          className={`text-muted-foreground leading-relaxed cursor-pointer text-[11px] ${expanded ? "" : "line-clamp-2"}`}
          onClick={() => setExpanded(v => !v)}
        >
          {task.description}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center gap-1.5">
          {assigneeName && (
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${avatarCls}`}>
              {getInitials(assigneeName)}
            </span>
          )}
          <AssigneeDropdown presetId={presetId} task={task} />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded-md hover:bg-accent">
              <span>{STATUS_LABELS[task.status]}</span>
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="end">
            {otherStatuses.map(s => (
              <button
                key={s}
                className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
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
