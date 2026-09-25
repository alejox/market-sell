import type { Claim } from "./claim";

/**
 * One campaign audience track (e.g. "Stores" or "Barbershops and beauty
 * salons"). Kept as a separate track per spec — never merged with another
 * audience's strategy.
 */
export interface Audience {
  id: string;
  clientId: string;
  brandId: string;
  segmentName: string;
  geography: string;
  pains: Claim<string>[];
  objections: Claim<string>[];
  hypotheses: string[];
  createdAt: string;
  updatedAt: string;
}
