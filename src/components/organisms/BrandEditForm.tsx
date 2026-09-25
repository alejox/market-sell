"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextAreaField } from "@/components/atoms/fields";
import { RepeatableTextField } from "@/components/molecules/RepeatableTextField";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import { FACT_PROVENANCE_LABELS } from "@/components/labels";
import type { Brand, FactProvenance, ProductFact } from "@/modules/clients/domain/brand";

const PROVENANCE_OPTIONS: FactProvenance[] = ["verified_website", "owner_provided", "hypothesis"];

function newFact(): ProductFact {
  return { id: `fact-owner-${Date.now()}`, statement: "", provenance: "owner_provided", approvedForAds: false };
}

export function BrandEditForm({ brand, action }: { brand: Brand; action: BoundFormAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  const [voice, setVoice] = useState(brand.voice);
  const [constraints, setConstraints] = useState(brand.constraints);
  const [assets, setAssets] = useState(brand.assets);
  const [productFacts, setProductFacts] = useState(brand.productFacts);

  function updateFact(index: number, patch: Partial<ProductFact>) {
    setProductFacts((current) => current.map((fact, i) => (i === index ? { ...fact, ...patch } : fact)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="constraintsJson" value={JSON.stringify(constraints)} readOnly />
      <input type="hidden" name="assetsJson" value={JSON.stringify(assets)} readOnly />
      <input type="hidden" name="productFactsJson" value={JSON.stringify(productFacts)} readOnly />

      <TextAreaField
        id="brand-voice"
        name="voice"
        label="Voz de marca"
        value={voice}
        onChange={(event) => setVoice(event.target.value)}
      />

      <RepeatableTextField label="Restricciones" values={constraints} onChange={setConstraints} />
      <RepeatableTextField label="Activos disponibles" values={assets} onChange={setAssets} />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-on-surface">Hechos del producto</legend>
        {productFacts.map((fact, index) => (
          <div key={fact.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-on-surface">Afirmación</span>
              <textarea
                value={fact.statement}
                onChange={(event) => updateFact(index, { statement: event.target.value })}
                className="min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span>Procedencia</span>
                <select
                  value={fact.provenance}
                  onChange={(event) => updateFact(index, { provenance: event.target.value as FactProvenance })}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {PROVENANCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {FACT_PROVENANCE_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fact.approvedForAds}
                  disabled={fact.provenance === "hypothesis"}
                  onChange={(event) => updateFact(index, { approvedForAds: event.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                <span>Aprobado para anuncios</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProductFacts((current) => current.filter((_, i) => i !== index))}
              >
                Eliminar hecho
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => setProductFacts((current) => [...current, newFact()])} className="self-start">
          Agregar hecho
        </Button>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios de marca"}
        </Button>
        <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
      </div>
    </form>
  );
}
