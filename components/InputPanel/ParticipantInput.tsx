"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusIcon, PencilIcon, Trash2Icon, UserIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Participant, Seniority } from "@/lib/types";

const NAMES = [
  "Alice","Bob","Carol","Dave","Eve","Frank","Grace","Hank","Ivy","Jack","Kate","Leo",
  "Mia","Nate","Olivia","Pete","Quinn","Rosa","Sam","Tara","Uma","Vince","Wren","Xavi",
  "Yara","Zoe","Aaron","Beth","Carlos","Diana",
];
const DEPARTMENTS = ["Product", "FE", "BE", "DC/ML"];
const SENIORITIES: Seniority[] = ["junior", "mid", "senior"];
const SAMPLE_TAGS = ["react", "node", "python", "postgres", "figma", "devops", "ml", "backend", "frontend", "api"];

const SENIORITY_DOT: Record<Seniority, string> = {
  junior: "bg-emerald-400",
  mid: "bg-blue-400",
  senior: "bg-violet-400",
};
const SENIORITY_PILL: Record<Seniority, string> = {
  junior: "bg-emerald-100 text-emerald-700",
  mid: "bg-blue-100 text-blue-700",
  senior: "bg-violet-100 text-violet-700",
};
const DEPT_BORDER: Record<string, string> = {
  Product: "ring-amber-300",
  FE: "ring-sky-300",
  BE: "ring-orange-300",
  "DC/ML": "ring-pink-300",
};
const DEPT_COLORS: Record<string, string> = {
  Product: "bg-amber-100 text-amber-700",
  FE: "bg-sky-100 text-sky-700",
  BE: "bg-orange-100 text-orange-700",
  "DC/ML": "bg-pink-100 text-pink-700",
};

function randomSample(count: number): Participant[] {
  const shuffled = [...NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, NAMES.length)).map((name, i) => {
    const skillLevel = (1 + Math.floor(Math.random() * 5)) as 1 | 2 | 3 | 4 | 5;
    const seniority: Seniority = skillLevel >= 4 ? "senior" : skillLevel >= 3 ? "mid" : "junior";
    const tagCount = Math.floor(Math.random() * 3);
    const tags = [...SAMPLE_TAGS].sort(() => Math.random() - 0.5).slice(0, tagCount);
    return {
      id: `p_${i}_${name.toLowerCase()}`,
      name,
      skillLevel,
      department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)],
      seniority,
      tags,
      preferences: { mustSeparateFrom: [], preferTogetherWith: [] },
    };
  });
}

type FormState = {
  name: string;
  department: string;
  skillLevel: number | null;
  seniority: Seniority | null;
  tags: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  department: "",
  skillLevel: null,
  seniority: null,
  tags: "",
};

function formToParticipant(form: FormState, id: string): Participant {
  return {
    id,
    name: form.name.trim(),
    department: form.department || null,
    skillLevel: form.skillLevel as 1 | 2 | 3 | 4 | 5 | null,
    seniority: form.seniority,
    tags: form.tags.split(/\s+/).map(t => t.toLowerCase()).filter(Boolean),
    preferences: { mustSeparateFrom: [], preferTogetherWith: [] },
  };
}

function participantToForm(p: Participant): FormState {
  return {
    name: p.name,
    department: p.department ?? "",
    skillLevel: p.skillLevel ?? null,
    seniority: p.seniority ?? null,
    tags: p.tags?.join(" ") ?? "",
  };
}

// ─── Participant Card ─────────────────────────────────────────────────────────

function ParticipantCard({
  participant,
  onEdit,
  onDelete,
}: {
  participant: Participant;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const borderClass = participant.department
    ? (DEPT_BORDER[participant.department] ?? "ring-slate-200")
    : "ring-slate-100";
  const dotClass = participant.seniority ? SENIORITY_DOT[participant.seniority] : "bg-slate-200";

  return (
    <div className={`group flex h-9 items-center gap-2 rounded-md bg-white px-2.5 ring-1 transition-shadow hover:shadow-md ${borderClass}`}>
      {/* Seniority dot + Name */}
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
      <span className="min-w-0 w-24 shrink-0 truncate text-sm font-medium text-slate-900">{participant.name}</span>

      {/* Tags — revealed on hover */}
      <div className="flex flex-1 items-center gap-1 overflow-hidden opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {participant.tags?.slice(0, 4).map(tag => (
          <span key={tag} className="inline-flex h-[18px] shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 text-[10px] text-slate-400">
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Edit participant"
        >
          <PencilIcon className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
          aria-label="Remove participant"
        >
          <Trash2Icon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Participant Modal ────────────────────────────────────────────────────────

function ParticipantModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: FormState;
  onSave: (form: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial.name ? "Edit participant" : "Add participant"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Name *</label>
            <Input
              autoFocus
              placeholder="Full name"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
          </div>

          {/* Department */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Department</label>
            <div className="flex flex-wrap gap-1.5">
              {DEPARTMENTS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set("department", form.department === d ? "" : d)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    form.department === d
                      ? (DEPT_COLORS[d] ?? "bg-slate-200 text-slate-700") + " ring-2 ring-offset-1 ring-current"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Skill level */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Skill level</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("skillLevel", form.skillLevel === n ? null : n)}
                  className={`h-7 w-7 rounded-md text-xs font-semibold transition-colors ${
                    form.skillLevel === n
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Seniority */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Seniority</label>
            <div className="flex gap-1.5">
              {SENIORITIES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("seniority", form.seniority === s ? null : s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    form.seniority === s
                      ? (SENIORITY_PILL[s] ?? "bg-slate-200") + " ring-2 ring-offset-1 ring-current"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Tags <span className="text-slate-400 font-normal">(space-separated)</span></label>
            <Input
              placeholder="react node python..."
              value={form.tags}
              onChange={e => set("tags", e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim()}
          >
            {initial.name ? "Save changes" : "Add participant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ParticipantInput() {
  const { participants, setParticipants } = useAppStore(useShallow(s => ({
    participants: s.participants,
    setParticipants: s.setParticipants,
  })));

  const [sampleCount, setSampleCount] = useState(12);
  const [modal, setModal] = useState<{ open: boolean; editing: Participant | null }>({
    open: false,
    editing: null,
  });

  const openAdd = () => setModal({ open: true, editing: null });
  const openEdit = (p: Participant) => setModal({ open: true, editing: p });
  const closeModal = () => setModal(m => ({ ...m, open: false }));

  const handleSave = (form: FormState) => {
    if (modal.editing) {
      setParticipants(participants.map(p =>
        p.id === modal.editing!.id ? formToParticipant(form, p.id) : p
      ));
    } else {
      const id = `p_${Date.now()}_${form.name.toLowerCase().replace(/\s+/g, "_")}`;
      setParticipants([...participants, formToParticipant(form, id)]);
    }
  };

  const handleDelete = (id: string) =>
    setParticipants(participants.filter(p => p.id !== id));

  const initialForm = modal.editing ? participantToForm(modal.editing) : EMPTY_FORM;

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Participants
        </label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={1}
            max={NAMES.length}
            value={sampleCount}
            onChange={e => setSampleCount(Math.min(NAMES.length, Math.max(1, parseInt(e.target.value) || 1)))}
            className="h-5 w-12 px-1.5 text-[11px] text-center font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[11px] text-primary hover:text-primary"
            onClick={() => setParticipants(randomSample(sampleCount))}
          >
            Load sample
          </Button>
        </div>
      </div>

      {/* Participant list */}
      <div className="h-56 overflow-y-auto my-2">
        {participants.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <UserIcon className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">No participants yet</p>
              <p className="text-xs text-slate-400">Add one below or load a sample</p>
            </div>
          </div>
        ) : (
          <motion.ul className="flex flex-col divide-y divide-slate-100  p-1 gap-1">
            <AnimatePresence initial={true}>
              {participants.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, delay: i * 0.04, ease: [0.33, 1, 0.68, 1] }}
                  layout
                >
                  <ParticipantCard
                    participant={p}
                    onEdit={() => openEdit(p)}
                    onDelete={() => handleDelete(p.id)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      {/* Add button */}
      <Button
        variant="outline"
        size="sm"
        className="mt-0.5 w-full gap-1.5 border-dashed text-slate-500 hover:border-slate-300 hover:text-slate-700"
        onClick={openAdd}
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add participant
      </Button>

      {/* Count */}
      <p className="text-[10px] text-muted-foreground">
        {participants.length} participant{participants.length !== 1 ? "s" : ""}
        {participants.some(p => p.tags?.length) && (
          <span className="ml-1 text-muted-foreground/60">· tags detected</span>
        )}
      </p>

      {/* Modal */}
      <ParticipantModal
        open={modal.open}
        onOpenChange={open => setModal(m => ({ ...m, open }))}
        initial={initialForm}
        onSave={handleSave}
      />
    </div>
  );
}
