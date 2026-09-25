import { z } from "zod";
import { claimSchema } from "./claim";
import { sanitizeForGemini } from "./json-schema-sanitizer";

/** 1. Brief recap: what the generation was grounded on, and what is missing. */
const briefRecapSchema = z.object({
  factsUsed: z.array(z.string()),
  assumptionsUsed: z.array(z.string()),
  missingInformation: z.array(z.string()),
});

/** 2. Audience insight: the operational problem behind the strategy. */
const audienceInsightSchema = z.object({
  operationalProblem: claimSchema(z.string()),
  desiredOutcome: claimSchema(z.string()),
  likelyObjection: claimSchema(z.string()),
  messageAngle: claimSchema(z.string()),
});

/** 3. Positioning: one promise, its proof, and language to avoid. */
const positioningSchema = z.object({
  promise: claimSchema(z.string()),
  supportingProof: z.array(claimSchema(z.string())),
  wordingToAvoid: z.array(z.string()),
});

/** 4. Campaign concept: the shape of the campaign. */
const campaignConceptSchema = z.object({
  goal: z.string(),
  targetAudience: z.string(),
  coreMessage: claimSchema(z.string()),
  offerOrCta: claimSchema(z.string()),
  channelRoles: z.array(
    z.object({
      channel: z.enum(["instagram", "facebook"]),
      role: z.string(),
    }),
  ),
  recommendedDurationWeeks: z.number().int().positive(),
});

/** 5. Content plan: a practical four-week calendar. */
const contentPlanItemSchema = z.object({
  week: z.number().int().min(1).max(4),
  purpose: z.string(),
  format: z.enum(["short_video", "carousel", "static_or_story"]),
  topic: z.string(),
  hook: z.string(),
  cta: z.string(),
  requiredAsset: z.string(),
});

const contentPlanSchema = z
  .array(contentPlanItemSchema)
  .min(4)
  .refine((items) => [1, 2, 3, 4].every((week) => items.some((item) => item.week === week)), {
    message: "Content plan must include at least one item for each of the four weeks.",
  });

/** 6. Creative briefs: at least one of each required format. */
const creativeBriefSchema = z.object({
  format: z.enum(["short_video", "carousel", "static_or_story"]),
  concept: claimSchema(z.string()),
  visualDirection: z.string(),
  onScreenText: z.string(),
  captionDraft: z.string(),
  productionChecklist: z.array(z.string()).min(1),
});

const creativeBriefsSchema = z
  .array(creativeBriefSchema)
  .min(3)
  .refine(
    (briefs) => {
      const formats = new Set(briefs.map((brief) => brief.format));
      return formats.has("short_video") && formats.has("carousel") && formats.has("static_or_story");
    },
    {
      message:
        "Creative briefs must include at least one short_video, one carousel, and one static_or_story concept.",
    },
  );

/** 7. Paid promotion guidance. Budget only ever comes from the owner. */
const paidPromotionSchema = z.object({
  objective: z.string(),
  audienceHypothesis: claimSchema(z.string()),
  creativeToTest: z.array(z.string()).min(1),
  budgetRange: z
    .object({
      min: z.number().nonnegative(),
      max: z.number().nonnegative(),
      currency: z.string(),
    })
    .nullable(),
  humanChecklist: z.array(z.string()).min(1),
});

/** 8. Measurement plan. */
const metricDecisionSchema = z.object({
  metric: z.string(),
  decisionInformed: z.string(),
});

const measurementPlanSchema = z.object({
  baselineNeeded: z.array(z.string()),
  reachIndicators: z.array(z.string()),
  qualifiedInterestIndicators: z.array(z.string()),
  reviewCadence: z.string(),
  metricDecisions: z.array(metricDecisionSchema).min(1),
});

/** 9. Risks and open questions. */
const risksAndOpenQuestionsSchema = z.object({
  unsupportedClaims: z.array(z.string()),
  missingAssets: z.array(z.string()),
  unclearTargeting: z.array(z.string()),
  assumptionsToConfirm: z.array(z.string()),
});

export const proposalContentSchema = z.object({
  briefRecap: briefRecapSchema,
  audienceInsight: audienceInsightSchema,
  positioning: positioningSchema,
  campaignConcept: campaignConceptSchema,
  contentPlan: contentPlanSchema,
  creativeBriefs: creativeBriefsSchema,
  paidPromotion: paidPromotionSchema,
  measurementPlan: measurementPlanSchema,
  risksAndOpenQuestions: risksAndOpenQuestionsSchema,
});

export type ProposalContent = z.infer<typeof proposalContentSchema>;

/**
 * JSON Schema for the proposal content, sanitized for Gemini structured
 * output (no `$schema`, `$ref`/`$defs`, or `additionalProperties`; zod's
 * nullable `anyOf` pattern collapsed to the `nullable` keyword). Computed
 * lazily so importing the zod schema never pays for schema generation.
 */
export function getProposalContentJsonSchema(): unknown {
  return sanitizeForGemini(z.toJSONSchema(proposalContentSchema));
}
