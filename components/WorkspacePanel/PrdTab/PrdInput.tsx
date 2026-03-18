"use client";
import dynamic from "next/dynamic";
import { useDebouncedCallback } from "use-debounce";
import { useAppStore } from "@/store/useAppStore";
import { useGenerateTasks } from "@/hooks/useGenerateTasks";
import { PdfUploadButton } from "./PdfUploadButton";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

export function PrdInput({ presetId }: { presetId: string }) {
  const prdText    = useAppStore(s => s.workspaces[presetId]?.prdText ?? "");
  const setPrdText = useAppStore(s => s.setPrdText);
  const save       = useDebouncedCallback((val: string) => setPrdText(presetId, val), 300);
  const { generate, loading, error } = useGenerateTasks(presetId);

  const wordCount = prdText.trim() ? prdText.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Section header */}
      <div className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex-1">
          PRD
        </span>
        {wordCount > 0 && (
          <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
            {wordCount}w
          </span>
        )}
        <PdfUploadButton presetId={presetId} />
      </div>

      {/* Editor — flex-1 min-h-0 gives a definite size so MDEditor height="100%" works */}
      <div className="flex-1 min-h-0 overflow-hidden" data-color-mode="light">
        <MDEditor
          value={prdText}
          onChange={val => save(val ?? "")}
          preview="edit"
          hideToolbar
          height="100%"
        />
      </div>

      {/* Footer */}
      <div className="shrink-0 flex flex-col gap-2 p-3 border-t border-border">
        {error && (
          <p className="text-[10px] text-destructive leading-relaxed">{error}</p>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className={[
            "w-full py-2.5 rounded-lg text-xs font-semibold transition-all duration-200",
            "flex items-center justify-center gap-2",
            loading
              ? "bg-primary/60 text-primary-foreground cursor-not-allowed"
              : "bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground shadow-sm hover:shadow-md",
          ].join(" ")}
        >
          {loading && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {loading ? "Generating…" : "Generate tasks →"}
        </button>
      </div>
    </div>
  );
}
