import type { Result } from "@/shared/result";
import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";

/** No provider is configured (e.g. missing API key). The caller must show a visible "unavailable" state, never a template. */
export interface UnavailableGenerationError {
  kind: "unavailable";
}

/** The provider did not respond within the generator's timeout budget. */
export interface TimeoutGenerationError {
  kind: "timeout";
}

/** The provider call failed for a reason other than availability or timeout (network, quota, malformed request, etc.). */
export interface ProviderGenerationError {
  kind: "provider_error";
  message: string;
}

/** The provider responded, but its output did not validate against `proposalContentSchema`, even after one repair retry. */
export interface InvalidOutputGenerationError {
  kind: "invalid_output";
  /** Human-readable zod issue summaries (path + message), not raw ZodError objects. */
  issues: string[];
}

export type GenerationError =
  | UnavailableGenerationError
  | TimeoutGenerationError
  | ProviderGenerationError
  | InvalidOutputGenerationError;

/**
 * Provider-agnostic strategy content generator. `prompt` is the fully
 * assembled, already-delimited prompt text produced by
 * `buildProposalPrompt` — this port knows nothing about brands, audiences,
 * or briefs, so the concrete provider (Gemini today, something else later)
 * can be swapped behind it without touching application code.
 */
export interface ProposalGenerator {
  /** e.g. "gemini". Recorded on the persisted Proposal as generator metadata. */
  readonly providerName: string;
  /** The concrete model id in use, e.g. "gemini-3.8-flash". Recorded on the persisted Proposal. */
  readonly modelId: string;
  generate(prompt: string): Promise<Result<ProposalContent, GenerationError>>;
  /** True when the provider has everything it needs (e.g. an API key) — checked without making a network call. */
  isAvailable(): boolean;
}
