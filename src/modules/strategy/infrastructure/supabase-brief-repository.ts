import type { BriefRepository } from "@/modules/strategy/application/ports/brief-repository";
import type { BriefStatus, BudgetRange, CampaignBrief } from "@/modules/strategy/domain/campaign-brief";
import type { Scope } from "@/shared/scope";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { ScopedSupabaseRepository } from "@/shared/infrastructure/supabase/scoped-supabase-repository";

const TABLE = "campaign_briefs";

/** Row shape of `public.campaign_briefs` (see the workspace schema migration). */
interface CampaignBriefRow {
  id: string;
  client_id: string;
  brand_id: string;
  audience_id: string;
  objective: string;
  timeframe: string;
  value_proposition: string;
  budget_range: BudgetRange | null;
  missing_information: string[];
  created_by: string;
  status: BriefStatus;
  created_at: string;
  updated_at: string;
}

function fromRow(row: CampaignBriefRow): CampaignBrief {
  return {
    id: row.id,
    clientId: row.client_id,
    brandId: row.brand_id,
    audienceId: row.audience_id,
    objective: row.objective,
    timeframe: row.timeframe,
    valueProposition: row.value_proposition,
    budgetRange: row.budget_range,
    missingInformation: row.missing_information,
    createdBy: row.created_by,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(brief: CampaignBrief): CampaignBriefRow {
  return {
    id: brief.id,
    client_id: brief.clientId,
    brand_id: brief.brandId,
    audience_id: brief.audienceId,
    objective: brief.objective,
    timeframe: brief.timeframe,
    value_proposition: brief.valueProposition,
    budget_range: brief.budgetRange,
    missing_information: brief.missingInformation,
    created_by: brief.createdBy,
    status: brief.status,
    created_at: brief.createdAt,
    updated_at: brief.updatedAt,
  };
}

export class SupabaseBriefRepository implements BriefRepository {
  private readonly repo: ScopedSupabaseRepository<CampaignBriefRow, CampaignBrief>;

  constructor(getClient: SupabaseClientProvider) {
    this.repo = new ScopedSupabaseRepository<CampaignBriefRow, CampaignBrief>(getClient, TABLE, fromRow, toRow);
  }

  list(scope: Scope): Promise<CampaignBrief[]> {
    return this.repo.list(scope);
  }

  getById(scope: Scope, briefId: string): Promise<CampaignBrief | null> {
    return this.repo.getById(scope, briefId);
  }

  getByAudience(scope: Scope, audienceId: string): Promise<CampaignBrief | null> {
    return this.repo.findOneBy(scope, "audience_id", audienceId);
  }

  save(brief: CampaignBrief): Promise<void> {
    return this.repo.save(brief);
  }

  /** Never overwrites an existing brief — used by seed/import, safe under concurrent serverless instances. */
  insertIfAbsent(brief: CampaignBrief): Promise<boolean> {
    return this.repo.insertIfAbsent(brief);
  }
}
