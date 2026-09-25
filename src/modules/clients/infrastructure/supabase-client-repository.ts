import type { ClientRepository } from "@/modules/clients/application/ports/client-repository";
import type { Client, ClientStatus } from "@/modules/clients/domain/client";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { unwrapList, unwrapMaybe, unwrapWrite } from "@/shared/infrastructure/supabase/errors";
import { verifiedOwnerId } from "@/shared/infrastructure/supabase/verified-owner";

const TABLE = "clients";

/** Row shape of `public.clients` (see the workspace schema migration). */
interface ClientRow {
  id: string;
  owner_id: string;
  name: string;
  owner: string;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}

function fromRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** `owner_id` is infra-only (the verified Supabase auth subject) — never part of the domain `Client`. */
function toRow(client: Client, ownerId: string): ClientRow {
  return {
    id: client.id,
    owner_id: ownerId,
    name: client.name,
    owner: client.owner,
    status: client.status,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  };
}

/**
 * `clients` is the scope root (no `{ clientId, brandId }` scope applies to
 * it) — RLS (`clients_select_own` et al.) already restricts every query to
 * rows owned by the authenticated owner. `save` additionally re-verifies the
 * owner from this request's own session and stamps `owner_id` with it, so a
 * new client can never be attributed to anyone else even if a caller
 * forgets to check `requireOwner()` first.
 */
export class SupabaseClientRepository implements ClientRepository {
  constructor(private readonly getClient: SupabaseClientProvider) {}

  async list(): Promise<Client[]> {
    const supabase = await this.getClient();
    const result = await supabase.from(TABLE).select("*");
    return unwrapList<ClientRow>("clients.list", result).map(fromRow);
  }

  async getById(clientId: string): Promise<Client | null> {
    const supabase = await this.getClient();
    const result = await supabase.from(TABLE).select("*").eq("id", clientId).maybeSingle();
    const row = unwrapMaybe<ClientRow>("clients.getById", result);
    return row ? fromRow(row) : null;
  }

  async save(client: Client): Promise<void> {
    const supabase = await this.getClient();
    const ownerId = await verifiedOwnerId(supabase);
    const result = await supabase.from(TABLE).upsert(toRow(client, ownerId), { onConflict: "id" });
    unwrapWrite("clients.save", result);
  }
}
