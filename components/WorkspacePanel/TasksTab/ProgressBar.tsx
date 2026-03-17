"use client";
import type { Task } from "@/lib/types";

interface Props { tasks: Task[]; }

export function ProgressBar({ tasks }: Props) {
  const total = tasks.length;
  if (total === 0) return null;
  const done = tasks.filter(t => t.status === "done").length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
        {done} of {total} done
      </span>
    </div>
  );
}
