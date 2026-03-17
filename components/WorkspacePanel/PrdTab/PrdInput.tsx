"use client";
import dynamic from "next/dynamic";
import { useDebouncedCallback } from "use-debounce";
import { useAppStore } from "@/store/useAppStore";
import { PdfUploadButton } from "./PdfUploadButton";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

export function PrdInput({ presetId }: { presetId: string }) {
  const prdText = useAppStore(s => s.workspaces[presetId]?.prdText ?? "");
  const setPrdText = useAppStore(s => s.setPrdText);
  const save = useDebouncedCallback((val: string) => setPrdText(presetId, val), 300);

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">PRD document</span>
        <PdfUploadButton presetId={presetId} />
      </div>
      <div className="flex-1 overflow-hidden" data-color-mode="dark">
        <MDEditor value={prdText} onChange={val => save(val ?? "")} preview="live" height="100%" />
      </div>
    </div>
  );
}
