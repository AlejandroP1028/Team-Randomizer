"use client";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MDPreview = dynamic(
  () => import("@uiw/react-md-editor").then(m => m.default.Markdown),
  { ssr: false }
);

interface Props {
  open: boolean;
  onClose: () => void;
  prdText: string;
}

export function PrdPreviewModal({ open, onClose, prdText }: Props) {
  const wordCount = prdText.trim() ? prdText.trim().split(/\s+/).length : 0;

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">PRD Preview</DialogTitle>
            {wordCount > 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                {wordCount} words
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5" data-color-mode="light">
          <MDPreview source={prdText} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
