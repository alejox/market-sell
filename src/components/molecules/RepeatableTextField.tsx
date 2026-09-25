"use client";

import { Button } from "@/components/atoms/Button";

/**
 * A dynamic list of plain-text values (constraints, assets, hypotheses,
 * missing-information items) with add/remove controls. Fully controlled —
 * the parent form owns the array and serializes it on submit.
 */
export function RepeatableTextField({
  label,
  values,
  onChange,
  placeholder,
  addLabel = "Agregar",
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-on-surface">{label}</legend>
      {values.length === 0 && <p className="text-xs text-muted-on">Sin elementos todavía.</p>}
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            aria-label={`${label} ${index + 1}`}
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              onChange(next);
            }}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
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
      <Button type="button" variant="secondary" onClick={() => onChange([...values, ""])} className="self-start">
        {addLabel}
      </Button>
    </fieldset>
  );
}
