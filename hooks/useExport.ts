import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export function useExport() {
  const teams = useAppStore(s => s.teams);
  const [copied, setCopied] = useState(false);

  async function copyToSlack(includeStats = false): Promise<void> {
    try {
      const res = await fetch("/api/v1/teams/export/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams, includeStats }),
      });
      const data = await res.json();
      const text: string = data.text ?? "";

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const ta = document.getElementById("slack-fallback-text") as HTMLTextAreaElement | null;
        const dialog = document.getElementById("slack-fallback-dialog") as HTMLDialogElement | null;
        if (ta) ta.value = text;
        if (dialog) dialog.showModal();
      }
    } catch {
      // silently ignore network errors
    }
  }

  return { copyToSlack, copied };
}
