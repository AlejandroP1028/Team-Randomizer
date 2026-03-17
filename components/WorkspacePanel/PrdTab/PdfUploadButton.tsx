"use client";
import { useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

export function PdfUploadButton({ presetId }: { presetId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const setPrdText = useAppStore(s => s.setPrdText);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/v1/prd/extract", { method: "POST", body: form });
      if (res.ok) {
        const { text } = await res.json();
        setPrdText(presetId, text);
      }
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <>
      <input ref={ref} type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden" onChange={handleFile} />
      <Button variant="outline" size="sm" disabled={loading} onClick={() => ref.current?.click()}>
        {loading ? "Extracting…" : "Upload PDF / DOCX"}
      </Button>
    </>
  );
}
