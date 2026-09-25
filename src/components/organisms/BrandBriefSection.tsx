import { Card } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { FACT_PROVENANCE_LABELS, FACT_PROVENANCE_TONES } from "@/components/labels";
import { BrandEditForm } from "@/components/organisms/BrandEditForm";
import type { Brand } from "@/modules/clients/domain/brand";
import type { BoundFormAction } from "@/components/action-state";

export function BrandBriefSection({ brand, updateBrandAction }: { brand: Brand; updateBrandAction: BoundFormAction }) {
  return (
    <Card title={`Marca: ${brand.name}`}>
      <p className="text-sm text-muted-on">
        Sitio web:{" "}
        <a href={brand.website} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
          {brand.website}
        </a>
      </p>
      <p className="text-sm text-on-surface">
        <span className="font-medium">Voz de marca:</span> {brand.voice}
      </p>

      {brand.constraints.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-on-surface">Restricciones</h3>
          <ul className="mt-1 list-inside list-disc text-sm text-muted-on">
            {brand.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-on-surface">Hechos del producto</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {brand.productFacts.map((fact) => (
            <li key={fact.id} className="flex flex-col items-start gap-3 rounded-2xl bg-muted p-4 text-sm text-on-surface">
              <span className="leading-relaxed">{fact.statement}</span>
              <div className="flex flex-wrap gap-2">
                <Badge tone={FACT_PROVENANCE_TONES[fact.provenance]}>{FACT_PROVENANCE_LABELS[fact.provenance]}</Badge>
                <Badge tone={fact.approvedForAds ? "success" : "neutral"}>
                  {fact.approvedForAds ? "Aprobado para anuncios" : "No aprobado para anuncios"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium text-primary">Editar marca</summary>
        <div className="mt-3">
          <BrandEditForm brand={brand} action={updateBrandAction} />
        </div>
      </details>
    </Card>
  );
}
