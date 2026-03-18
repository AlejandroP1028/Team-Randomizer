"use client";
import { useAppStore } from "@/store/useAppStore";
import { OutputPanel } from "@/components/OutputPanel";

function EmptyState() {
  const presets = useAppStore(s => s.presets);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {presets.length > 0 ? "Select a team from the left" : "Create your first team"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
          {presets.length > 0
            ? "Or add participants and generate a new one."
            : "Add participants on the left and click Generate to get started."}
        </p>
      </div>
    </div>
  );
}

export function RightPane() {
  const teams = useAppStore(s => s.teams);
  if (teams.length === 0) return <EmptyState />;
  return <OutputPanel />;
}
