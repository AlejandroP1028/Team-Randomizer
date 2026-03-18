"use client";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { FilterBar } from "./FilterBar";
import { ProgressBar } from "./ProgressBar";
import { TaskBoard } from "./TaskBoard";
import { ExportTasksBar } from "./ExportTasksBar";
import type { Task } from "@/lib/types";

const EMPTY_TASKS: Task[] = [];

interface Props { presetId: string; }

export function TasksPage({ presetId }: Props) {
  const { addTask, tasks } = useAppStore(useShallow(s => ({
    addTask: s.addTask,
    tasks:   s.workspaces[presetId]?.tasks ?? EMPTY_TASKS,
  })));

  function handleAddTask() {
    addTask(presetId, {
      title: "",
      status: "todo",
      priority: "medium",
      description: "",
      section: "",
      suggestedAssignee: null,
      confirmedAssignee: null,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border">
        <button
          onClick={handleAddTask}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          New task
        </button>

        {/* Filter inline in toolbar */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <FilterBar presetId={presetId} />
        </div>

        <div className="shrink-0">
          <ExportTasksBar presetId={presetId} />
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="shrink-0 px-5 py-2.5 border-b border-border/40">
          <ProgressBar tasks={tasks} />
        </div>
      )}

      {/* Board or empty state */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-muted-foreground/40">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground/70">No tasks yet</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Write a PRD in the left panel and click{" "}
              <span className="font-semibold text-foreground/80">Generate tasks →</span>
            </p>
          </div>
        </div>
      ) : (
        /* flex-1 min-h-0 is critical — lets TaskBoard get a definite height for inner overflow */
        <div className="flex-1 min-h-0 overflow-hidden px-4 pt-4">
          <TaskBoard presetId={presetId} />
        </div>
      )}
    </div>
  );
}
