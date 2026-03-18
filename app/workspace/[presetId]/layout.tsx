export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ presetId: string }>;
}) {
  return <>{children}</>;
}
