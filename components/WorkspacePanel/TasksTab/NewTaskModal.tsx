"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Participant, TaskPriority, TaskStatus } from "@/lib/types";

const EMPTY: Participant[] = [];

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: "high",   label: "High",   color: "text-red-400"    },
  { value: "medium", label: "Medium", color: "text-amber-400"  },
  { value: "low",    label: "Low",    color: "text-slate-400"  },
];

interface Props {
  presetId: string;
  open: boolean;
  onClose: () => void;
  defaultStatus?: TaskStatus;
}

export function NewTaskModal({ presetId, open, onClose, defaultStatus = "todo" }: Props) {
  const addTask      = useAppStore(s => s.addTask);
  const participants = useAppStore(s =>
    s.presets.find(p => p.id === presetId)?.participants ??
    s.splits.find(sp => sp.id === presetId)?.allParticipants ??
    (() => {
      for (const sp of s.splits) {
        const st = sp.subTeams.find(t => t.id === presetId);
        if (st) return st.members;
      }
      return EMPTY;
    })()
  );

  const [title,      setTitle]      = useState("");
  const [section,    setSection]    = useState("");
  const [priority,   setPriority]   = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState("__unassigned__");
  const [desc,       setDesc]       = useState("");

  function reset() {
    setTitle(""); setSection(""); setPriority("medium");
    setAssigneeId("__unassigned__"); setDesc("");
  }

  function handleClose() { reset(); onClose(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const assignee = participants.find(p => p.id === assigneeId) ?? null;
    addTask(presetId, {
      title:              title.trim(),
      description:        desc.trim(),
      priority,
      section:            section.trim(),
      suggestedAssignee:  null,
      confirmedAssignee:  assignee,
      status:             defaultStatus,
    });
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">New task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Set up authentication"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm
                placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                transition-all"
            />
          </div>

          {/* Priority + Assignee row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={p.color}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assignee
              </label>
              <Select value={assigneeId} onValueChange={v => { if (v) setAssigneeId(v); }}>
                <SelectTrigger className="h-9 text-sm">
                  <span className={assigneeId === "__unassigned__" ? "text-muted-foreground" : ""}>
                    {assigneeId === "__unassigned__"
                      ? "Unassigned"
                      : (participants.find(p => p.id === assigneeId)?.name ?? "Unassigned")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {participants.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Section
            </label>
            <input
              value={section}
              onChange={e => setSection(e.target.value)}
              placeholder="e.g. Backend, Frontend…"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm
                placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                transition-all"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Optional details…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none
                placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                transition-all"
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold
                hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm
                disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Add task
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
