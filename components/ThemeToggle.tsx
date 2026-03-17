"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const THEMES = [
  { value: "dark",   label: "Dark",   icon: "●" },
  { value: "light",  label: "Light",  icon: "○" },
  { value: "system", label: "System", icon: "◑" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = THEMES.find(t => t.value === theme) ?? THEMES[0];
  const next = THEMES[(THEMES.findIndex(t => t.value === theme) + 1) % THEMES.length];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(next.value)}
      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
      title={`Switch to ${next.label} mode`}
    >
      <span className="font-mono text-sm leading-none">{current.icon}</span>
      <span>{current.label}</span>
    </Button>
  );
}
