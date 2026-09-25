import { redirect } from "next/navigation";
import { ensureWorkspaceSeeded, repositories } from "@/server/container";

/**
 * No marketing landing page: this route only resolves the default
 * client/brand workspace (Ventex, seeded) and redirects into it.
 */
export default async function Home() {
  await ensureWorkspaceSeeded();

  const clients = await repositories.clients.list();
  const client = clients[0];

  if (!client) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <h1 className="text-lg font-semibold text-on-surface">No hay clientes configurados</h1>
        <p className="text-sm text-muted-on">No se pudo inicializar el espacio de trabajo de Ventex.</p>
      </main>
    );
  }

  const brands = await repositories.brands.listByClient(client.id);
  const brand = brands[0];

  if (!brand) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <h1 className="text-lg font-semibold text-on-surface">No hay marcas configuradas</h1>
        <p className="text-sm text-muted-on">No se encontró ninguna marca para {client.name}.</p>
      </main>
    );
  }

  redirect(`/c/${client.id}/b/${brand.id}`);
}
