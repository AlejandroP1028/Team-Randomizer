"use client";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { TeamTab } from "../TeamTab";
import { PrdInput } from "../PrdTab/PrdInput";

interface Props { presetId: string; }

export function ContextPanel({ presetId }: Props) {
  const router     = useRouter();
  const preset     = useAppStore(s => s.presets.find(p => p.id === presetId));
  const split      = useAppStore(s => s.splits.find(sp => sp.id === presetId));
  const loadPreset = useAppStore(s => s.loadPreset);

  const name  = preset?.name  ?? split?.name  ?? "Workspace";
  const color = preset?.color ?? split?.color ?? null;

  function handleEdit() {
    if (preset) loadPreset(presetId);
    router.push("/");
  }

  return (
    <aside className="w-[240px] shrink-0 flex flex-col h-full overflow-hidden border-r border-border bg-muted/10">

      {/* Header */}
      <div className="shrink-0 flex items-center gap-2.5 px-4 py-3.5 border-b border-border">
        {color && (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ background: color }}
          />
        )}
        <span className="flex-1 text-sm font-semibold truncate">{name}</span>
        <button
          onClick={handleEdit}
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Back to editor"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      {/* Team */}
      <div className="flex-[2] min-h-0 overflow-hidden border-b border-border">
        <TeamTab presetId={presetId} />
      </div>

      {/* PRD */}
      <div className="flex-[3] min-h-0 overflow-hidden">
        <PrdInput presetId={presetId} />
      </div>
    </aside>
  );
}
