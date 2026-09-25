"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextField, TextAreaField } from "@/components/atoms/fields";
import { RepeatableTextField } from "@/components/molecules/RepeatableTextField";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";

export function CampaignBriefEditForm({ brief, action }: { brief: CampaignBrief; action: BoundFormAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  const [objective, setObjective] = useState(brief.objective);
  const [timeframe, setTimeframe] = useState(brief.timeframe);
  const [valueProposition, setValueProposition] = useState(brief.valueProposition);
  const [budgetMin, setBudgetMin] = useState(brief.budgetRange ? String(brief.budgetRange.min) : "");
  const [budgetMax, setBudgetMax] = useState(brief.budgetRange ? String(brief.budgetRange.max) : "");
  const [missingInformation, setMissingInformation] = useState(brief.missingInformation);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="missingInformationJson" value={JSON.stringify(missingInformation)} readOnly />

      <TextField id="brief-objective" name="objective" label="Objetivo" value={objective} onChange={(e) => setObjective(e.target.value)} />
      <TextField id="brief-timeframe" name="timeframe" label="Plazo" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} />
      <TextAreaField
        id="brief-value-proposition"
        name="valueProposition"
        label="Propuesta de valor"
        value={valueProposition}
        onChange={(e) => setValueProposition(e.target.value)}
      />

      <fieldset className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <legend className="text-sm font-medium text-on-surface">Presupuesto (COP, opcional)</legend>
        <TextField
          id="brief-budget-min"
          name="budgetMin"
          label="Mínimo"
          inputMode="numeric"
          value={budgetMin}
          onChange={(e) => setBudgetMin(e.target.value)}
        />
        <TextField
          id="brief-budget-max"
          name="budgetMax"
          label="Máximo"
          inputMode="numeric"
          value={budgetMax}
          onChange={(e) => setBudgetMax(e.target.value)}
        />
      </fieldset>

      <RepeatableTextField label="Información faltante" values={missingInformation} onChange={setMissingInformation} />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar brief de campaña"}
        </Button>
        <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
      </div>
    </form>
  );
}
