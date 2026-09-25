import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, repositories } from "@/server/container";
import { ProposalDocument } from "@/components/organisms/ProposalDocument";
import { PrintTriggerButton } from "@/components/molecules/PrintTriggerButton";

/**
 * Print-friendly rendering of one proposal version — "PDF-ready" via the
 * browser's own print dialog (Cmd/Ctrl+P → Save as PDF). No interactive
 * review controls here, only the document itself plus a print trigger that
 * is hidden from the printed output.
 */
export default async function ProposalPrintPage({
  params,
}: {
  params: Promise<{ clientId: string; brandId: string; proposalId: string }>;
}) {
  await ensureWorkspaceSeeded();
  const { clientId, brandId, proposalId } = await params;
  const scope = { clientId, brandId };

  const proposal = await repositories.proposals.getById(scope, proposalId);
  const brand = await repositories.brands.getById(clientId, brandId);
  if (!proposal || !brand) {
    notFound();
  }

  const brief = await repositories.briefs.getById(scope, proposal.briefId);
  const audience = brief ? await repositories.audiences.getById(scope, brief.audienceId) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 print:max-w-none print:px-0">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/c/${clientId}/b/${brandId}/proposals/${proposalId}`}
          className="text-sm font-medium text-primary underline underline-offset-2"
        >
          Volver a la propuesta
        </Link>
        <PrintTriggerButton />
      </div>

      <ProposalDocument
        proposal={proposal}
        brandName={brand.name}
        audienceSegmentName={audience?.segmentName ?? "Audiencia"}
        productFacts={brand.productFacts}
      />
    </main>
  );
}
