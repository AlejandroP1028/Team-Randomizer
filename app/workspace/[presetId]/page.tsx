"use client";
import { use } from "react";
import { PrdInput } from "@/components/WorkspacePanel/PrdTab/PrdInput";
export default function PrdPage({ params }: { params: Promise<{ presetId: string }> }) {
  const { presetId } = use(params);
  return <PrdInput presetId={presetId} />;
}
