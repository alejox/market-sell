import type { Scope } from "@/shared/scope";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";

export interface BriefRepository {
  list(scope: Scope): Promise<CampaignBrief[]>;
  getById(scope: Scope, briefId: string): Promise<CampaignBrief | null>;
  getByAudience(scope: Scope, audienceId: string): Promise<CampaignBrief | null>;
  save(brief: CampaignBrief): Promise<void>;
}
