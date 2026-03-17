"use client";

import { useExport } from "@/hooks/useExport";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function ExportBar() {
  const { copyToSlack, copied } = useExport();
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackText, setFallbackText] = useState("");

  async function handleCopy() {
    // Override the DOM-based fallback to use React state instead
    const teams = (await import("@/store/useAppStore")).useAppStore.getState().teams;
    try {
      const res = await fetch("/api/v1/teams/export/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams, includeStats: false }),
      });
      const data = await res.json();
      const text: string = data.text ?? "";
      try {
        await navigator.clipboard.writeText(text);
        // trigger the copied state via the hook
        copyToSlack(false);
      } catch {
        setFallbackText(text);
        setFallbackOpen(true);
      }
    } catch {
      copyToSlack(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => copyToSlack(false)}
        className={`text-xs transition-all ${copied ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" : ""}`}
      >
        {copied ? "✓ Copied" : "Copy to Slack"}
      </Button>

      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy the text below</DialogTitle>
          </DialogHeader>
          <Textarea
            value={fallbackText}
            readOnly
            rows={10}
            className="font-mono text-xs resize-none"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
