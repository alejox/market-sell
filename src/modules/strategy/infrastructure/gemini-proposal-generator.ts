/**
 * SERVER-ONLY. This adapter reads `GEMINI_API_KEY` and calls the Gemini API
 * directly — it must never be imported from a Client Component or any code
 * that ships to the browser. The `server-only` package is not installed in
 * this project (verified: absent from node_modules and package-lock.json),
 * so this boundary is enforced by convention instead: only
 * `src/server/container.ts` (itself server-only) constructs this class.
 */
import { GoogleGenAI, type Content } from "@google/genai";
import { err, ok, type Result } from "@/shared/result";
import {
  getProposalContentJsonSchema,
  proposalContentSchema,
  type ProposalContent,
} from "@/modules/strategy/domain/proposal-content.schema";
import type { GenerationError, ProposalGenerator } from "@/modules/strategy/application/ports/proposal-generator";

const DEFAULT_MODEL = "gemini-3.8-flash";
/** Verified via node_modules/@google/genai/dist/node/node.d.ts: GenerateContentConfig.abortSignal is supported per-request. */
const TIMEOUT_MS = 60_000;

interface ZodIssueLike {
  path: readonly PropertyKey[];
  message: string;
}

function summarizeIssues(issues: readonly ZodIssueLike[]): string[] {
  return issues.map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`);
}

function buildRepairInstruction(issues: readonly string[]): string {
  return [
    "Your previous response did not match the required schema. Fix ONLY these validation issues and",
    "respond again with a single corrected JSON object, output JSON only, no surrounding prose:",
    ...issues.map((issue) => `- ${issue}`),
  ].join("\n");
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

function describeProviderError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

interface ModelAttempt {
  raw: string;
}

/**
 * One generation attempt's outcome: `outcome` is the typed Result the port
 * exposes; `raw` is the model's raw text (kept even on a validation failure
 * so the single repair retry can echo it back as prior conversation turns).
 */
interface AttemptOutcome {
  outcome: Result<ProposalContent, GenerationError>;
  raw: string | null;
}

export class GeminiProposalGenerator implements ProposalGenerator {
  readonly providerName = "gemini";
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private client: GoogleGenAI | null = null;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    this.model = options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  }

  isAvailable(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  get modelId(): string {
    return this.model;
  }

  async generate(prompt: string): Promise<Result<ProposalContent, GenerationError>> {
    if (!this.isAvailable()) {
      return err({ kind: "unavailable" });
    }

    const client = this.client ?? (this.client = new GoogleGenAI({ apiKey: this.apiKey }));
    const jsonSchema = getProposalContentJsonSchema();

    const first = await this.attempt(client, prompt, jsonSchema);
    if (first.outcome.ok || first.outcome.error.kind !== "invalid_output") {
      return first.outcome;
    }

    // Exactly one repair retry: echo the model's own malformed response back
    // as conversation history, then ask it to fix only the reported issues.
    const repairContents: Content[] = [
      { role: "user", parts: [{ text: prompt }] },
      ...(first.raw ? [{ role: "model" as const, parts: [{ text: first.raw }] }] : []),
      { role: "user", parts: [{ text: buildRepairInstruction(first.outcome.error.issues) }] },
    ];
    const retry = await this.attempt(client, repairContents, jsonSchema);
    return retry.outcome;
  }

  private async attempt(
    client: GoogleGenAI,
    contents: string | Content[],
    jsonSchema: unknown,
  ): Promise<AttemptOutcome> {
    const call = await this.callModel(client, contents, jsonSchema);
    if (!call.ok) {
      return { outcome: err(call.error), raw: null };
    }

    const { raw } = call.value;
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return { outcome: err({ kind: "invalid_output", issues: ["Response was not valid JSON."] }), raw };
    }

    const validated = proposalContentSchema.safeParse(parsedJson);
    if (validated.success) {
      return { outcome: ok(validated.data), raw };
    }
    return { outcome: err({ kind: "invalid_output", issues: summarizeIssues(validated.error.issues) }), raw };
  }

  private async callModel(
    client: GoogleGenAI,
    contents: string | Content[],
    jsonSchema: unknown,
  ): Promise<Result<ModelAttempt, GenerationError>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await client.models.generateContent({
        model: this.model,
        contents,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          abortSignal: controller.signal,
        },
      });
      const raw = response.text;
      if (typeof raw !== "string" || raw.trim().length === 0) {
        return err({ kind: "provider_error", message: "Gemini returned an empty response." });
      }
      return ok({ raw });
    } catch (error) {
      if (isAbortError(error)) {
        return err({ kind: "timeout" });
      }
      return err({ kind: "provider_error", message: describeProviderError(error) });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
