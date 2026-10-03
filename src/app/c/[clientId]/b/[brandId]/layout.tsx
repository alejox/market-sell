import { WorkspaceTabs } from "@/components/organisms/WorkspaceTabs";

/**
 * Brand-level shell: the two top-level areas of the workspace. "Marketing"
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
    <>
      <WorkspaceTabs basePath={`/c/${clientId}/b/${brandId}`} />
      {children}
    </>
  );
}
