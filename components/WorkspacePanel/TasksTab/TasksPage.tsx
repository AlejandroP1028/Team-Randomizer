"use client";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { useGenerateTasks } from "@/hooks/useGenerateTasks";
import { Button } from "@/components/ui/button";
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
    tasks: s.workspaces[presetId]?.tasks ?? EMPTY_TASKS,
  })));
  const { generate, loading, error } = useGenerateTasks(presetId);

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
    <div className="flex flex-col h-full gap-3 p-4 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <Button size="sm" onClick={generate} disabled={loading} className="text-xs gap-1.5">
          {loading && <span className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
          {loading ? "Generating…" : "Generate tasks"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddTask} className="text-xs">
          + Add task
        </Button>
        <ExportTasksBar presetId={presetId} />
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      {/* Filter */}
      <div className="shrink-0">
        <FilterBar presetId={presetId} />
      </div>

      {/* Progress */}
      <div className="shrink-0">
        <ProgressBar tasks={tasks} />
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <TaskBoard presetId={presetId} />
      </div>
    </div>
  );
}
