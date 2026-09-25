import Link from "next/link";
import { Card } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { PROPOSAL_STATE_LABELS, PROPOSAL_STATE_TONES } from "@/components/labels";
import { GenerateProposalForm } from "@/components/organisms/GenerateProposalForm";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { BoundFormAction } from "@/components/action-state";

export function ProposalThreadSection({
  versions,
  basePath,
  generateProposalAction,
}: {
  versions: Proposal[];
  basePath: string;
  generateProposalAction: BoundFormAction;
}) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <Card
      title="Propuestas"
      actions={<GenerateProposalForm action={generateProposalAction} label={sorted.length > 0 ? "Generar nueva propuesta" : "Generar propuesta"} />}
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-on">Todavía no hay ninguna propuesta generada para esta audiencia.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((proposal) => (
            <li key={proposal.id}>
              <Link
                href={`${basePath}/proposals/${proposal.id}`}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="font-medium text-on-surface">Versión {proposal.version}</span>
                <Badge tone={PROPOSAL_STATE_TONES[proposal.state]}>{PROPOSAL_STATE_LABELS[proposal.state]}</Badge>
                {proposal.generation && (
                  <span className="text-xs text-muted-on">
                    {proposal.generation.provider} / {proposal.generation.model} · {proposal.generation.generatedAt}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
