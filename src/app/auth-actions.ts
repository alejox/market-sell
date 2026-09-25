"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";
import { isAllowedOwner } from "@/shared/infrastructure/supabase/owner-policy";

export type LoginState = { message: string } | null;

export async function signInOwner(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { message: "Ingresá tu correo y contraseña." };
  if (!process.env.SUPABASE_OWNER_ID) return { message: "El acceso todavía no está configurado." };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { message: "No se pudo iniciar sesión. Revisá tus datos e intentá de nuevo." };

    const { data, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !isAllowedOwner(data?.claims, process.env.SUPABASE_OWNER_ID)) {
      await supabase.auth.signOut();
      return { message: "Esta cuenta no tiene acceso al espacio de trabajo." };
    }
  } catch {
    return { message: "No se pudo conectar con el servicio de autenticación." };
  }

  redirect("/");
}

export async function signOutOwner(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
