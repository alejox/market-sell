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
