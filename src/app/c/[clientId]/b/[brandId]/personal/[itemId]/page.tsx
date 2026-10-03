import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, repositories } from "@/server/container";
import { DeleteTaskForm } from "@/components/organisms/DeleteTaskForm";
import { PersonalItemEditor } from "@/components/organisms/PersonalItemEditor";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { PERSONAL_KIND_LABELS } from "@/components/labels";
import { requireWorkspaceUser } from "@/shared/infrastructure/supabase/owner-auth";
import { deletePersonalItemAction, updatePersonalItemAction } from "../actions";

export const metadata = { title: "Mis notas — Devtecia" };

export default async function PersonalItemPage({
  params,
}: {
  params: Promise<{ clientId: string; brandId: string; itemId: string }>;
}) {
  const user = await requireWorkspaceUser();
  await ensureWorkspaceSeeded();

  const { clientId, brandId, itemId } = await params;
  const scope = { clientId, brandId };

  // Looked up through the signed-in user: someone else's id resolves to "not found".
  const item = await repositories.personalItems.getById(scope, user.id, itemId);
  if (!item) notFound();

  const personalPath = `/c/${clientId}/b/${brandId}/personal`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={personalPath} className="w-fit text-sm font-medium text-on-surface underline underline-offset-4">
          ← Volver a Mis notas
        </Link>
        <SignOutButton />
      </div>

      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">{PERSONAL_KIND_LABELS[item.kind]} privada</p>
        <h1 className="text-4xl leading-tight text-on-surface sm:text-5xl">{item.title}</h1>
      </header>

      <PersonalItemEditor item={item} action={updatePersonalItemAction.bind(null, scope, item.id)} />

      <section aria-label="Zona de peligro" className="border-t border-border pt-6">
        <DeleteTaskForm
          action={deletePersonalItemAction.bind(null, scope, item.id)}
          label="Eliminar"
          message="¿Eliminar este elemento y su página? Esta acción no se puede deshacer."
        />
      </section>
    </main>
  );
}
