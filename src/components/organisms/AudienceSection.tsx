import { Card } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { CLAIM_BASIS_LABELS, CLAIM_BASIS_TONES } from "@/components/labels";
import { AudienceEditForm } from "@/components/organisms/AudienceEditForm";
import type { Audience } from "@/modules/strategy/domain/audience";
import type { BoundFormAction } from "@/components/action-state";

export function AudienceSection({ audience, updateAudienceAction }: { audience: Audience; updateAudienceAction: BoundFormAction }) {
  return (
    <Card title="Perfil de audiencia">
      <p className="text-sm text-muted-on">{audience.segmentName} · {audience.geography}</p>

      {audience.pains[0] && (
        <div className="rounded-2xl bg-muted p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-on">Dolor principal</p>
          <p className="text-sm text-on-surface">{audience.pains[0].value}</p>
          <div className="mt-2">
            <Badge tone={CLAIM_BASIS_TONES[audience.pains[0].basis]}>{CLAIM_BASIS_LABELS[audience.pains[0].basis]}</Badge>
          </div>
        </div>
      )}

      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium text-on-surface">Ver investigación y procedencia</summary>
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-medium text-on-surface">Dolores</h3>
            <ul className="mt-1 flex flex-col gap-1">
              {audience.pains.map((pain, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-on-surface">
                  <span>{pain.value}</span>
                  <Badge tone={CLAIM_BASIS_TONES[pain.basis]}>{CLAIM_BASIS_LABELS[pain.basis]}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-on-surface">Objeciones</h3>
            <ul className="mt-1 flex flex-col gap-1">
              {audience.objections.map((objection, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-on-surface">
                  <span>{objection.value}</span>
                  <Badge tone={CLAIM_BASIS_TONES[objection.basis]}>{CLAIM_BASIS_LABELS[objection.basis]}</Badge>
                </li>
              ))}
            </ul>
          </div>
          {audience.hypotheses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-on-surface">Hipótesis</h3>
              <ul className="mt-1 list-inside list-disc text-sm text-muted-on">
                {audience.hypotheses.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>

      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium text-primary">Editar audiencia</summary>
        <div className="mt-3">
          <AudienceEditForm audience={audience} action={updateAudienceAction} />
        </div>
      </details>
    </Card>
  );
}
