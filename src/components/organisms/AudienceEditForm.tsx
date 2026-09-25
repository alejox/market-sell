"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { RepeatableTextField } from "@/components/molecules/RepeatableTextField";
import { ClaimListField } from "@/components/molecules/ClaimListField";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import type { Audience } from "@/modules/strategy/domain/audience";

export function AudienceEditForm({ audience, action }: { audience: Audience; action: BoundFormAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  const [pains, setPains] = useState(audience.pains);
  const [objections, setObjections] = useState(audience.objections);
  const [hypotheses, setHypotheses] = useState(audience.hypotheses);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="painsJson" value={JSON.stringify(pains)} readOnly />
      <input type="hidden" name="objectionsJson" value={JSON.stringify(objections)} readOnly />
      <input type="hidden" name="hypothesesJson" value={JSON.stringify(hypotheses)} readOnly />

      <ClaimListField label="Dolores" values={pains} onChange={setPains} />
      <ClaimListField label="Objeciones" values={objections} onChange={setObjections} />
      <RepeatableTextField label="Hipótesis" values={hypotheses} onChange={setHypotheses} />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios de audiencia"}
        </Button>
        <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
      </div>
    </form>
  );
}
