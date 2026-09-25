import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { JsonFileStore } from "@/shared/infrastructure/json-file-store";
import type { Scope } from "@/shared/scope";
import type { AudienceRepository } from "@/modules/strategy/application/ports/audience-repository";
import type { Audience } from "@/modules/strategy/domain/audience";

export class JsonAudienceRepository implements AudienceRepository {
  private readonly repo: ScopedRepository<Audience>;

  constructor(filePath: string) {
    this.repo = new ScopedRepository<Audience>(new JsonFileStore<Audience>(filePath));
  }

  list(scope: Scope): Promise<Audience[]> {
    return this.repo.list(scope);
  }

  getById(scope: Scope, audienceId: string): Promise<Audience | null> {
    return this.repo.getById(scope, audienceId);
  }

  save(audience: Audience): Promise<void> {
    return this.repo.save(audience);
  }

  /** Never overwrites an existing audience — used by seed/import, safe under concurrent serverless instances. */
  insertIfAbsent(audience: Audience): Promise<boolean> {
    return this.repo.insertIfAbsent(audience);
  }
}
