import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, repositories } from "@/server/container";
import { CompareAudiences, type CompareAudienceTrack } from "@/components/organisms/CompareAudiences";

export default async function CompareAudiencesPage({
  params,
}: {
  params: Promise<{ clientId: string; brandId: string }>;
}) {
  await ensureWorkspaceSeeded();
  const { clientId, brandId } = await params;
  const scope = { clientId, brandId };

  const brand = await repositories.brands.getById(clientId, brandId);
  if (!brand) {
    notFound();
  }

  const audiences = await repositories.audiences.list(scope);

  const tracks: CompareAudienceTrack[] = await Promise.all(
    audiences.map(async (audience) => {
      const brief = await repositories.briefs.getByAudience(scope, audience.id);
      if (!brief) {
        return { segmentName: audience.segmentName, latestProposal: null };
      }
      const versions = await repositories.proposals.listByThread(scope, brief.id);
      const latest = [...versions].sort((a, b) => b.version - a.version)[0] ?? null;
      return { segmentName: audience.segmentName, latestProposal: latest };
    }),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-on-surface">Comparar audiencias — {brand.name}</h1>
        <Link href={`/c/${clientId}/b/${brandId}`} className="text-sm font-medium text-primary underline underline-offset-2">
          Volver al espacio de trabajo
        </Link>
      </div>
      <CompareAudiences tracks={tracks} productFacts={brand.productFacts} />
    </main>
  );
}
