"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as container from "@/server/container";
import type { ActionState } from "@/components/action-state";
import { requireWorkspaceUser } from "@/shared/infrastructure/supabase/owner-auth";
import { isPersonalKind, type PersonalKind } from "@/modules/personal/domain/personal-item";

type Scope = { clientId: string; brandId: string };

const personalPath = (scope: Scope) => `/c/${scope.clientId}/b/${scope.brandId}/personal`;

function text(formData: FormData, field: string): string {
  const raw = formData.get(field);
  return typeof raw === "string" ? raw : "";
}

/** Unknown values fall back to a task — form input is untrusted. */
function kindField(formData: FormData): PersonalKind {
  const raw = text(formData, "kind");
  return isPersonalKind(raw) ? raw : "task";
}

const TITLE_REQUIRED = "Escribe un título.";

/** Every action acts on the signed-in person's own items only: the user id always comes from the session. */
export async function createPersonalItemAction(scope: Scope, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireWorkspaceUser();

  const result = await container.createPersonalItem({
    scope,
    userId: user.id,
    kind: kindField(formData),
    title: text(formData, "title"),
  });
  if (!result.ok) return { status: "error", message: TITLE_REQUIRED };

  revalidatePath(personalPath(scope));
  return { status: "success", message: "Guardado." };
}

export async function updatePersonalItemAction(
  scope: Scope,
  itemId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireWorkspaceUser();

  const result = await container.updatePersonalItem({
    scope,
    userId: user.id,
    itemId,
    patch: {
      title: text(formData, "title"),
      kind: kindField(formData),
      done: formData.get("done") === "on",
      body: text(formData, "notes"),
    },
  });
  if (!result.ok) {
    return { status: "error", message: result.error.kind === "title_required" ? TITLE_REQUIRED : "No se encontró el elemento." };
  }

  revalidatePath(personalPath(scope));
  revalidatePath(`${personalPath(scope)}/${itemId}`);
  return { status: "success", message: "Cambios guardados." };
}

/** Checks / unchecks a task from the list. */
export async function togglePersonalDoneAction(scope: Scope, itemId: string, done: boolean): Promise<void> {
  const user = await requireWorkspaceUser();
  await container.updatePersonalItem({ scope, userId: user.id, itemId, patch: { done } });
  revalidatePath(personalPath(scope));
  revalidatePath(`${personalPath(scope)}/${itemId}`);
}

export async function deletePersonalItemAction(scope: Scope, itemId: string): Promise<void> {
  const user = await requireWorkspaceUser();
  await container.deletePersonalItem({ scope, userId: user.id, itemId });
  revalidatePath(personalPath(scope));
  redirect(personalPath(scope));
}
