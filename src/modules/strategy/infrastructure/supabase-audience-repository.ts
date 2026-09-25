import type { AudienceRepository } from "@/modules/strategy/application/ports/audience-repository";
import type { Audience } from "@/modules/strategy/domain/audience";
import type { Claim } from "@/modules/strategy/domain/claim";
import type { Scope } from "@/shared/scope";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { ScopedSupabaseRepository } from "@/shared/infrastructure/supabase/scoped-supabase-repository";

const TABLE = "audiences";

/** Row shape of `public.audiences` (see the workspace schema migration). */
interface AudienceRow {
  id: string;
  client_id: string;
  brand_id: string;
  segment_name: string;
  geography: string;
  pains: Claim<string>[];
  objections: Claim<string>[];
  hypotheses: string[];
  created_at: string;
  updated_at: string;
}

function fromRow(row: AudienceRow): Audience {
  return {
    id: row.id,
    clientId: row.client_id,
    brandId: row.brand_id,
    segmentName: row.segment_name,
    geography: row.geography,
    pains: row.pains,
    objections: row.objections,
    hypotheses: row.hypotheses,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(audience: Audience): AudienceRow {
  return {
    id: audience.id,
    client_id: audience.clientId,
    brand_id: audience.brandId,
    segment_name: audience.segmentName,
    geography: audience.geography,
    pains: audience.pains,
    objections: audience.objections,
    hypotheses: audience.hypotheses,
    created_at: audience.createdAt,
    updated_at: audience.updatedAt,
  };
}

export class SupabaseAudienceRepository implements AudienceRepository {
  private readonly repo: ScopedSupabaseRepository<AudienceRow, Audience>;

  constructor(getClient: SupabaseClientProvider) {
    this.repo = new ScopedSupabaseRepository<AudienceRow, Audience>(getClient, TABLE, fromRow, toRow);
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
}
