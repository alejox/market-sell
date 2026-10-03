"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { NotesView } from "@/components/molecules/NotesView";
import { applyNotesFormat, type NotesFormat } from "@/components/notes-format";

const TOOLBAR: Array<{ format: NotesFormat; label: string; text: string }> = [
  { format: "heading", label: "Título de sección", text: "T" },
  { format: "bold", label: "Negrita", text: "N" },
  { format: "italic", label: "Cursiva", text: "C" },
  { format: "bullet", label: "Lista con viñetas", text: "•" },
  { format: "checklist", label: "Lista de verificación", text: "☑" },
  { format: "code", label: "Código", text: "</>" },
];

/**
 * Markdown notes: a textarea with a formatting toolbar and a rendered
 * preview. Submitted as the `notes` field of the surrounding form; the
 * textarea stays mounted while previewing so its value is still sent.
 */
export function NotesEditor({ defaultValue, heading = "Cuaderno" }: { defaultValue: string; heading?: string }) {
  const [notes, setNotes] = useState(defaultValue);
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
    <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="notes-heading" className="text-xl text-on-surface">{heading}</h2>
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

      <label htmlFor="task-notes" className="sr-only">Notas</label>
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
  );
}
