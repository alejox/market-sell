import { NextResponse } from "next/server";
import { ensureWorkspaceSeeded, repositories } from "@/server/container";
import { renderProposalMarkdown } from "@/modules/strategy/application/export/render-proposal-markdown";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string; brandId: string; proposalId: string }> },
) {
  await ensureWorkspaceSeeded();
  const { clientId, brandId, proposalId } = await params;
  const scope = { clientId, brandId };

  const proposal = await repositories.proposals.getById(scope, proposalId);
  const brand = await repositories.brands.getById(clientId, brandId);
  if (!proposal || !brand) {
    return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
  }

  const brief = await repositories.briefs.getById(scope, proposal.briefId);
  const audience = brief ? await repositories.audiences.getById(scope, brief.audienceId) : null;

  const markdown = renderProposalMarkdown(proposal, {
    brandName: brand.name,
    audienceSegmentName: audience?.segmentName ?? "Audiencia",
    productFacts: brand.productFacts,
  });

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="propuesta-${brand.name.toLowerCase().replace(/\s+/g, "-")}-v${proposal.version}.md"`,
    },
  });
}
