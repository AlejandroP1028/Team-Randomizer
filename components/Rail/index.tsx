"use client";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { ThemeToggle } from "@/components/ThemeToggle";

const DOT_COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#14b8a6"];

export function Rail() {
  const router     = useRouter();
  const pathname   = usePathname();
  const presets    = useAppStore(s => s.presets);
  const splits     = useAppStore(s => s.splits);
  const workspaces = useAppStore(s => s.workspaces);
  const loadPreset = useAppStore(s => s.loadPreset);

  const activeId = pathname.startsWith("/workspace/")
    ? pathname.split("/")[2]
    : null;

  const totalSaved = presets.length + splits.length;

  return (
    <aside className="w-[210px] shrink-0 border-r border-border flex flex-col h-screen overflow-hidden bg-background-secondary">

      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-medium text-foreground">Team randomizer</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalSaved} workspace{totalSaved !== 1 ? "s" : ""} saved
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">

        {/* Presets */}
        {presets.length > 0 && (
          <>
            <p className="px-4 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Teams
            </p>
            {presets.map(preset => {
              const taskCount = workspaces[preset.id]?.tasks?.length ?? 0;
              const isActive  = preset.id === activeId;
              return (
                <button
                  key={preset.id}
                  onClick={() => { loadPreset(preset.id); router.push(`/workspace/${preset.id}`); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-colors border-l-2
                    ${isActive ? "border-l-blue-500 bg-background font-medium text-foreground" : "border-l-transparent text-muted-foreground hover:bg-background"}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: preset.color ?? "#888780" }} />
                  <span className="flex-1 truncate text-xs">{preset.name}</span>
                  {taskCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">
                      {taskCount}
                    </span>
                  )}
                </button>
              );
            })}
          </>
        )}

        {/* Splits */}
        {splits.length > 0 && (
          <>
            <p className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Splits
            </p>
            {splits.map(split => {
              if (split.prdMode === "shared") {
                /* ── Shared: single row linking to split ID ── */
                const taskCount = workspaces[split.id]?.tasks?.length ?? 0;
                const isActive  = split.id === activeId;
                return (
                  <button
                    key={split.id}
                    onClick={() => router.push(`/workspace/${split.id}`)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-colors border-l-2
                      ${isActive ? "border-l-blue-500 bg-background font-medium text-foreground" : "border-l-transparent text-muted-foreground hover:bg-background"}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: split.color ?? "#888780" }} />
                    <span className="flex-1 truncate text-xs">{split.name}</span>
                    {taskCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">
                        {taskCount}
                      </span>
                    )}
                  </button>
                );
              }

              /* ── Per-team: non-clickable header + indented sub-team rows ── */
              const anyActive = split.subTeams.some(st => st.id === activeId);
              return (
                <div key={split.id}>
                  {/* Split group header — not navigable */}
                  <div className={`flex items-center gap-2 px-4 py-1.5 ${anyActive ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: split.color ?? "#888780" }} />
                    <span className="flex-1 truncate text-xs font-medium">{split.name}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0 bg-muted px-1 rounded">
                      per team
                    </span>
                  </div>

                  {/* Sub-team rows */}
                  {split.subTeams.map((st, i) => {
                    const taskCount = workspaces[st.id]?.tasks?.length ?? 0;
                    const isActive  = st.id === activeId;
                    const dotColor  = DOT_COLORS[i % DOT_COLORS.length];
                    return (
                      <button
                        key={st.id}
                        onClick={() => router.push(`/workspace/${st.id}`)}
                        className={`w-full flex items-center gap-2 pl-8 pr-4 py-1.5 text-left transition-colors border-l-2
                          ${isActive ? "border-l-blue-500 bg-background font-medium text-foreground" : "border-l-transparent text-muted-foreground hover:bg-background"}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                        <span className="flex-1 truncate text-xs">{st.name}</span>
                        {taskCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">
                            {taskCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}

        {totalSaved === 0 && (
          <p className="px-4 py-2 text-xs text-muted-foreground italic">No workspaces yet.</p>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border flex flex-col gap-2">
        <button
          onClick={() => router.push("/")}
          className="w-full py-1.5 text-xs border border-dashed border-border rounded-md text-muted-foreground hover:bg-background transition-colors"
        >
          + New team
        </button>
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="4" r="2" fill="hsl(var(--chart-1))" />
              <circle cx="10" cy="4" r="2" fill="hsl(var(--chart-2))" />
              <circle cx="4" cy="10" r="2" fill="hsl(var(--chart-3))" />
              <circle cx="10" cy="10" r="2" fill="hsl(var(--chart-4))" />
            </svg>
          </div>
        </div>
      </div>
    </aside>
  );
}
