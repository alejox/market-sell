"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextField, TextAreaField, SelectField } from "@/components/atoms/fields";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import { RESULT_SOURCE_LABELS } from "@/components/labels";
import type { ResultMetric, ResultSnapshotSource } from "@/modules/results/domain/result-snapshot";

const SOURCE_OPTIONS: ResultSnapshotSource[] = ["manual_owner_entry", "manual_meta_export", "manual_other"];

/**
 * Records one manually entered result snapshot. Every option under "fuente"
 * is explicitly a manual entry — this form never claims to sync with a live
 * platform.
 */
export function ResultSnapshotForm({ action }: { action: BoundFormAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  const [metrics, setMetrics] = useState<ResultMetric[]>([{ name: "", value: "", unit: "" }]);

  function updateMetric(index: number, patch: Partial<ResultMetric>) {
    setMetrics((current) => current.map((metric, i) => (i === index ? { ...metric, ...patch } : metric)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="metricsJson" value={JSON.stringify(metrics)} readOnly />

      <p className="text-xs text-muted-on">
        Este resultado se registra manualmente — el espacio de trabajo no se sincroniza con ninguna plataforma.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <TextField id="snapshot-period-from" name="periodFrom" label="Desde" type="date" required />
        <TextField id="snapshot-period-to" name="periodTo" label="Hasta" type="date" required />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-on-surface">Métricas</legend>
        {metrics.map((metric, index) => (
          <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Métrica (p. ej. alcance)"
              aria-label={`Nombre de la métrica ${index + 1}`}
              value={metric.name}
              onChange={(event) => updateMetric(index, { name: event.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <input
              type="text"
              placeholder="Valor"
              aria-label={`Valor de la métrica ${index + 1}`}
              value={String(metric.value)}
              onChange={(event) => updateMetric(index, { value: event.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <input
              type="text"
              placeholder="Unidad (opcional)"
              aria-label={`Unidad de la métrica ${index + 1}`}
              value={metric.unit ?? ""}
              onChange={(event) => updateMetric(index, { unit: event.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button type="button" variant="ghost" onClick={() => setMetrics((current) => current.filter((_, i) => i !== index))}>
              Quitar
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          onClick={() => setMetrics((current) => [...current, { name: "", value: "", unit: "" }])}
        >
          Agregar métrica
        </Button>
      </fieldset>

      <TextAreaField id="snapshot-notes" name="notes" label="Notas" />

      <SelectField id="snapshot-source" name="source" label="Fuente" defaultValue="manual_owner_entry">
        {SOURCE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {RESULT_SOURCE_LABELS[option]}
          </option>
        ))}
      </SelectField>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Registrar resultado"}
        </Button>
        <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
      </div>
    </form>
  );
}
