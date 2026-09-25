"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as container from "@/server/container";
import type { GenerationError } from "@/modules/strategy/application/ports/proposal-generator";
import type { ActionState } from "@/components/action-state";
import { requireOwner } from "@/shared/infrastructure/supabase/owner-auth";

export type { ActionState } from "@/components/action-state";

const GENERATION_ERROR_KINDS = new Set(["unavailable", "timeout", "provider_error", "invalid_output"]);

function isGenerationErrorKind(kind: string): kind is GenerationError["kind"] {
  return GENERATION_ERROR_KINDS.has(kind);
}

function describeGenerationError(error: GenerationError): string {
  switch (error.kind) {
    case "unavailable":
      return "La generación con IA no está disponible: configure GEMINI_API_KEY para habilitar la generación de propuestas.";
    case "timeout":
      return "El proveedor de IA no respondió a tiempo. Intente nuevamente en unos minutos.";
    case "provider_error":
      return `El proveedor de IA devolvió un error: ${error.message}`;
    case "invalid_output":
      return `La respuesta del modelo no cumplió el formato esperado: ${error.issues.join("; ")}`;
  }
}

const claimSchema = z.object({
  value: z.string().min(1),
  basis: z.enum(["fact", "owner_input", "assumption", "hypothesis"]),
  factIds: z.array(z.string()).optional(),
});

function parseJsonField<T>(formData: FormData, field: string, schema: z.ZodType<T>): T {
  const raw = formData.get(field);
  const parsed = JSON.parse(typeof raw === "string" && raw.length > 0 ? raw : "[]");
  return schema.parse(parsed);
}

const INVALID_FORM_STATE: ActionState = { status: "error", message: "Los datos del formulario no son válidos." };

/** Every field here is untrusted client input — a malformed payload must surface as a friendly error, never crash the action. */
async function guardFormInput(run: () => Promise<ActionState>): Promise<ActionState> {
  try {
    await requireOwner();
    return await run();
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return INVALID_FORM_STATE;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

const productFactSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  provenance: z.enum(["verified_website", "owner_provided", "hypothesis"]),
  sourceUrl: z.string().optional(),
  approvedForAds: z.boolean(),
});

export async function updateBrandAction(
  scope: { clientId: string; brandId: string },
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardFormInput(async () => {
    const voice = String(formData.get("voice") ?? "");
    const constraints = parseJsonField(formData, "constraintsJson", z.array(z.string()));
    const assets = parseJsonField(formData, "assetsJson", z.array(z.string()));
    const productFacts = parseJsonField(formData, "productFactsJson", z.array(productFactSchema));

    const result = await container.updateBrand({
      clientId: scope.clientId,
      brandId: scope.brandId,
      voice,
      constraints: constraints.filter((c) => c.trim().length > 0),
      assets: assets.filter((a) => a.trim().length > 0),
      productFacts,
    });

    if (!result.ok) {
      if (result.error.kind === "hypothesis_approved_for_ads") {
        return { status: "error", message: "Un hecho marcado como hipótesis no puede aprobarse para publicidad." };
      }
      return { status: "error", message: "No se encontró la marca." };
    }

    revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
    return { status: "success", message: "Marca actualizada correctamente." };
  });
}

// ---------------------------------------------------------------------------
// Audience
// ---------------------------------------------------------------------------

export async function updateAudienceAction(
  scope: { clientId: string; brandId: string },
  audienceId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardFormInput(async () => {
    const pains = parseJsonField(formData, "painsJson", z.array(claimSchema));
    const objections = parseJsonField(formData, "objectionsJson", z.array(claimSchema));
    const hypotheses = parseJsonField(formData, "hypothesesJson", z.array(z.string())).filter((h) => h.trim().length > 0);

    const result = await container.updateAudience({ scope, audienceId, pains, objections, hypotheses });

    if (!result.ok) {
      return { status: "error", message: "No se encontró la audiencia." };
    }

    revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
    return { status: "success", message: "Audiencia actualizada correctamente." };
  });
}

// ---------------------------------------------------------------------------
// Campaign brief
// ---------------------------------------------------------------------------

export async function updateCampaignBriefAction(
  scope: { clientId: string; brandId: string },
  briefId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardFormInput(async () => {
    const objective = String(formData.get("objective") ?? "");
    const timeframe = String(formData.get("timeframe") ?? "");
    const valueProposition = String(formData.get("valueProposition") ?? "");
    const missingInformation = parseJsonField(formData, "missingInformationJson", z.array(z.string())).filter(
      (m) => m.trim().length > 0,
    );

    const budgetMinRaw = String(formData.get("budgetMin") ?? "").trim();
    const budgetMaxRaw = String(formData.get("budgetMax") ?? "").trim();
    const budgetRange =
      budgetMinRaw.length > 0 && budgetMaxRaw.length > 0
        ? { min: Number(budgetMinRaw), max: Number(budgetMaxRaw), currency: "COP" }
        : null;

    const result = await container.updateCampaignBrief({
      scope,
      briefId,
      objective,
      timeframe,
      valueProposition,
      budgetRange,
      missingInformation,
    });

    if (!result.ok) {
      return { status: "error", message: "No se encontró el brief de campaña." };
    }

    revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
    return { status: "success", message: "Brief de campaña actualizado correctamente." };
  });
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export async function generateProposalAction(
  scope: { clientId: string; brandId: string },
  briefId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const result = await container.generateProposal({ scope, briefId });

  if (!result.ok) {
    if (isGenerationErrorKind(result.error.kind)) {
      return { status: "error", message: describeGenerationError(result.error as GenerationError) };
    }
    return { status: "error", message: "No se encontró el brief, la audiencia o la marca." };
  }

  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
  redirect(`/c/${scope.clientId}/b/${scope.brandId}/proposals/${result.value.id}`);
}

export async function reviseProposalAction(
  scope: { clientId: string; brandId: string },
  proposalId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const feedback = String(formData.get("feedback") ?? "");

  if (feedback.trim().length === 0) {
    return { status: "error", message: "La retroalimentación es obligatoria para solicitar cambios." };
  }

  const result = await container.reviseProposal({
    scope,
    proposalId,
    feedback,
    reviewer: container.currentOwnerName(),
  });

  if (!result.ok) {
    if (result.error.kind === "feedback_required") {
      return { status: "error", message: "La retroalimentación es obligatoria para solicitar cambios." };
    }
    if (result.error.kind === "invalid_transition") {
      return { status: "error", message: "Esta propuesta ya no admite solicitar cambios en su estado actual." };
    }
    if (isGenerationErrorKind(result.error.kind)) {
      return { status: "error", message: describeGenerationError(result.error as GenerationError) };
    }
    return { status: "error", message: "No se pudo generar la revisión." };
  }

  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
  redirect(`/c/${scope.clientId}/b/${scope.brandId}/proposals/${result.value.id}`);
}

export async function iterateFromApprovedAction(
  scope: { clientId: string; brandId: string },
  proposalId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const result = await container.iterateFromApproved({ scope, proposalId });

  if (!result.ok) {
    if (result.error.kind === "invalid_transition") {
      return { status: "error", message: "Solo se puede iniciar una nueva iteración desde una versión aprobada." };
    }
    if (isGenerationErrorKind(result.error.kind)) {
      return { status: "error", message: describeGenerationError(result.error as GenerationError) };
    }
    return { status: "error", message: "No se pudo iniciar la nueva iteración." };
  }

  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
  redirect(`/c/${scope.clientId}/b/${scope.brandId}/proposals/${result.value.id}`);
}

// ---------------------------------------------------------------------------
// Review workflow
// ---------------------------------------------------------------------------

export async function submitForReviewAction(
  scope: { clientId: string; brandId: string },
  proposalId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const result = await container.submitForReview({ scope, proposalId });

  if (!result.ok) {
    return { status: "error", message: "No se pudo enviar la propuesta a revisión." };
  }

  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}/proposals/${proposalId}`);
  return { status: "success", message: "Propuesta enviada a revisión." };
}

export async function approveProposalAction(
  scope: { clientId: string; brandId: string },
  proposalId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const result = await container.approveProposal({ scope, proposalId });

  if (!result.ok) {
    return { status: "error", message: "No se pudo aprobar la propuesta." };
  }

  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}/proposals/${proposalId}`);
  return { status: "success", message: `Propuesta aprobada por ${container.currentOwnerName()}.` };
}

export async function archiveProposalAction(
  scope: { clientId: string; brandId: string },
  proposalId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const result = await container.archiveProposal({ scope, proposalId });

  if (!result.ok) {
    return { status: "error", message: "No se pudo archivar la propuesta." };
  }

  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
  revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}/proposals/${proposalId}`);
  return { status: "success", message: "Propuesta archivada." };
}

// ---------------------------------------------------------------------------
// Learning loop
// ---------------------------------------------------------------------------

const metricSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
});

export async function recordResultSnapshotAction(
  scope: { clientId: string; brandId: string },
  proposalId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardFormInput(async () => {
    const periodFrom = String(formData.get("periodFrom") ?? "");
    const periodTo = String(formData.get("periodTo") ?? "");
    const notes = String(formData.get("notes") ?? "");
    const source = z.enum(["manual_owner_entry", "manual_meta_export", "manual_other"]).parse(formData.get("source"));
    const metrics = parseJsonField(formData, "metricsJson", z.array(metricSchema)).filter((m) => m.name.trim().length > 0);

    if (!periodFrom || !periodTo) {
      return { status: "error", message: "Indique el período (inicio y fin) del resultado." };
    }

    const result = await container.recordResultSnapshot({
      scope,
      proposalId,
      period: { from: periodFrom, to: periodTo },
      metrics,
      notes,
      source,
      recordedBy: container.currentOwnerName(),
    });

    if (!result.ok) {
      return { status: "error", message: "No se encontró la propuesta asociada." };
    }

    revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}`);
    revalidatePath(`/c/${scope.clientId}/b/${scope.brandId}/proposals/${proposalId}`);
    return { status: "success", message: "Resultado registrado manualmente." };
  });
}
