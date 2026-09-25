import { IdentifiedRepository } from "@/shared/infrastructure/identified-repository";
import { InMemoryStore } from "@/shared/infrastructure/in-memory-store";
import type { ClientRepository } from "@/modules/clients/application/ports/client-repository";
import type { Client } from "@/modules/clients/domain/client";

export class InMemoryClientRepository implements ClientRepository {
  private readonly repo = new IdentifiedRepository<Client>(new InMemoryStore<Client>());

  list(): Promise<Client[]> {
    return this.repo.list();
  }

  getById(clientId: string): Promise<Client | null> {
    return this.repo.getById(clientId);
  }

  save(client: Client): Promise<void> {
    return this.repo.save(client);
  }

  insertIfAbsent(client: Client): Promise<boolean> {
    return this.repo.insertIfAbsent(client);
  }
}
