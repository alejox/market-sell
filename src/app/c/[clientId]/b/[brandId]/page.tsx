import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, repositories, listReviewHistory, listResultSnapshots } from "@/server/container";
import { ClientBrandSelector, type ClientBrandOption } from "@/components/organisms/ClientBrandSelector";
import { AudienceTabs } from "@/components/organisms/AudienceTabs";
import { BrandBriefSection } from "@/components/organisms/BrandBriefSection";
import { AudienceSection } from "@/components/organisms/AudienceSection";
import { CampaignBriefSection } from "@/components/organisms/CampaignBriefSection";
import { ProposalThreadSection } from "@/components/organisms/ProposalThreadSection";
import { ReviewHistoryTimeline } from "@/components/organisms/ReviewHistoryTimeline";
import { ResultSnapshotsSection } from "@/components/organisms/ResultSnapshotsSection";
import { Badge } from "@/components/atoms/Badge";
import { PROPOSAL_STATE_LABELS, PROPOSAL_STATE_TONES } from "@/components/labels";
import { GenerateProposalForm } from "@/components/organisms/GenerateProposalForm";
import {
  updateBrandAction,
  updateAudienceAction,
  updateCampaignBriefAction,
  generateProposalAction,
  recordResultSnapshotAction,
} from "./actions";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; brandId: string }>;
  searchParams: Promise<{ audience?: string }>;
}) {
  await ensureWorkspaceSeeded();

  const { clientId, brandId } = await params;
  const { audience: audienceParam } = await searchParams;
  const scope = { clientId, brandId };

  const client = await repositories.clients.getById(clientId);
  const brand = await repositories.brands.getById(clientId, brandId);
  if (!client || !brand) {
    notFound();
  }

  const allClients = await repositories.clients.list();
  const options: ClientBrandOption[] = (
    await Promise.all(
      allClients.map(async (c) => {
        const brands = await repositories.brands.listByClient(c.id);
        return brands.map((b) => ({ clientId: c.id, brandId: b.id, clientName: c.name, brandName: b.name }));
      }),
    )
  ).flat();

  const audiences = await repositories.audiences.list(scope);
  const basePath = `/c/${clientId}/b/${brandId}`;

  if (audiences.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 sm:px-6">
        <p className="text-sm text-muted-on">Esta marca todavía no tiene audiencias configuradas.</p>
      </main>
    );
  }

  const selectedAudience = audiences.find((a) => a.id === audienceParam) ?? audiences[0];
  const brief = await repositories.briefs.getByAudience(scope, selectedAudience.id);
  const versions = brief ? await repositories.proposals.listByThread(scope, brief.id) : [];
  const reviewHistory = brief ? await listReviewHistory({ scope, proposalThreadId: brief.id }) : [];
  const snapshots = brief ? await listResultSnapshots({ scope, proposalThreadId: brief.id }) : [];
  const latestVersion = [...versions].sort((a, b) => b.version - a.version)[0] ?? null;
  const nextAction = latestVersion?.state === "in_review"
    ? "Revisar y decidir"
    : latestVersion?.state === "draft"
      ? "Revisar borrador"
      : latestVersion?.state === "changes_requested"
        ? "Revisar cambios"
        : "Ver propuesta";

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <ClientBrandSelector options={options} current={`${clientId}/b/${brandId}`} />
          <Link href={`${basePath}/compare`} className="inline-flex min-h-10 items-center rounded-full border border-border px-5 py-2 text-sm font-medium text-on-surface hover:bg-muted">
            Comparar audiencias
          </Link>
        </div>
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-on">Espacio de trabajo · {client.name}</p>
          <h1 className="text-4xl leading-tight text-on-surface sm:text-5xl lg:text-6xl">Estrategia para {brand.name}</h1>
          <p className="mt-3 text-base text-muted-on">Una audiencia a la vez, de la investigación a la revisión.</p>
        </div>
      </header>

      <section aria-labelledby="audience-heading" className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 id="audience-heading" className="text-2xl text-on-surface">Audiencia</h2>
        <AudienceTabs
          basePath={basePath}
          options={audiences.map((a) => ({ id: a.id, segmentName: a.segmentName }))}
          selectedId={selectedAudience.id}
        />
      </section>

      <section aria-labelledby="focus-heading" className="rounded-[24px] bg-accent p-6 text-accent-on sm:p-8 lg:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em]">En foco · {selectedAudience.geography}</p>
            <h2 id="focus-heading" className="text-3xl leading-tight sm:text-4xl">{selectedAudience.segmentName}</h2>
            <p className="mt-4 text-sm leading-relaxed sm:text-base">
              {brief ? brief.objective : "Esta audiencia todavía no tiene un brief de campaña."}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {latestVersion ? (
                <>
                  <span className="text-xs font-medium uppercase tracking-wider">Última versión · {latestVersion.version}</span>
                  <Badge tone={PROPOSAL_STATE_TONES[latestVersion.state]}>{PROPOSAL_STATE_LABELS[latestVersion.state]}</Badge>
                </>
              ) : (
                <span className="text-sm">Aún no hay una propuesta para esta audiencia.</span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {latestVersion ? (
              <Link href={`${basePath}/proposals/${latestVersion.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-on hover:opacity-85">
                {nextAction} <span aria-hidden="true" className="ml-2">↗</span>
              </Link>
            ) : brief ? (
              <GenerateProposalForm action={generateProposalAction.bind(null, scope, brief.id)} />
            ) : (
              <a href="#campaign-brief" className="inline-flex min-h-11 items-center rounded-full border border-accent-on px-5 py-2 text-sm font-medium">
                Ver estado del brief
              </a>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="work-heading" className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">Trabajo actual</p>
          <h2 id="work-heading" className="mt-1 text-3xl text-on-surface">Preparar y revisar</h2>
        </div>
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            {brief && (
              <ProposalThreadSection
                versions={versions}
                basePath={basePath}
                generateProposalAction={generateProposalAction.bind(null, scope, brief.id)}
                showGenerateAction={versions.length > 0}
              />
            )}
            <div id="campaign-brief">
              {brief ? (
                <CampaignBriefSection brief={brief} updateCampaignBriefAction={updateCampaignBriefAction.bind(null, scope, brief.id)} />
              ) : (
                <div className="rounded-[24px] border border-border bg-surface-raised p-6 text-sm text-muted-on">
                  No hay un brief de campaña configurado para esta audiencia.
                </div>
              )}
            </div>
          </div>
          <AudienceSection
            audience={selectedAudience}
            updateAudienceAction={updateAudienceAction.bind(null, scope, selectedAudience.id)}
          />
        </div>
      </section>

      <section aria-label="Material de referencia" className="border-t border-border pt-7">
        <details className="group rounded-[24px] border border-border bg-surface-raised p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-on-surface [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-xs font-medium uppercase tracking-[0.16em] text-muted-on">Material de referencia</span>
              <span className="mt-1 block font-serif text-2xl">Marca, fuentes y hechos</span>
            </span>
            <span aria-hidden="true" className="text-2xl group-open:rotate-45">+</span>
          </summary>
          <div className="mt-6">
            <BrandBriefSection brand={brand} updateBrandAction={updateBrandAction.bind(null, scope)} />
          </div>
        </details>
      </section>

      {(reviewHistory.length > 0 || latestVersion) && (
        <section aria-labelledby="follow-up-heading" className="flex flex-col gap-5 border-t border-border pt-7">
          <h2 id="follow-up-heading" className="text-3xl text-on-surface">Seguimiento</h2>
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            {reviewHistory.length > 0 && <ReviewHistoryTimeline decisions={reviewHistory} />}
            {latestVersion && (
              <ResultSnapshotsSection
                snapshots={snapshots}
                recordResultSnapshotAction={recordResultSnapshotAction.bind(null, scope, latestVersion.id)}
              />
            )}
          </div>
        </section>
      )}
    </main>
  );
}
