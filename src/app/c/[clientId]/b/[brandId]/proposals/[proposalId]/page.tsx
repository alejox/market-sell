import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, repositories, listReviewHistory } from "@/server/container";
import { ProposalDocument } from "@/components/organisms/ProposalDocument";
import { ReviewControls } from "@/components/organisms/ReviewControls";
import { ReviewHistoryTimeline } from "@/components/organisms/ReviewHistoryTimeline";
import { Badge } from "@/components/atoms/Badge";
import { PROPOSAL_STATE_LABELS, PROPOSAL_STATE_TONES } from "@/components/labels";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { requireOwner } from "@/shared/infrastructure/supabase/owner-auth";
import {
  submitForReviewAction,
  approveProposalAction,
  reviseProposalAction,
  archiveProposalAction,
  iterateFromApprovedAction,
} from "../../actions";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ clientId: string; brandId: string; proposalId: string }>;
}) {
  await requireOwner();
  await ensureWorkspaceSeeded();
  const { clientId, brandId, proposalId } = await params;
  const scope = { clientId, brandId };
  const basePath = `/c/${clientId}/b/${brandId}`;

  const proposal = await repositories.proposals.getById(scope, proposalId);
  const brand = await repositories.brands.getById(clientId, brandId);
  if (!proposal || !brand) {
    notFound();
  }

  const brief = await repositories.briefs.getById(scope, proposal.briefId);
  const audience = brief ? await repositories.audiences.getById(scope, brief.audienceId) : null;
  const reviewHistory = await listReviewHistory({ scope, proposalThreadId: proposal.proposalThreadId });

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex items-center justify-between gap-4">
        <Link href={basePath} className="w-fit text-sm font-medium text-on-surface underline underline-offset-4">
          ← Volver al espacio de trabajo
        </Link>
        <SignOutButton />
      </div>

      <header className="rounded-[24px] bg-accent p-6 text-accent-on sm:p-8 lg:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.16em]">{brand.name} · Propuesta de campaña</p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{audience?.segmentName ?? "Audiencia"}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">Versión {proposal.version}</span>
          <Badge tone={PROPOSAL_STATE_TONES[proposal.state]}>{PROPOSAL_STATE_LABELS[proposal.state]}</Badge>
          {proposal.state !== "approved" && !proposal.approvedBy && (
            <span className="font-medium">Sin aprobación registrada para esta versión</span>
          )}
          {proposal.state === "approved" && proposal.approvedBy && (
            <span>Aprobado por {proposal.approvedBy} el {proposal.approvedAt}</span>
          )}
          {proposal.state === "archived" && proposal.approvedBy && (
            <span>Aprobación histórica por {proposal.approvedBy} · versión archivada</span>
          )}
        </div>
        {proposal.generation && (
          <p className="mt-4 text-xs">Generado por {proposal.generation.provider} / {proposal.generation.model} el {proposal.generation.generatedAt}</p>
        )}
      </header>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
        <div className="min-w-0">
          <ProposalDocument
            proposal={proposal}
            brandName={brand.name}
            audienceSegmentName={audience?.segmentName ?? "Audiencia"}
            productFacts={brand.productFacts}
            showHeader={false}
          />
        </div>
        <aside className="order-first min-w-0 lg:order-last" aria-label="Acciones de revisión">
          <section className="flex flex-col gap-4 rounded-[24px] border border-border bg-surface-raised p-5 lg:sticky lg:top-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-on">Decisión del propietario</p>
              <h2 className="mt-1 text-2xl text-on-surface">Revisión</h2>
            </div>
            <ReviewControls
              proposal={proposal}
              exportHref={`${basePath}/proposals/${proposalId}/export`}
              printHref={`${basePath}/proposals/${proposalId}/print`}
              actions={{
                submitForReview: submitForReviewAction.bind(null, scope, proposalId),
                approve: approveProposalAction.bind(null, scope, proposalId),
                requestChanges: reviseProposalAction.bind(null, scope, proposalId),
                archive: archiveProposalAction.bind(null, scope, proposalId),
                iterateFromApproved: iterateFromApprovedAction.bind(null, scope, proposalId),
              }}
            />
          </section>
        </aside>
      </div>
      <div className="lg:max-w-[calc(100%-22rem)]">
        <ReviewHistoryTimeline decisions={reviewHistory} />
      </div>
    </main>
  );
}
