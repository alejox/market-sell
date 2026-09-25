import { z } from "zod";

/**
 * How a piece of strategic or proposal content is grounded:
 * - fact: a verified product/brand fact (see ProductFact.provenance).
 * - owner_input: stated directly by the owner (brief, feedback).
 * - assumption: a reasonable working assumption made explicit.
 * - hypothesis: an untested guess that must be labeled as such, never
 *   presented as established.
 */
export type ClaimBasis = "fact" | "owner_input" | "assumption" | "hypothesis";

export const claimBasisSchema = z.enum(["fact", "owner_input", "assumption", "hypothesis"]);

/** A value paired with its provenance, and optionally the fact ids it relies on. */
export interface Claim<T> {
  value: T;
  basis: ClaimBasis;
  factIds?: string[];
}

export function claimSchema<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    value: valueSchema,
    basis: claimBasisSchema,
    factIds: z.array(z.string()).optional(),
  });
}
