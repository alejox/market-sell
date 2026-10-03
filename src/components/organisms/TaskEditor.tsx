"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { SelectField, TextField } from "@/components/atoms/fields";
import { NotesView } from "@/components/molecules/NotesView";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { IDLE_ACTION_STATE, type BoundFormAction } from "@/components/action-state";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/components/labels";
import { applyNotesFormat, type NotesFormat } from "@/components/notes-format";
import { TASK_PRIORITIES, TASK_STATUSES, type DevTask } from "@/modules/tasks/domain/dev-task";

const TOOLBAR: Array<{ format: NotesFormat; label: string; text: string }> = [
  { format: "heading", label: "Título de sección", text: "T" },
  { format: "bold", label: "Negrita", text: "N" },
  { format: "italic", label: "Cursiva", text: "C" },
  { format: "bullet", label: "Lista con viñetas", text: "•" },
  { format: "checklist", label: "Lista de verificación", text: "☑" },
  { format: "code", label: "Código", text: "</>" },
];

/**
 * One task's page: its properties (state, owner, priority, deadline) and the
 * notebook body. The notes are Markdown text edited in a textarea with a
 * formatting toolbar, with a rendered preview; both properties and notes are
 * saved together by one Server Action.
 */
export function TaskEditor({
  task,
  assignees,
  action,
}: {
  task: DevTask;
  assignees: string[];
  action: BoundFormAction;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  const [notes, setNotes] = useState(task.notes);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function format(kind: NotesFormat) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const edit = applyNotesFormat(notes, textarea.selectionStart, textarea.selectionEnd, kind);
    setNotes(edit.value);
    // Restore focus and selection once React has applied the new value.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  }

  const tabClass = (selected: boolean) =>
    `inline-flex min-h-9 items-center rounded-full border px-4 py-1 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary ${
      selected ? "border-primary bg-primary text-primary-on" : "border-border bg-surface-raised text-on-surface hover:bg-muted"
    }`;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <TextField id="task-title" name="title" label="Título" required maxLength={200} defaultValue={task.title} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField id="task-status" name="status" label="Estado" defaultValue={task.status}>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-2">
          <TextField
            id="task-assignee"
            name="assignee"
            label="Responsable"
            list="task-assignees"
            maxLength={80}
            autoComplete="off"
            defaultValue={task.assignee ?? ""}
          />
          <datalist id="task-assignees">
            {assignees.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <SelectField id="task-priority" name="priority" label="Prioridad" defaultValue={task.priority}>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>{TASK_PRIORITY_LABELS[priority]}</option>
          ))}
        </SelectField>
        <TextField id="task-due" name="dueDate" label="Fecha límite" type="date" defaultValue={task.dueDate ?? ""} />
      </div>

      <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="notes-heading" className="text-xl text-on-surface">Cuaderno</h2>
          <div role="group" aria-label="Modo del cuaderno" className="flex gap-2">
            <button type="button" aria-pressed={mode === "write"} onClick={() => setMode("write")} className={tabClass(mode === "write")}>
              Escribir
            </button>
            <button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")} className={tabClass(mode === "preview")}>
              Vista previa
            </button>
          </div>
        </div>

        {mode === "write" && (
          <div role="toolbar" aria-label="Formato de las notas" className="flex flex-wrap gap-2">
            {TOOLBAR.map((item) => (
              <Button key={item.format} type="button" variant="secondary" aria-label={item.label} title={item.label} className="min-h-9 px-3" onClick={() => format(item.format)}>
                <span aria-hidden="true" className={item.format === "bold" ? "font-bold" : item.format === "italic" ? "italic" : undefined}>
                  {item.text}
                </span>
              </Button>
            ))}
          </div>
        )}

        {/* Stays mounted while previewing so its value is still submitted with the form. */}
        <label htmlFor="task-notes" className="sr-only">Notas de la tarea</label>
        <textarea
          id="task-notes"
          name="notes"
          ref={textareaRef}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          hidden={mode === "preview"}
          rows={16}
          placeholder={"Escribe aquí: contexto, decisiones, pasos, enlaces…\n\n# Título  ·  **negrita**  ·  - lista  ·  - [ ] pendiente"}
          className="min-h-72 w-full rounded-2xl border border-border bg-muted px-4 py-3 font-mono text-sm text-on-surface placeholder:text-muted-on focus-visible:ring-2 focus-visible:ring-primary"
        />
        {mode === "preview" && (
          <div className="min-h-72 rounded-2xl border border-border bg-surface-raised p-5">
            <NotesView source={notes} emptyMessage="No hay nada que previsualizar todavía." />
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <StatusMessage tone={state.status === "error" ? "error" : "success"} message={state.status === "idle" ? null : state.message} />
      </div>
    </form>
  );
}
