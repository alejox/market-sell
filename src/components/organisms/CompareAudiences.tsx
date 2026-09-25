import Link from "next/link";
import { Card } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { ClaimText } from "@/components/molecules/ClaimText";
import { CONTENT_FORMAT_LABELS, PROPOSAL_STATE_LABELS, PROPOSAL_STATE_TONES } from "@/components/labels";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { ProductFact } from "@/modules/clients/domain/brand";

export interface CompareAudienceTrack {
  segmentName: string;
  latestProposal: Proposal | null;
}

/**
 * Side-by-side comparison of the two audience tracks' latest proposal —
 * stacked on mobile via the grid's responsive column count. Each track
 * shows positioning, campaign concept, and creative briefs, or a clear
 * "sin propuesta aún" placeholder when nothing has been generated yet.
 */
export function CompareAudiences({ tracks, productFacts, basePath }: { tracks: CompareAudienceTrack[]; productFacts: ProductFact[]; basePath: string }) {
  const facts = new Map(productFacts.map((fact) => [fact.id, fact]));

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      {tracks.map((track) => (
        <Card key={track.segmentName} title={track.segmentName}>
          {!track.latestProposal ? (
            <p className="rounded-2xl bg-muted p-5 text-sm text-muted-on">Sin propuesta aún. Vuelve al espacio de trabajo para preparar esta audiencia.</p>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-on">Versión {track.latestProposal.version}</span>
                <Badge tone={PROPOSAL_STATE_TONES[track.latestProposal.state]}>{PROPOSAL_STATE_LABELS[track.latestProposal.state]}</Badge>
              </div>
              <div className="border-t border-border pt-5">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-on">Posicionamiento</h3>
                <ClaimText claim={track.latestProposal.content.positioning.promise} facts={facts} />
              </div>
              <div className="border-t border-border pt-5">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-on">Concepto de campaña</h3>
                <p className="mb-3 text-sm text-muted-on">{track.latestProposal.content.campaignConcept.goal}</p>
                <ClaimText claim={track.latestProposal.content.campaignConcept.coreMessage} facts={facts} />
              </div>
              <div className="border-t border-border pt-5">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-on">Briefs creativos</h3>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {track.latestProposal.content.creativeBriefs.map((brief, i) => (
                    <li key={i} className="rounded-2xl bg-muted p-4 text-sm">
                      <p className="font-medium text-on-surface">{CONTENT_FORMAT_LABELS[brief.format] ?? brief.format}</p>
                      <ClaimText claim={brief.concept} facts={facts} />
                    </li>
                  ))}
                </ul>
              </div>
              <Link href={`${basePath}/proposals/${track.latestProposal.id}`} className="inline-flex min-h-10 w-fit items-center rounded-full border border-border px-5 py-2 text-sm font-medium text-on-surface hover:bg-muted">
                Abrir versión {track.latestProposal.version} <span aria-hidden="true" className="ml-2">↗</span>
              </Link>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
