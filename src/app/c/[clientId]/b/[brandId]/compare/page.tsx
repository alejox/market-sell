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
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Link href={`/c/${clientId}/b/${brandId}`} className="w-fit text-sm font-medium text-on-surface underline underline-offset-4">
        ← Volver al espacio de trabajo
      </Link>
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">{brand.name} · Estrategia</p>
        <h1 className="mt-2 text-4xl leading-tight text-on-surface sm:text-5xl">Comparar audiencias</h1>
        <p className="mt-3 text-base text-muted-on">Posicionamiento, mensaje y creatividad de la última versión de cada ruta.</p>
      </header>
      <div className="rounded-[24px] bg-accent p-5 text-sm text-accent-on sm:p-6">
        <span className="font-medium">{tracks.length} audiencias</span> · {tracks.filter((track) => track.latestProposal).length} con propuesta generada.
        Cada versión conserva su estado de revisión; esta vista no equivale a una aprobación.
      </div>
      <CompareAudiences tracks={tracks} productFacts={brand.productFacts} basePath={`/c/${clientId}/b/${brandId}`} />
    </main>
  );
}
