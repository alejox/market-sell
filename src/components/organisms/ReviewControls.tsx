"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextAreaField } from "@/components/atoms/fields";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import type { Proposal } from "@/modules/strategy/domain/proposal";

export interface ReviewControlsActions {
  submitForReview: BoundFormAction;
  approve: BoundFormAction;
  requestChanges: BoundFormAction;
  archive: BoundFormAction;
  iterateFromApproved: BoundFormAction;
}

/**
 * State-aware review controls: only the action valid for the proposal's
 * current state is offered, mirroring the domain's transition rules.
 * Approval always requires an explicit second confirmation step — the app
 * never infers approval from a single click or from inactivity.
 */
export function ReviewControls({
  proposal,
  actions,
  exportHref,
  printHref,
}: {
  proposal: Proposal;
  actions: ReviewControlsActions;
  exportHref: string;
  printHref: string;
}) {
  const [submitState, submitAction, submitPending] = useActionState(actions.submitForReview, IDLE_ACTION_STATE);
  const [approveState, approveAction, approvePending] = useActionState(actions.approve, IDLE_ACTION_STATE);
  const [changesState, changesAction, changesPending] = useActionState(actions.requestChanges, IDLE_ACTION_STATE);
  const [archiveState, archiveAction, archivePending] = useActionState(actions.archive, IDLE_ACTION_STATE);
  const [iterateState, iterateAction, iteratePending] = useActionState(actions.iterateFromApproved, IDLE_ACTION_STATE);
  const [confirmingApproval, setConfirmingApproval] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {proposal.state === "draft" && (
        <form action={submitAction} className="flex flex-col items-start gap-2">
          <Button type="submit" disabled={submitPending}>
            {submitPending ? "Enviando…" : "Enviar a revisión"}
          </Button>
          <StatusMessage tone={submitState.status === "error" ? "error" : "success"} message={submitState.status === "idle" ? null : submitState.message} />
        </form>
      )}

      {proposal.state === "in_review" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-2">
            {!confirmingApproval ? (
              <Button type="button" onClick={() => setConfirmingApproval(true)}>
                Aprobar
              </Button>
            ) : (
              <div className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning/5 p-3">
                <p className="text-sm text-on-surface">
                  ¿Confirma la aprobación de la versión {proposal.version}? Esta acción no se puede deshacer.
                </p>
                <div className="flex items-center gap-2">
                  <form action={approveAction}>
                    <Button type="submit" disabled={approvePending}>
                      {approvePending ? "Aprobando…" : "Sí, aprobar"}
                    </Button>
                  </form>
                  <Button type="button" variant="secondary" onClick={() => setConfirmingApproval(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
            <StatusMessage tone={approveState.status === "error" ? "error" : "success"} message={approveState.status === "idle" ? null : approveState.message} />
          </div>

          <form action={changesAction} className="flex flex-col items-start gap-2">
            <TextAreaField
              id="review-feedback"
              name="feedback"
              label="Retroalimentación (obligatoria para solicitar cambios)"
              required
            />
            <Button type="submit" variant="secondary" disabled={changesPending}>
              {changesPending ? "Generando revisión…" : "Solicitar cambios"}
            </Button>
            <StatusMessage tone={changesState.status === "error" ? "error" : "success"} message={changesState.status === "idle" ? null : changesState.message} />
          </form>
        </div>
      )}

      {proposal.state === "approved" && (
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <a href={exportHref} className="text-sm font-medium text-primary underline underline-offset-2">
              Exportar (.md)
            </a>
            <a href={printHref} className="text-sm font-medium text-primary underline underline-offset-2">
              Vista de impresión
            </a>
          </div>
          <form action={iterateAction} className="flex flex-col items-start gap-2">
            <Button type="submit" disabled={iteratePending}>
              {iteratePending ? "Generando nueva iteración…" : "Iniciar nueva iteración"}
            </Button>
            <StatusMessage tone={iterateState.status === "error" ? "error" : "success"} message={iterateState.status === "idle" ? null : iterateState.message} />
          </form>
          <form action={archiveAction} className="flex flex-col items-start gap-2">
            <Button type="submit" variant="danger" disabled={archivePending}>
              {archivePending ? "Archivando…" : "Archivar"}
            </Button>
            <StatusMessage tone={archiveState.status === "error" ? "error" : "success"} message={archiveState.status === "idle" ? null : archiveState.message} />
          </form>
        </div>
      )}

      {proposal.state === "changes_requested" && (
        <p className="text-sm text-muted-on">
          Se solicitaron cambios sobre esta versión. Revise la nueva versión en borrador generada a partir de la
          retroalimentación.
        </p>
      )}

      {proposal.state === "archived" && <p className="text-sm text-muted-on">Esta propuesta está archivada.</p>}
    </div>
  );
}
