import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, repositories, listReviewHistory } from "@/server/container";
import { ProposalDocument } from "@/components/organisms/ProposalDocument";
import { ReviewControls } from "@/components/organisms/ReviewControls";
import { ReviewHistoryTimeline } from "@/components/organisms/ReviewHistoryTimeline";
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Link href={basePath} className="text-sm font-medium text-primary underline underline-offset-2">
        Volver al espacio de trabajo
      </Link>

      <ProposalDocument
        proposal={proposal}
        brandName={brand.name}
        audienceSegmentName={audience?.segmentName ?? "Audiencia"}
        productFacts={brand.productFacts}
      />

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-base font-semibold text-on-surface">Revisión</h2>
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

      <ReviewHistoryTimeline decisions={reviewHistory} />
    </main>
  );
}
