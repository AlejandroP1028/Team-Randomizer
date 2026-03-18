"use client";
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard";
import { NewTaskModal } from "./NewTaskModal";
import type { Task, TaskStatus } from "@/lib/types";

const STATUS_CONFIG: Record<TaskStatus, { dot: string; tint: string; ring: string }> = {
  todo:        { dot: "bg-slate-400",   tint: "",                          ring: "ring-slate-300/60"   },
  in_progress: { dot: "bg-blue-500",    tint: "bg-blue-500/[0.03]",        ring: "ring-blue-400/40"    },
  in_review:   { dot: "bg-amber-500",   tint: "bg-amber-500/[0.03]",       ring: "ring-amber-400/40"   },
  done:        { dot: "bg-emerald-500", tint: "bg-emerald-500/[0.03]",     ring: "ring-emerald-400/40" },
};

interface Props {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  presetId: string;
  isDragging?: boolean;
}

export function TaskColumn({ status, label, tasks, presetId, isDragging }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  const cfg = STATUS_CONFIG[status];

  return (
    /* h-full so the column stretches to the board height; flex-col to stack header + list + add */
    <div className="flex flex-col min-w-[264px] w-[264px] shrink-0 h-full">
      <NewTaskModal
        presetId={presetId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultStatus={status}
      />

      {/* Column header */}
      <div className="shrink-0 flex items-center gap-2 px-1 pb-3">
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <span className="text-xs font-semibold text-foreground/80 tracking-wide">{label}</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone — flex-1 min-h-0 so it fills remaining column height and scrolls internally */}
      <div
        ref={setNodeRef}
        className={[
          "flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 rounded-xl p-2 transition-all duration-150",
          cfg.tint,
          isOver && isDragging
            ? `ring-2 ${cfg.ring} ${cfg.tint || "bg-muted/20"}`
            : "",
        ].join(" ")}
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            presetId={presetId}
            inProgress={status === "in_progress"}
            isDone={status === "done"}
          />
        ))}
        {/* Spacer so empty columns still accept drops */}
        {tasks.length === 0 && (
          <div className="flex-1 min-h-[60px]" />
        )}
      </div>

      {/* Add task */}
      <div className="shrink-0 pt-2">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          + Add task
        </button>
      </div>
    </div>
  );
}
