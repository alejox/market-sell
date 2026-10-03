"use server";

import { revalidatePath } from "next/cache";
import * as container from "@/server/container";
import type { ActionState } from "@/components/action-state";
import { requireWorkspaceUser } from "@/shared/infrastructure/supabase/owner-auth";

type Scope = { clientId: string; brandId: string };

const MESSAGES = {
  display_name_required: "Escribe tu nombre.",
  display_name_too_long: "El nombre es demasiado largo (máximo 80 caracteres).",
  job_title_too_long: "El cargo es demasiado largo (máximo 80 caracteres).",
} as const;

function text(formData: FormData, field: string): string {
  const raw = formData.get(field);
  return typeof raw === "string" ? raw : "";
}

/** Edits the signed-in person's own profile: the user id always comes from the session, never from the form. */
export async function updateProfileAction(scope: Scope, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireWorkspaceUser();

  const result = await container.updateProfile({
    clientId: scope.clientId,
    userId: user.id,
    displayName: text(formData, "displayName"),
    jobTitle: text(formData, "jobTitle"),
  });
  if (!result.ok) return { status: "error", message: MESSAGES[result.error.kind] };

  // The name appears in the sidebar-adjacent screens: tasks, team and the profile itself.
  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`, "layout");
  return { status: "success", message: "Perfil guardado." };
}
