"use client";
import { ContextPanel } from "../ContextPanel";
import { TasksPage } from "../TasksTab/TasksPage";

interface Props { presetId: string; }

export function WorkspaceShell({ presetId }: Props) {
  return (
    <div className="flex h-full overflow-hidden">
      <ContextPanel presetId={presetId} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <TasksPage presetId={presetId} />
      </div>
    </div>
  );
}
