"use client";

import { Button } from "@/components/atoms/Button";
import type { Claim, ClaimBasis } from "@/modules/strategy/domain/claim";
import { CLAIM_BASIS_LABELS } from "@/components/labels";

const BASIS_OPTIONS: ClaimBasis[] = ["fact", "owner_input", "assumption", "hypothesis"];

/**
 * A dynamic list of claims (value + basis) — used to edit an audience's
 * pains and objections. Claims here are never auto-upgraded to "fact": the
 * owner must explicitly choose the basis for each one.
 */
export function ClaimListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: Claim<string>[];
  onChange: (values: Claim<string>[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-on-surface">{label}</legend>
      {values.length === 0 && <p className="text-xs text-muted-on">Sin elementos todavía.</p>}
      {values.map((claim, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={claim.value}
            aria-label={`${label} ${index + 1}`}
            onChange={(event) => {
              const next = [...values];
              next[index] = { ...next[index], value: event.target.value };
              onChange(next);
            }}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <select
            value={claim.basis}
            aria-label={`Base de ${label.toLowerCase()} ${index + 1}`}
            onChange={(event) => {
              const next = [...values];
              next[index] = { ...next[index], basis: event.target.value as ClaimBasis };
              onChange(next);
            }}
            className="rounded-md border border-border bg-surface px-2 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {BASIS_OPTIONS.map((basis) => (
              <option key={basis} value={basis}>
                {CLAIM_BASIS_LABELS[basis]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
            aria-label={`Eliminar ${label.toLowerCase()} ${index + 1}`}
          >
            Quitar
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...values, { value: "", basis: "hypothesis" }])}
        className="self-start"
      >
        Agregar
      </Button>
    </fieldset>
  );
}
