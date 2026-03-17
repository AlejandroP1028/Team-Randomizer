"use client";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

interface Props { presetId: string; }

export function ExportTasksBar({ presetId }: Props) {
  function download() {
    const tasks = useAppStore.getState().workspaces[presetId]?.tasks ?? [];
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "tasks.json",
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Button variant="outline" size="sm" onClick={download} className="text-xs">
      Download JSON
    </Button>
  );
}
