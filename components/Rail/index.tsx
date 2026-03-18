"use client";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Rail() {
  const router     = useRouter();
  const pathname   = usePathname();
  const presets    = useAppStore(s => s.presets);
  const splits     = useAppStore(s => s.splits);
  const workspaces = useAppStore(s => s.workspaces);
  const loadPreset = useAppStore(s => s.loadPreset);

  // Derive active preset from URL — not from store
  const activeId = pathname.startsWith("/workspace/")
    ? pathname.split("/")[2]
    : null;

  function handleSelectPreset(id: string) {
    loadPreset(id);
    router.push(`/workspace/${id}`);
  }

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

      {/* Team list */}
      <div className="flex-1 overflow-y-auto py-2">

        {/* Presets section */}
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
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`
                    w-full flex items-center gap-2 px-4 py-2 text-left text-sm
                    transition-colors border-l-2
                    ${isActive
                      ? "border-l-blue-500 bg-background font-medium text-foreground"
                      : "border-l-transparent text-muted-foreground hover:bg-background"}
                  `}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: preset.color ?? "#888780" }}
                  />
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

        {/* Splits section */}
        {splits.length > 0 && (
          <>
            <p className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Splits
            </p>
            {splits.map(split => {
              const taskCount = split.subTeams.reduce((sum, st) => {
                const ws = workspaces[st.id];
                return sum + (ws?.tasks?.length ?? 0);
              }, 0);
              const isActive = split.id === activeId;
              return (
                <button
                  key={split.id}
                  onClick={() => router.push(`/workspace/${split.id}`)}
                  className={`
                    w-full flex items-center gap-2 px-4 py-2 text-left text-sm
                    transition-colors border-l-2
                    ${isActive
                      ? "border-l-blue-500 bg-background font-medium text-foreground"
                      : "border-l-transparent text-muted-foreground hover:bg-background"}
                  `}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: split.color ?? "#888780" }}
                  />
                  <span className="flex-1 truncate text-xs">{split.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {split.subTeams.length}t
                  </span>
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

        {totalSaved === 0 && (
          <p className="px-4 py-2 text-xs text-muted-foreground italic">No workspaces yet.</p>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border flex flex-col gap-2">
        <button
          onClick={() => router.push("/")}
          className="w-full py-1.5 text-xs border border-dashed border-border rounded-md
            text-muted-foreground hover:bg-background transition-colors"
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
