import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { InMemoryStore } from "@/shared/infrastructure/in-memory-store";
import type { Scope } from "@/shared/scope";
import type { BriefRepository } from "@/modules/strategy/application/ports/brief-repository";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";

export class InMemoryBriefRepository implements BriefRepository {
  private readonly repo = new ScopedRepository<CampaignBrief>(new InMemoryStore<CampaignBrief>());

  list(scope: Scope): Promise<CampaignBrief[]> {
    return this.repo.list(scope);
  }

  getById(scope: Scope, briefId: string): Promise<CampaignBrief | null> {
    return this.repo.getById(scope, briefId);
  }

  async getByAudience(scope: Scope, audienceId: string): Promise<CampaignBrief | null> {
    const all = await this.repo.list(scope);
    return all.find((brief) => brief.audienceId === audienceId) ?? null;
  }

  save(brief: CampaignBrief): Promise<void> {
    return this.repo.save(brief);
  }
}
