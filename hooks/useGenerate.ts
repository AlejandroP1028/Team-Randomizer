import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";

export function useGenerate() {
  const { participants, config, setResult, setLoading } = useAppStore(useShallow(s => ({
    participants: s.participants,
    config: s.config,
    setResult: s.setResult,
    setLoading: s.setLoading,
  })));

  async function generate(): Promise<{ error?: string }> {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/teams/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants, config }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data?.error?.message ?? "Failed to generate teams." };
      setResult(data.teams, data.warnings);
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Network error." };
    } finally {
      setLoading(false);
    }
  }

  return { generate };
}
