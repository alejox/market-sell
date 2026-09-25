import type { Client } from "@/modules/clients/domain/client";

/** Not client/brand-scoped by definition — Client is the scope root. */
export interface ClientRepository {
  list(): Promise<Client[]>;
  getById(clientId: string): Promise<Client | null>;
  save(client: Client): Promise<void>;
}
