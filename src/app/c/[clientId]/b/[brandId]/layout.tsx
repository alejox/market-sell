import { WorkspaceSidebar } from "@/components/organisms/WorkspaceSidebar";

/**
 * Brand-level shell (sidebar + content): the two top-level areas of the workspace. "Marketing"
 * is the strategist's work (briefs, proposals, review); "Organización" is the
 * team's own work (development tasks and their notes).
 */
export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string; brandId: string }>;
}) {
  const { clientId, brandId } = await params;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <WorkspaceSidebar basePath={`/c/${clientId}/b/${brandId}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
