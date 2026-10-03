"use client";

import { useActionState, useState } from "react";
import type { JoinState } from "@/app/invitacion/[token]/actions";

type Action = (prev: JoinState, formData: FormData) => Promise<JoinState>;

const inputClass = "min-h-11 rounded-xl border border-border bg-surface px-4 text-on-surface focus-visible:ring-2 focus-visible:ring-primary";
const submitClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-on focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60";

function Field({ label, name, type, autoComplete }: { label: string; name: string; type: string; autoComplete: string }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <input name={name} type={type} autoComplete={autoComplete} required className={inputClass} />
    </label>
  );
}

function AccountForm({ action, mode }: { action: Action; mode: "signup" | "signin" }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Correo electrónico" name="email" type="email" autoComplete="username" />
      <Field label="Contraseña" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
      {mode === "signup" && <Field label="Repite la contraseña" name="confirm" type="password" autoComplete="new-password" />}
      {state?.message && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Un momento…" : mode === "signup" ? "Crear cuenta y unirme" : "Iniciar sesión y unirme"}
      </button>
    </form>
  );
}

/** Account creation / sign-in for someone opening an invitation link. */
export function InvitationForms({ signUp, signIn }: { signUp: Action; signIn: Action }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Tipo de acceso" className="flex gap-2">
        {(["signup", "signin"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className={`inline-flex min-h-9 items-center rounded-full border px-4 py-1 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary ${
              mode === option ? "border-primary bg-primary text-primary-on" : "border-border bg-surface-raised text-on-surface hover:bg-muted"
            }`}
          >
            {option === "signup" ? "Soy nuevo" : "Ya tengo cuenta"}
          </button>
        ))}
      </div>
      {mode === "signup" ? <AccountForm key="signup" action={signUp} mode="signup" /> : <AccountForm key="signin" action={signIn} mode="signin" />}
    </div>
  );
}

/** One-click join for a person who is already signed in. */
export function JoinButton({ action, email }: { action: Action; email: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-on">Entraste como {email || "tu cuenta"}.</p>
      {state?.message && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Un momento…" : "Unirme al equipo"}
      </button>
    </form>
  );
}
