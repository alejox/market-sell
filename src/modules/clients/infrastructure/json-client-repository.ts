import { IdentifiedRepository } from "@/shared/infrastructure/identified-repository";
import { JsonFileStore } from "@/shared/infrastructure/json-file-store";
import type { ClientRepository } from "@/modules/clients/application/ports/client-repository";
import type { Client } from "@/modules/clients/domain/client";

export class JsonClientRepository implements ClientRepository {
  private readonly repo: IdentifiedRepository<Client>;

  constructor(filePath: string) {
    this.repo = new IdentifiedRepository<Client>(new JsonFileStore<Client>(filePath));
  }

  list(): Promise<Client[]> {
    return this.repo.list();
  }

  getById(clientId: string): Promise<Client | null> {
    return this.repo.getById(clientId);
  }

  save(client: Client): Promise<void> {
    return this.repo.save(client);
  }
}
