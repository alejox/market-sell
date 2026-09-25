"use client";

import { Button } from "@/components/atoms/Button";

/** Triggers the browser's native print dialog — the "PDF-ready" export path. */
export function PrintTriggerButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Imprimir / guardar como PDF
    </Button>
  );
}
