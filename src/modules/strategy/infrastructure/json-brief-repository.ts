import { ScopedRepository } from "@/shared/infrastructure/scoped-repository";
import { JsonFileStore } from "@/shared/infrastructure/json-file-store";
import type { Scope } from "@/shared/scope";
import type { BriefRepository } from "@/modules/strategy/application/ports/brief-repository";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";

export class JsonBriefRepository implements BriefRepository {
  private readonly repo: ScopedRepository<CampaignBrief>;

  constructor(filePath: string) {
    this.repo = new ScopedRepository<CampaignBrief>(new JsonFileStore<CampaignBrief>(filePath));
  }

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

  /** Never overwrites an existing brief — used by seed/import, safe under concurrent serverless instances. */
  insertIfAbsent(brief: CampaignBrief): Promise<boolean> {
    return this.repo.insertIfAbsent(brief);
  }
}
