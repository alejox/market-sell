import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { BriefRepository } from "@/modules/strategy/application/ports/brief-repository";
import type { BudgetRange, CampaignBrief } from "@/modules/strategy/domain/campaign-brief";

export interface UpdateCampaignBriefInput {
  scope: Scope;
  briefId: string;
  objective: string;
  timeframe: string;
  valueProposition: string;
  /** Null unless the owner explicitly supplies one — never inferred. */
  budgetRange: BudgetRange | null;
  missingInformation: string[];
}

export interface BriefNotFoundError {
  kind: "brief_not_found";
}

export interface UpdateCampaignBriefDependencies {
  briefs: BriefRepository;
  clock: Clock;
}

/**
 * Edits one campaign brief's objective, timeframe, value proposition,
 * optional owner-supplied budget range, and open missing-information items.
 * Never touches proposals — saving the brief must never overwrite or affect
 * an existing proposal version.
 */
export function createUpdateCampaignBrief(deps: UpdateCampaignBriefDependencies) {
  return async function updateCampaignBrief(
    input: UpdateCampaignBriefInput,
  ): Promise<Result<CampaignBrief, BriefNotFoundError>> {
    const current = await deps.briefs.getById(input.scope, input.briefId);
    if (!current) {
      return err({ kind: "brief_not_found" });
    }

    const updated: CampaignBrief = {
      ...current,
      objective: input.objective,
      timeframe: input.timeframe,
      valueProposition: input.valueProposition,
      budgetRange: input.budgetRange,
      missingInformation: input.missingInformation,
      updatedAt: deps.clock.now(),
    };

    await deps.briefs.save(updated);
    return ok(updated);
  };
}
