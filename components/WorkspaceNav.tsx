"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

export function WorkspaceNav({ presetId }: { presetId: string }) {
  const pathname = usePathname();
  const presetName = useAppStore(s => s.presets.find(p => p.id === presetId)?.name ?? "Workspace");
  const prdHref = `/workspace/${presetId}`;
  const tasksHref = `/workspace/${presetId}/tasks`;

  return (
    <nav className="flex items-center gap-3 border-b border-border px-4 h-12 shrink-0">
      <Link href="/"><Button variant="ghost" size="sm">← Back</Button></Link>
      <span className="text-sm font-medium flex-1">{presetName}</span>
      <Link href={prdHref}>
        <Button variant={pathname === prdHref ? "secondary" : "ghost"} size="sm">PRD</Button>
      </Link>
      <Link href={tasksHref}>
        <Button variant={pathname === tasksHref ? "secondary" : "ghost"} size="sm">Tasks</Button>
      </Link>
    </nav>
  );
}
