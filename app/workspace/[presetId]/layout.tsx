import { WorkspaceNav } from "@/components/WorkspaceNav";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ presetId: string }>;
}) {
  const { presetId } = await params;
  return (
    <div className="flex flex-col h-screen">
      <WorkspaceNav presetId={presetId} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
