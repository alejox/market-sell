import { err, ok, type Result } from "@/shared/result";
import type { Clock } from "@/shared/application/ports/clock";
import type { BrandRepository } from "@/modules/clients/application/ports/brand-repository";
import type { Brand, ProductFact } from "@/modules/clients/domain/brand";
import { findHypothesisApprovedForAds, type HypothesisApprovedForAdsError } from "@/modules/clients/domain/brand";

export interface UpdateBrandInput {
  clientId: string;
  brandId: string;
  voice: string;
  constraints: string[];
  assets: string[];
  productFacts: ProductFact[];
}

export interface BrandNotFoundError {
  kind: "brand_not_found";
}

export type UpdateBrandError = BrandNotFoundError | HypothesisApprovedForAdsError;

export interface UpdateBrandDependencies {
  brands: BrandRepository;
  clock: Clock;
}

/**
 * Edits the brand's voice, constraints, assets, and product facts (including
 * `approvedForAds` toggles and adding/editing/removing facts). Never touches
 * proposals, audiences, or briefs — brief editing has its own use case so
 * saving the brand can never silently affect an existing proposal thread.
 */
export function createUpdateBrand(deps: UpdateBrandDependencies) {
  return async function updateBrand(input: UpdateBrandInput): Promise<Result<Brand, UpdateBrandError>> {
    const current = await deps.brands.getById(input.clientId, input.brandId);
    if (!current) {
      return err({ kind: "brand_not_found" });
    }

    const invariantError = findHypothesisApprovedForAds(input.productFacts);
    if (invariantError) {
      return err(invariantError);
    }

    const updated: Brand = {
      ...current,
      voice: input.voice,
      constraints: input.constraints,
      assets: input.assets,
      productFacts: input.productFacts,
      updatedAt: deps.clock.now(),
    };

    await deps.brands.save(updated);
    return ok(updated);
  };
}
