"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Task } from "@/lib/types";

export function useGenerateTasks(presetId: string) {
  const prdText = useAppStore(s => s.workspaces[presetId]?.prdText ?? "");
  const participants = useAppStore(s => s.presets.find(p => p.id === presetId)?.participants ?? []);
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
