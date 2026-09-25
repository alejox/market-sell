"use client";

import { useActionState } from "react";
import { signInOwner } from "@/app/auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signInOwner, null);
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Correo electrónico
        <input name="email" type="email" autoComplete="username" required className="min-h-11 rounded-xl border border-border bg-surface px-4 text-on-surface" />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required className="min-h-11 rounded-xl border border-border bg-surface px-4 text-on-surface" />
      </label>
      {state?.message && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-on disabled:opacity-60">
        {pending ? "Ingresando…" : "Ingresar al espacio"}
      </button>
    </form>
  );
}
