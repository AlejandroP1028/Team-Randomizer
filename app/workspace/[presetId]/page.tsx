"use client";
import { use } from "react";
import { WorkspaceShell } from "@/components/WorkspacePanel/WorkspaceShell";

export default function WorkspacePage({ params }: { params: Promise<{ presetId: string }> }) {
  const { presetId } = use(params);
  return <WorkspaceShell presetId={presetId} />;
}
