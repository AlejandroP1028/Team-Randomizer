"use client";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/card";
import type { Participant, Seniority } from "@/lib/types";

const SKILL_STYLE: Record<number, string> = {
  1: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  2: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  3: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  4: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  5: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

const DOT_COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#14b8a6"];

function imputeSeniority(skill: number): Seniority {
  if (skill <= 2) return "junior";
  if (skill <= 3) return "mid";
  return "senior";
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function MemberRow({ p, color }: { p: Participant; color: string }) {
  return (
    <Card className="flex-row items-center gap-2 py-2 px-2.5 rounded-lg cursor-default
      hover:bg-muted/40 hover:ring-foreground/20 transition-colors">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ background: color + "28", color }}
      >
        {initials(p.name)}
      </div>
      <span className="text-xs truncate flex-1 text-foreground/85">{p.name}</span>
      {p.skillLevel != null && (
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${SKILL_STYLE[p.skillLevel] ?? ""}`}>
          L{p.skillLevel}
        </span>
      )}
    </Card>
  );
}

function StatsRow({ members }: { members: Participant[] }) {
  const counts = members.reduce((acc, p) => {
    const s = p.seniority ?? imputeSeniority(p.skillLevel ?? 3);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!Object.keys(counts).length) return null;

  return (
    <div className="flex gap-1.5 flex-wrap px-2 pt-1 pb-2">
      {(["senior", "mid", "junior"] as const).filter(s => counts[s]).map(s => (
        <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-medium
          ${s === "senior" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : s === "mid"    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          :                  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
          {counts[s]} {s}
        </span>
      ))}
    </div>
  );
}

function TagCloud({ members }: { members: Participant[] }) {
  const tags = Object.entries(
    members.flatMap(p => p.tags ?? []).reduce((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1; return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (!tags.length) return null;

  return (
    <div className="flex gap-1 flex-wrap px-2 pb-2.5">
      {tags.map(([tag, count]) => (
        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary border border-border text-muted-foreground">
          {tag}{count > 1 ? ` ×${count}` : ""}
        </span>
      ))}
    </div>
  );
}

function MemberList({ members, color }: { members: Participant[]; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <StatsRow members={members} />
      <TagCloud members={members} />
      {members.map(p => <MemberRow key={p.id} p={p} color={color} />)}
    </div>
  );
}

export function TeamTab({ presetId }: { presetId: string }) {
  const preset      = useAppStore(s => s.presets.find(p => p.id === presetId));
  const split       = useAppStore(s => s.splits.find(sp => sp.id === presetId));
  const parentSplit = useAppStore(s =>
    !preset && !split
      ? s.splits.find(sp => sp.subTeams.some(st => st.id === presetId)) ?? null
      : null
  );
  const subTeam = parentSplit?.subTeams.find(st => st.id === presetId) ?? null;

  // ── Per-team mode: show only this sub-team's members ─────────────────────
  if (subTeam && parentSplit) {
    const i = parentSplit.subTeams.indexOf(subTeam);
    const color = DOT_COLORS[i % DOT_COLORS.length];
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 px-3 pt-3 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Members · {subTeam.members.length}
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-3">
          <MemberList members={subTeam.members} color={color} />
        </div>
      </div>
    );
  }

  if (split) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 px-3 pt-3 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Teams · {split.subTeams.length}
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-3">
          {split.subTeams.map((st, i) => {
            const c = DOT_COLORS[i % DOT_COLORS.length];
            return (
              <div key={st.id} className="mb-3">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c }}>
                    {st.name}
                  </p>
                  <span className="ml-auto text-[9px] text-muted-foreground">{st.members.length}m</span>
                </div>
                <MemberList members={st.members} color={c} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!preset) return (
    <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4">
      Team not found.
    </div>
  );

  const color = preset.color ?? "#6366f1";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Participants · {preset.participants.length}
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-3">
        <MemberList members={preset.participants} color={color} />
      </div>
    </div>
  );
}
