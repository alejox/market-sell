import { Card } from "@/components/atoms/Card";
import { ClaimText } from "@/components/molecules/ClaimText";
import { CONTENT_FORMAT_LABELS } from "@/components/labels";
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
export function CompareAudiences({ tracks, productFacts }: { tracks: CompareAudienceTrack[]; productFacts: ProductFact[] }) {
  const facts = new Map(productFacts.map((fact) => [fact.id, fact]));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {tracks.map((track) => (
        <Card key={track.segmentName} title={track.segmentName}>
          {!track.latestProposal ? (
            <p className="text-sm text-muted-on">Sin propuesta aún.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Posicionamiento</h3>
                <ClaimText claim={track.latestProposal.content.positioning.promise} facts={facts} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Concepto de campaña</h3>
                <p className="text-sm text-muted-on">{track.latestProposal.content.campaignConcept.goal}</p>
                <ClaimText claim={track.latestProposal.content.campaignConcept.coreMessage} facts={facts} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Briefs creativos</h3>
                <ul className="flex flex-col gap-2">
                  {track.latestProposal.content.creativeBriefs.map((brief, i) => (
                    <li key={i} className="rounded-md border border-border p-2 text-sm">
                      <p className="font-medium text-on-surface">{CONTENT_FORMAT_LABELS[brief.format] ?? brief.format}</p>
                      <ClaimText claim={brief.concept} facts={facts} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
