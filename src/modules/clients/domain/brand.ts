/**
 * Provenance of a product fact. Only `verified_website` and `owner_provided`
 * facts may ever be marked `approvedForAds: true`; a `hypothesis` must stay
 * unapproved until confirmed by the owner.
 */
export type FactProvenance = "verified_website" | "owner_provided" | "hypothesis";

export interface ProductFact {
  id: string;
  statement: string;
  provenance: FactProvenance;
  /** Present when provenance is "verified_website". */
  sourceUrl?: string;
  approvedForAds: boolean;
}

export interface Brand {
  id: string;
  clientId: string;
  name: string;
  website: string;
  productFacts: ProductFact[];
  voice: string;
  constraints: string[];
  /** Free-text description of assets the owner has available (logo, photos, etc.). */
  assets: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HypothesisApprovedForAdsError {
  kind: "hypothesis_approved_for_ads";
  factId: string;
}

/**
 * Domain invariant: a `hypothesis` fact must never be cleared for ad use.
 * Returns the first offending fact id, or null when every fact respects the
 * rule. Callers (use cases) must check this before persisting brand edits.
 */
export function findHypothesisApprovedForAds(facts: ProductFact[]): HypothesisApprovedForAdsError | null {
  const offending = facts.find((fact) => fact.provenance === "hypothesis" && fact.approvedForAds);
  return offending ? { kind: "hypothesis_approved_for_ads", factId: offending.id } : null;
}
