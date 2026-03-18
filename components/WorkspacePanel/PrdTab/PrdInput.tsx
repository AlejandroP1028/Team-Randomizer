"use client";
import { useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useGenerateTasks } from "@/hooks/useGenerateTasks";
import { PrdPreviewModal } from "./PrdPreviewModal";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function PrdInput({ presetId }: { presetId: string }) {
  const prdText    = useAppStore(s => s.workspaces[presetId]?.prdText ?? "");
  const setPrdText = useAppStore(s => s.setPrdText);
  const { generate, loading: generating, error } = useGenerateTasks(presetId);

  const fileRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const wordCount   = prdText.trim() ? prdText.trim().split(/\s+/).length : 0;
  const hasPrd      = wordCount > 0;
  const busy        = extracting || generating;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setExtractError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/v1/prd/extract", { method: "POST", body: form });
      if (res.ok) {
        const { text } = await res.json();
        setPrdText(presetId, text);
      } else {
        setExtractError("Failed to extract text from file.");
      }
    } catch {
      setExtractError("Network error. Please try again.");
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFile} />

      <div className="flex flex-col h-full overflow-hidden">

        {/* Section header */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">PRD</p>
        </div>

        {/* Main area */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4">
          {hasPrd ? (
            /* ── PRD imported state ── */
            <div className="w-full flex flex-col gap-3">
              {/* Status card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/20 px-4 py-3 flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">PRD ready</p>
                  <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 mt-0.5 font-mono">
                    {wordCount.toLocaleString()} words
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-foreground/80 hover:bg-accent transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Preview
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Replace
                </button>
              </div>
            </div>
          ) : (
            /* ── Empty state ── */
            <div className="w-full flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="12" x2="12" y2="18" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground/70">No PRD yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Import a PDF or DOCX file</p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent transition-all disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    Extracting…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Import PDF / DOCX
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex flex-col gap-2 p-3 border-t border-border">
          {(extractError || error) && (
            <p className="text-[10px] text-destructive leading-relaxed">{extractError ?? error}</p>
          )}
          <button
            onClick={generate}
            disabled={busy || !hasPrd}
            className={[
              "w-full py-2.5 rounded-lg text-xs font-semibold transition-all duration-200",
              "flex items-center justify-center gap-2",
              busy || !hasPrd
                ? "bg-primary/40 text-primary-foreground cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground shadow-sm hover:shadow-md",
            ].join(" ")}
          >
            {generating && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {generating ? "Generating…" : "Generate tasks →"}
          </button>
        </div>
      </div>

      <PrdPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        prdText={prdText}
      />
    </>
  );
}
