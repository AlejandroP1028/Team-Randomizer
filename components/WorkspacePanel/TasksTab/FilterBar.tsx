"use client";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import type { Participant, TaskPriority, TaskStatus } from "@/lib/types";

const EMPTY_PARTICIPANTS: Participant[] = [];

const PRIORITIES: { value: TaskPriority; label: string; activeCls: string }[] = [
  { value: "high",   label: "High",   activeCls: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
  { value: "medium", label: "Medium", activeCls: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  { value: "low",    label: "Low",    activeCls: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600" },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo",        label: "To do"       },
  { value: "in_progress", label: "In progress" },
  { value: "in_review",   label: "In review"   },
  { value: "done",        label: "Done"        },
];

interface Props { presetId: string; }

export function FilterBar({ presetId }: Props) {
  const [open, setOpen] = useState(false);

  const { taskFilters, setTaskFilters, clearTaskFilters, participants } = useAppStore(useShallow(s => ({
    taskFilters:      s.taskFilters,
    setTaskFilters:   s.setTaskFilters,
    clearTaskFilters: s.clearTaskFilters,
    participants:
      s.presets.find(p => p.id === presetId)?.participants ??
      s.splits.find(sp => sp.id === presetId)?.allParticipants ??
      EMPTY_PARTICIPANTS,
  })));

  const activeCount =
    taskFilters.assignees.length +
    taskFilters.priorities.length +
    taskFilters.statuses.length;

  function toggle<T extends string>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  return (
    <div className="relative flex items-center gap-2 min-w-0">

      {/* Filter toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={[
          "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150",
          activeCount > 0
            ? "bg-primary/10 border-primary/30 text-primary dark:bg-primary/20"
            : "border-border text-muted-foreground hover:text-foreground hover:bg-accent",
        ].join(" ")}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
        {activeCount > 0 ? `Filters · ${activeCount}` : "Filter"}
      </button>

      {/* Active chips */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {taskFilters.priorities.map(p => {
            const def = PRIORITIES.find(x => x.value === p);
            return (
              <span key={p} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${def?.activeCls ?? ""}`}>
                {def?.label}
                <button
                  onClick={() => setTaskFilters({ priorities: taskFilters.priorities.filter(x => x !== p) })}
                  className="opacity-60 hover:opacity-100 ml-0.5 leading-none"
                >×</button>
              </span>
            );
          })}
          {taskFilters.statuses.map(s => {
            const def = STATUSES.find(x => x.value === s);
            return (
              <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-secondary text-[11px] font-medium text-foreground/70">
                {def?.label}
                <button
                  onClick={() => setTaskFilters({ statuses: taskFilters.statuses.filter(x => x !== s) })}
                  className="opacity-60 hover:opacity-100 ml-0.5 leading-none"
                >×</button>
              </span>
            );
          })}
          {taskFilters.assignees.map(a => (
            <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-secondary text-[11px] font-medium text-foreground/70">
              {a === "__unassigned__" ? "Unassigned" : a}
              <button
                onClick={() => setTaskFilters({ assignees: taskFilters.assignees.filter(x => x !== a) })}
                className="opacity-60 hover:opacity-100 ml-0.5 leading-none"
              >×</button>
            </span>
          ))}
          <button
            onClick={clearTaskFilters}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-20 w-72 rounded-xl border border-border bg-popover shadow-xl p-4 flex flex-col gap-4">

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Assignee</p>
              <div className="flex flex-wrap gap-1.5">
                {[{ id: "__unassigned__", name: "Unassigned" }, ...participants].map(p => {
                  const val = p.id === "__unassigned__" ? "__unassigned__" : p.name;
                  const active = taskFilters.assignees.includes(val);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setTaskFilters({ assignees: toggle(taskFilters.assignees, val) })}
                      className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent text-muted-foreground"}`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Priority</p>
              <div className="flex gap-1.5">
                {PRIORITIES.map(p => {
                  const active = taskFilters.priorities.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => setTaskFilters({ priorities: toggle(taskFilters.priorities, p.value) })}
                      className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${active ? p.activeCls : "border-border text-muted-foreground hover:bg-accent"}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => {
                  const active = taskFilters.statuses.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      onClick={() => setTaskFilters({ statuses: toggle(taskFilters.statuses, s.value) })}
                      className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
