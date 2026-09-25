import type { Scope } from "@/shared/scope";
import type { Audience } from "@/modules/strategy/domain/audience";

export interface AudienceRepository {
  list(scope: Scope): Promise<Audience[]>;
  getById(scope: Scope, audienceId: string): Promise<Audience | null>;
  save(audience: Audience): Promise<void>;
}
