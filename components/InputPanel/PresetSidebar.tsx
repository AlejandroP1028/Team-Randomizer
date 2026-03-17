"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store/useAppStore";
import { useGenerate } from "@/hooks/useGenerate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function PresetSidebar() {
  const { presets, activePresetId, loadPreset, savePreset, deletePreset } = useAppStore(useShallow(s => ({
    presets: s.presets,
    activePresetId: s.activePresetId,
    loadPreset: s.loadPreset,
    savePreset: s.savePreset,
    deletePreset: s.deletePreset,
  })));
  const { generate } = useGenerate();
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");

  function handleLoad(id: string) {
    loadPreset(id);
    generate();
  }

  function commitSave() {
    if (!newName.trim()) { setSaving(false); return; }
    savePreset(newName.trim());
    setNewName(""); setSaving(false);
  }

  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">
        Presets
      </label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => (
          <div key={p.id} className="group relative">
            <Badge
              variant={activePresetId === p.id ? "default" : "secondary"}
              className="cursor-pointer pr-2 hover:opacity-90 transition-opacity"
              onClick={() => handleLoad(p.id)}
            >
              {p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name}
            </Badge>
            <button
              onClick={() => deletePreset(p.id)}
              className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 items-center
                justify-center rounded-full bg-card border border-border
                text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              ×
            </button>
          </div>
        ))}

        {saving ? (
          <Input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commitSave(); if (e.key === "Escape") setSaving(false); }}
            onBlur={commitSave}
            placeholder="Name…"
            className="h-6 w-24 px-2 text-xs"
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaving(true)}
            className="h-6 px-2 text-xs border-dashed text-muted-foreground hover:text-primary hover:border-primary/40"
          >
            + Save
          </Button>
        )}
      </div>
    </div>
  );
}
