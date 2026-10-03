import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureWorkspaceSeeded, repositories } from "@/server/container";
import { APP_NAME } from "@/components/app-name";
import { Card } from "@/components/atoms/Card";
import { NewPersonalItemForm } from "@/components/organisms/NewPersonalItemForm";
import { SignOutButton } from "@/components/organisms/SignOutButton";
import { groupPersonalItems, type PersonalItem } from "@/modules/personal/domain/personal-item";
import { requireWorkspaceUser } from "@/shared/infrastructure/supabase/owner-auth";
import { createPersonalItemAction, togglePersonalDoneAction } from "./actions";

export const metadata = { title: "Mis notas — Devtecia" };

function ItemRow({ item, basePath, toggle }: { item: PersonalItem; basePath: string; toggle?: (done: boolean) => Promise<void> }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      {toggle && (
        <form action={toggle.bind(null, !item.done)}>
          <button
            type="submit"
            aria-label={item.done ? `Marcar como pendiente: ${item.title}` : `Marcar como hecha: ${item.title}`}
            className={`flex size-6 items-center justify-center rounded-full border text-xs focus-visible:ring-2 focus-visible:ring-primary ${
              item.done ? "border-primary bg-primary text-primary-on" : "border-on-surface bg-surface-raised text-transparent hover:bg-muted"
            }`}
          >
            ✓
          </button>
        </form>
      )}
      <Link
        href={`${basePath}/${item.id}`}
        className={`min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline ${item.done ? "text-muted-on line-through" : "text-on-surface"}`}
      >
        {item.title}
      </Link>
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-2xl text-on-surface">{title}</h2>
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface-raised">{children}</ul>
    </section>
  );
}

export default async function PersonalPage({ params }: { params: Promise<{ clientId: string; brandId: string }> }) {
  const user = await requireWorkspaceUser();
  await ensureWorkspaceSeeded();

  const { clientId, brandId } = await params;
  const scope = { clientId, brandId };
  const brand = await repositories.brands.getById(clientId, brandId);
  if (!brand) notFound();

  const basePath = `/c/${clientId}/b/${brandId}/personal`;
  const items = await repositories.personalItems.list(scope, user.id);
  const { openTasks, notes, doneTasks } = groupPersonalItems(items);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-on">{APP_NAME} · Personal</p>
          <SignOutButton />
        </div>
        <div className="max-w-3xl">
          <h1 className="text-4xl leading-tight text-on-surface sm:text-5xl">Mis notas y tareas</h1>
          <p className="mt-3 text-base text-muted-on">Tu espacio privado: solo tú puedes ver lo que escribes aquí.</p>
        </div>
      </header>

      <Card title="Añadir">
        <NewPersonalItemForm action={createPersonalItemAction.bind(null, scope)} />
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-on">Todavía no tienes nada. Añade tu primera tarea o nota arriba.</p>
        </Card>
      ) : (
        <>
          {openTasks.length > 0 && (
            <Group title="Tareas">
              {openTasks.map((item) => (
                <ItemRow key={item.id} item={item} basePath={basePath} toggle={togglePersonalDoneAction.bind(null, scope, item.id)} />
              ))}
            </Group>
          )}
          {notes.length > 0 && (
            <Group title="Notas">
              {notes.map((item) => (
                <ItemRow key={item.id} item={item} basePath={basePath} />
              ))}
            </Group>
          )}
          {doneTasks.length > 0 && (
            <Group title="Hechas">
              {doneTasks.map((item) => (
                <ItemRow key={item.id} item={item} basePath={basePath} toggle={togglePersonalDoneAction.bind(null, scope, item.id)} />
              ))}
            </Group>
          )}
        </>
      )}
    </main>
  );
}
