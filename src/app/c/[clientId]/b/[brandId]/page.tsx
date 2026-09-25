import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, repositories, listReviewHistory } from "@/server/container";
import { ClientBrandSelector, type ClientBrandOption } from "@/components/organisms/ClientBrandSelector";
import { AudienceTabs } from "@/components/organisms/AudienceTabs";
import { BrandBriefSection } from "@/components/organisms/BrandBriefSection";
import { AudienceSection } from "@/components/organisms/AudienceSection";
import { CampaignBriefSection } from "@/components/organisms/CampaignBriefSection";
import { ProposalThreadSection } from "@/components/organisms/ProposalThreadSection";
import { ReviewHistoryTimeline } from "@/components/organisms/ReviewHistoryTimeline";
import { updateBrandAction, updateAudienceAction, updateCampaignBriefAction, generateProposalAction } from "./actions";

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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <ClientBrandSelector options={options} current={`${clientId}/b/${brandId}`} />
        <Link href={`${basePath}/compare`} className="text-sm font-medium text-primary underline underline-offset-2">
          Comparar audiencias
        </Link>
      </div>

      <AudienceTabs
        basePath={basePath}
        options={audiences.map((a) => ({ id: a.id, segmentName: a.segmentName }))}
        selectedId={selectedAudience.id}
      />

      <BrandBriefSection brand={brand} updateBrandAction={updateBrandAction.bind(null, scope)} />

      <AudienceSection
        audience={selectedAudience}
        updateAudienceAction={updateAudienceAction.bind(null, scope, selectedAudience.id)}
      />

      {brief && (
        <CampaignBriefSection brief={brief} updateCampaignBriefAction={updateCampaignBriefAction.bind(null, scope, brief.id)} />
      )}

      {brief && (
        <ProposalThreadSection
          versions={versions}
          basePath={basePath}
          generateProposalAction={generateProposalAction.bind(null, scope, brief.id)}
        />
      )}

      {reviewHistory.length > 0 && <ReviewHistoryTimeline decisions={reviewHistory} />}
    </main>
  );
}
