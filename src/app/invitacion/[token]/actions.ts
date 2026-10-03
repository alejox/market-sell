"use server";

import { redirect } from "next/navigation";
import * as container from "@/server/container";
import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";

export type JoinState = { message: string } | null;

const MIN_PASSWORD_LENGTH = 8;

const FAILURE_MESSAGES = {
  invalid: "Este enlace de invitación no es válido.",
  used: "Este enlace ya fue usado. Pide uno nuevo.",
  expired: "Este enlace venció. Pide uno nuevo.",
} as const;

/** Consumes the invitation for whoever is signed in on this request, then enters the workspace. */
async function join(token: string): Promise<JoinState> {
  let result;
  try {
    result = await container.acceptInvitation({ token });
  } catch {
    return { message: "No se pudo unir a tu cuenta. Inicia sesión e intenta de nuevo." };
  }
  if (!result.ok) return { message: FAILURE_MESSAGES[result.error] };
  redirect("/");
}

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  };
}

/** Public: anyone with a valid link can create an account. The account has no access until the invitation is accepted. */
export async function signUpAndJoinAction(token: string, _prev: JoinState, formData: FormData): Promise<JoinState> {
  const { email, password, confirm } = credentials(formData);
  if (!email || !password) return { message: "Ingresa tu correo y una contraseña." };
  if (password.length < MIN_PASSWORD_LENGTH) return { message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  if (password !== confirm) return { message: "Las contraseñas no coinciden." };

  // Cheap early exit so a dead link never creates an account.
  const status = await container.checkInvitation({ token });
  if (status !== "valid") return { message: FAILURE_MESSAGES[status] };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { message: "No se pudo crear la cuenta. Revisa tus datos o inicia sesión si ya tienes una." };
    if (!data.session) {
      return {
        message:
          "Te enviamos un correo para confirmar tu cuenta. Confírmalo, vuelve a abrir este enlace e inicia sesión para unirte.",
      };
    }
  } catch {
    return { message: "No se pudo conectar con el servicio de autenticación." };
  }

  return join(token);
}

export async function signInAndJoinAction(token: string, _prev: JoinState, formData: FormData): Promise<JoinState> {
  const { email, password } = credentials(formData);
  if (!email || !password) return { message: "Ingresa tu correo y contraseña." };

  const status = await container.checkInvitation({ token });
  if (status !== "valid") return { message: FAILURE_MESSAGES[status] };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { message: "No se pudo iniciar sesión. Revisa tus datos e intenta de nuevo." };
  } catch {
    return { message: "No se pudo conectar con el servicio de autenticación." };
  }

  return join(token);
}

/** For someone who is already signed in (e.g. just confirmed their email) and opened the link. */
export async function joinAsCurrentUserAction(token: string): Promise<JoinState> {
  return join(token);
}
