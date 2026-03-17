"use client";
import { use } from "react";
import { TasksPage } from "@/components/WorkspacePanel/TasksTab/TasksPage";
export default function TasksRoutePage({ params }: { params: Promise<{ presetId: string }> }) {
  const { presetId } = use(params);
  return <TasksPage presetId={presetId} />;
}
