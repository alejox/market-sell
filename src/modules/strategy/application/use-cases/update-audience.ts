import { err, ok, type Result } from "@/shared/result";
import type { Scope } from "@/shared/scope";
import type { Clock } from "@/shared/application/ports/clock";
import type { AudienceRepository } from "@/modules/strategy/application/ports/audience-repository";
import type { Audience } from "@/modules/strategy/domain/audience";
import type { Claim } from "@/modules/strategy/domain/claim";

export interface UpdateAudienceInput {
  scope: Scope;
  audienceId: string;
  pains: Claim<string>[];
  objections: Claim<string>[];
  hypotheses: string[];
}

export interface AudienceNotFoundError {
  kind: "audience_not_found";
}

export interface UpdateAudienceDependencies {
  audiences: AudienceRepository;
  clock: Clock;
}

/**
 * Edits one audience track's pains, objections, and hypotheses. Never
 * touches the campaign brief or any proposal — saving an audience must never
 * silently affect an existing proposal thread.
 */
export function createUpdateAudience(deps: UpdateAudienceDependencies) {
  return async function updateAudience(input: UpdateAudienceInput): Promise<Result<Audience, AudienceNotFoundError>> {
    const current = await deps.audiences.getById(input.scope, input.audienceId);
    if (!current) {
      return err({ kind: "audience_not_found" });
    }

    const updated: Audience = {
      ...current,
      pains: input.pains,
      objections: input.objections,
      hypotheses: input.hypotheses,
      updatedAt: deps.clock.now(),
    };

    await deps.audiences.save(updated);
    return ok(updated);
  };
}
