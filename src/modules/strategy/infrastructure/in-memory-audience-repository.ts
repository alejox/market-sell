import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { InMemoryStore } from "@/shared/infrastructure/in-memory-store";
import type { Scope } from "@/shared/scope";
import type { AudienceRepository } from "@/modules/strategy/application/ports/audience-repository";
import type { Audience } from "@/modules/strategy/domain/audience";

export class InMemoryAudienceRepository implements AudienceRepository {
  private readonly repo = new ScopedRepository<Audience>(new InMemoryStore<Audience>());

  list(scope: Scope): Promise<Audience[]> {
    return this.repo.list(scope);
  }

  getById(scope: Scope, audienceId: string): Promise<Audience | null> {
    return this.repo.getById(scope, audienceId);
  }

  save(audience: Audience): Promise<void> {
    return this.repo.save(audience);
  }

  insertIfAbsent(audience: Audience): Promise<boolean> {
    return this.repo.insertIfAbsent(audience);
  }
}
