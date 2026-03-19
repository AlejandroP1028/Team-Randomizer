"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { InputPanel } from "./InputPanel";
import { RightPane } from "./RightPane";

export function TeamRandomizerApp() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        useAppStore.getState().undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Input panel — participant config, still visible on home route */}
      <div className="w-[320px] shrink-0 border-r border-border overflow-y-auto">
        <InputPanel />
      </div>
      {/* Right pane — empty state or team builder output */}
      <div className="flex-1 overflow-hidden min-w-0">
        <RightPane />
      </div>
    </div>
  );
}
