import { Card } from "@/components/atoms/Card";
import { CampaignBriefEditForm } from "@/components/organisms/CampaignBriefEditForm";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";
import type { BoundFormAction } from "@/components/action-state";

export function CampaignBriefSection({
  brief,
  updateCampaignBriefAction,
}: {
  brief: CampaignBrief;
  updateCampaignBriefAction: BoundFormAction;
}) {
  return (
    <Card title="Brief de campaña">
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-on-surface">Objetivo</dt>
          <dd className="text-muted-on">{brief.objective}</dd>
        </div>
        <div>
          <dt className="font-medium text-on-surface">Plazo</dt>
          <dd className="text-muted-on">{brief.timeframe}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-on-surface">Propuesta de valor</dt>
          <dd className="text-muted-on">{brief.valueProposition}</dd>
        </div>
        <div>
          <dt className="font-medium text-on-surface">Presupuesto</dt>
          <dd className="text-muted-on">
            {brief.budgetRange
              ? `${brief.budgetRange.min.toLocaleString("es-CO")} – ${brief.budgetRange.max.toLocaleString("es-CO")} ${brief.budgetRange.currency}`
              : "No definido por el propietario"}
          </dd>
        </div>
      </dl>

      {brief.missingInformation.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-on-surface">Información faltante</h3>
          <ul className="mt-1 list-inside list-disc text-sm text-muted-on">
            {brief.missingInformation.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-md border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium text-primary">Editar brief de campaña</summary>
        <div className="mt-3">
          <CampaignBriefEditForm brief={brief} action={updateCampaignBriefAction} />
        </div>
      </details>
    </Card>
  );
}
