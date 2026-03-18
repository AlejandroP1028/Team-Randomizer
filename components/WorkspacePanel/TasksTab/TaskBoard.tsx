"use client";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
} from "@dnd-kit/core";
import { TaskColumn } from "./TaskColumn";
import type { Task, TaskStatus } from "@/lib/types";

const EMPTY_TASKS: Task[] = [];

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo",        label: "To do"       },
  { status: "in_progress", label: "In progress" },
  { status: "in_review",   label: "In review"   },
  { status: "done",        label: "Done"         },
];

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : closestCenter(args);
};

interface Props { presetId: string; }

export function TaskBoard({ presetId }: Props) {
  const { tasks, taskFilters, moveTask } = useAppStore(useShallow(s => ({
    tasks:       s.workspaces[presetId]?.tasks ?? EMPTY_TASKS,
    taskFilters: s.taskFilters,
    moveTask:    s.moveTask,
  })));

  const [draggingTask, setDraggingTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function matchesFilters(t: Task): boolean {
    if (taskFilters.assignees.length > 0) {
      const name = t.confirmedAssignee?.name ?? null;
      const matches =
        (name !== null && taskFilters.assignees.includes(name)) ||
        (!t.confirmedAssignee && taskFilters.assignees.includes("__unassigned__"));
      if (!matches) return false;
    }
    if (taskFilters.priorities.length > 0 && !taskFilters.priorities.includes(t.priority)) return false;
    if (taskFilters.statuses.length > 0   && !taskFilters.statuses.includes(t.status))   return false;
    return true;
  }

  const filtered = tasks.filter(matchesFilters);

  function onDragStart(e: DragStartEvent) {
    const task = tasks.find(t => t.id === e.active.id);
    setDraggingTask(task ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDraggingTask(null);
    const taskId   = e.active.id as string;
    const newStatus = e.over?.data.current?.status as TaskStatus | undefined;
    const oldStatus = e.active.data.current?.status as TaskStatus | undefined;
    if (!newStatus || newStatus === oldStatus) return;
    moveTask(presetId, taskId, newStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {COLUMNS.map(col => (
          <TaskColumn
            key={col.status}
            status={col.status}
            label={col.label}
            tasks={filtered.filter(t => t.status === col.status)}
            presetId={presetId}
            isDragging={draggingTask !== null}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingTask && (
          <div className="rotate-1 scale-105 shadow-xl opacity-95 pointer-events-none w-[240px]">
            <DragGhost task={draggingTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Lightweight ghost shown while dragging — avoids re-rendering full TaskCard with store hooks
function DragGhost({ task }: { task: Task }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-card border border-primary/40 text-xs shadow-lg">
      <span className="font-medium leading-snug truncate">
        {task.title || <span className="italic text-muted-foreground">Untitled</span>}
      </span>
      {task.section && (
        <span className="text-[10px] text-muted-foreground">{task.section}</span>
      )}
    </div>
  );
}
