"use client";

import { useEffect } from "react";
import { InputPanel } from "./InputPanel";
import { OutputPanel } from "./OutputPanel";
import { useAppStore } from "@/store/useAppStore";

export function TeamRandomizerApp() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "z") { e.preventDefault(); useAppStore.getState().undo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-[300px] shrink-0 border-r border-border flex flex-col overflow-y-auto">
        <InputPanel />
      </aside>
      <main className="flex-1 overflow-y-auto">
        <OutputPanel />
      </main>
    </div>
  );
}
