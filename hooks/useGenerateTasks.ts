"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Participant, Task } from "@/lib/types";

const EMPTY_PARTICIPANTS: Participant[] = [];

export function useGenerateTasks(presetId: string) {
  const prdText      = useAppStore(s => s.workspaces[presetId]?.prdText ?? "");
  const participants = useAppStore(s => {
    // 1. Preset workspace
    const preset = s.presets.find(p => p.id === presetId);
    if (preset) return preset.participants;
    // 2. Shared split workspace
    const split = s.splits.find(sp => sp.id === presetId);
    if (split) return split.allParticipants;
    // 3. Per-team split: presetId is a subTeam.id
    for (const sp of s.splits) {
      const st = sp.subTeams.find(t => t.id === presetId);
      if (st) return st.members;
    }
    return EMPTY_PARTICIPANTS;
  });
  const setTasks = useAppStore(s => s.setTasks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!prdText.trim()) { setError("Add a PRD first."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/v1/tasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prdText, participants }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error?.message ?? "Generation failed.");
      } else {
        const { tasks }: { tasks: Task[] } = await res.json();
        setTasks(presetId, tasks);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}
