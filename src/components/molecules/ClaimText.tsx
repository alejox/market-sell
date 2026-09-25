import { Badge } from "@/components/atoms/Badge";
import { CLAIM_BASIS_LABELS, CLAIM_BASIS_TONES } from "@/components/labels";
import type { Claim } from "@/modules/strategy/domain/claim";
import type { ProductFact } from "@/modules/clients/domain/brand";

/**
 * Renders one claim's value with its basis badge, resolving any cited fact
 * ids to the fact statements they refer to (never just the raw id).
 */
export function ClaimText({ claim, facts }: { claim: Claim<string>; facts: Map<string, ProductFact> }) {
  const citedFacts = (claim.factIds ?? []).map((id) => facts.get(id)?.statement ?? `(hecho desconocido: ${id})`);

  return (
    <p className="flex flex-wrap items-start gap-2 text-sm text-on-surface">
      <span>{claim.value}</span>
      <Badge tone={CLAIM_BASIS_TONES[claim.basis]}>{CLAIM_BASIS_LABELS[claim.basis]}</Badge>
      {citedFacts.length > 0 && (
        <span className="w-full text-xs text-muted-on">Fuente: {citedFacts.join("; ")}</span>
      )}
    </p>
  );
}
