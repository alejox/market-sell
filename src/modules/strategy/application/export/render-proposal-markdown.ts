import type { Proposal, ProposalState } from "@/modules/strategy/domain/proposal";
import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";
import type { Claim, ClaimBasis } from "@/modules/strategy/domain/claim";
import type { ProductFact } from "@/modules/clients/domain/brand";

export interface ProposalMarkdownContext {
  brandName: string;
  audienceSegmentName: string;
  /** Used to resolve a claim's or a source reference's fact id to its statement. */
  productFacts: ProductFact[];
}

const BASIS_LABELS: Record<ClaimBasis, string> = {
  fact: "Hecho",
  owner_input: "Dato del propietario",
  assumption: "Supuesto",
  hypothesis: "Hipótesis",
};

const STATE_LABELS: Record<ProposalState, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  changes_requested: "Cambios solicitados",
  approved: "Aprobado",
  archived: "Archivado",
};

function list(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- (ninguno)";
}

function factStatement(facts: Map<string, ProductFact>, factId: string): string {
  return facts.get(factId)?.statement ?? factId;
}

function claimLine(label: string, claim: Claim<string>, facts: Map<string, ProductFact>): string {
  const basisLabel = BASIS_LABELS[claim.basis];
  const citations = (claim.factIds ?? []).map((id) => factStatement(facts, id));
  const citation = citations.length > 0 ? ` _(Fuente: ${citations.join("; ")})_` : "";
  return `- **${label}:** ${claim.value} [${basisLabel}]${citation}`;
}

function renderHeader(proposal: Proposal, context: ProposalMarkdownContext): string {
  const lines: string[] = [
    `# Propuesta de campaña — ${context.brandName} · ${context.audienceSegmentName}`,
    "",
  ];

  if (proposal.state !== "approved") {
    lines.push("> **BORRADOR — NO APROBADO**", "");
  }

  lines.push(
    `**Versión:** ${proposal.version}${proposal.parentVersion !== null ? ` (a partir de la versión ${proposal.parentVersion})` : ""}`,
    `**Estado:** ${STATE_LABELS[proposal.state]}`,
  );

  if (proposal.state === "approved" && proposal.approvedBy && proposal.approvedAt) {
    lines.push(`**Aprobado por:** ${proposal.approvedBy} el ${proposal.approvedAt}`);
  }

  lines.push(
    proposal.generation
      ? `**Generado por:** ${proposal.generation.provider} / ${proposal.generation.model} el ${proposal.generation.generatedAt}`
      : "**Generado por:** (sin metadatos de generación)",
  );

  return lines.join("\n");
}

function renderContent(content: ProposalContent, facts: Map<string, ProductFact>): string {
  const sections: string[] = [];

  sections.push(
    [
      "## 1. Resumen del brief",
      "**Hechos usados:**",
      list(content.briefRecap.factsUsed.map((id) => factStatement(facts, id))),
      "",
      "**Supuestos usados:**",
      list(content.briefRecap.assumptionsUsed),
      "",
      "**Información faltante:**",
      list(content.briefRecap.missingInformation),
    ].join("\n"),
  );

  sections.push(
    [
      "## 2. Perspectiva de la audiencia",
      claimLine("Problema operativo", content.audienceInsight.operationalProblem, facts),
      claimLine("Resultado deseado", content.audienceInsight.desiredOutcome, facts),
      claimLine("Objeción probable", content.audienceInsight.likelyObjection, facts),
      claimLine("Ángulo del mensaje", content.audienceInsight.messageAngle, facts),
    ].join("\n"),
  );

  sections.push(
    [
      "## 3. Posicionamiento",
      claimLine("Promesa", content.positioning.promise, facts),
      "**Respaldo:**",
      content.positioning.supportingProof.map((proof) => claimLine("Respaldo", proof, facts)).join("\n") || "- (ninguno)",
      "",
      "**Palabras a evitar:**",
      list(content.positioning.wordingToAvoid),
    ].join("\n"),
  );

  sections.push(
    [
      "## 4. Concepto de campaña",
      `- **Objetivo:** ${content.campaignConcept.goal}`,
      `- **Audiencia objetivo:** ${content.campaignConcept.targetAudience}`,
      claimLine("Mensaje central", content.campaignConcept.coreMessage, facts),
      claimLine("Oferta / llamado a la acción", content.campaignConcept.offerOrCta, facts),
      "**Rol de cada canal:**",
      list(content.campaignConcept.channelRoles.map((c) => `${c.channel}: ${c.role}`)),
      `- **Duración recomendada:** ${content.campaignConcept.recommendedDurationWeeks} semana(s)`,
    ].join("\n"),
  );

  sections.push(
    [
      "## 5. Plan de contenido (4 semanas)",
      ...content.contentPlan
        .slice()
        .sort((a, b) => a.week - b.week)
        .map(
          (item) =>
            `- **Semana ${item.week}** (${item.format}) — ${item.purpose}. Tema: ${item.topic}. Hook: "${item.hook}". CTA: ${item.cta}. Activo requerido: ${item.requiredAsset}.`,
        ),
    ].join("\n"),
  );

  sections.push(
    [
      "## 6. Briefs creativos",
      ...content.creativeBriefs.map((brief) =>
        [
          `### ${brief.format}`,
          claimLine("Concepto", brief.concept, facts),
          `- **Dirección visual:** ${brief.visualDirection}`,
          `- **Texto en pantalla:** ${brief.onScreenText}`,
          `- **Borrador de caption:** ${brief.captionDraft}`,
          "- **Checklist de producción:**",
          list(brief.productionChecklist),
        ].join("\n"),
      ),
    ].join("\n\n"),
  );

  sections.push(
    [
      "## 7. Promoción pagada",
      `- **Objetivo:** ${content.paidPromotion.objective}`,
      claimLine("Hipótesis de audiencia", content.paidPromotion.audienceHypothesis, facts),
      "**Creatividades a probar:**",
      list(content.paidPromotion.creativeToTest),
      content.paidPromotion.budgetRange
        ? `- **Presupuesto:** ${content.paidPromotion.budgetRange.min} – ${content.paidPromotion.budgetRange.max} ${content.paidPromotion.budgetRange.currency}`
        : "- **Presupuesto:** no definido por el propietario",
      "**Checklist para ejecución manual:**",
      list(content.paidPromotion.humanChecklist),
    ].join("\n"),
  );

  sections.push(
    [
      "## 8. Plan de medición",
      "**Línea base necesaria:**",
      list(content.measurementPlan.baselineNeeded),
      "",
      "**Indicadores de alcance:**",
      list(content.measurementPlan.reachIndicators),
      "",
      "**Indicadores de interés calificado:**",
      list(content.measurementPlan.qualifiedInterestIndicators),
      "",
      `- **Frecuencia de revisión:** ${content.measurementPlan.reviewCadence}`,
      "**Qué decide cada métrica:**",
      list(content.measurementPlan.metricDecisions.map((m) => `${m.metric}: ${m.decisionInformed}`)),
    ].join("\n"),
  );

  sections.push(
    [
      "## 9. Riesgos y preguntas abiertas",
      "**Afirmaciones sin respaldo:**",
      list(content.risksAndOpenQuestions.unsupportedClaims),
      "",
      "**Activos faltantes:**",
      list(content.risksAndOpenQuestions.missingAssets),
      "",
      "**Segmentación poco clara:**",
      list(content.risksAndOpenQuestions.unclearTargeting),
      "",
      "**Supuestos a confirmar con el propietario:**",
      list(content.risksAndOpenQuestions.assumptionsToConfirm),
    ].join("\n"),
  );

  return sections.join("\n\n");
}

/**
 * Pure function: renders one proposal version as Markdown for manual
 * execution. Never touches I/O — the export route handler and the
 * print-friendly page both call this with data they already fetched.
 * Unapproved content always carries a prominent "BORRADOR — NO APROBADO"
 * marker; approved content states the approver and timestamp instead.
 */
export function renderProposalMarkdown(proposal: Proposal, context: ProposalMarkdownContext): string {
  const facts = new Map(context.productFacts.map((fact) => [fact.id, fact]));

  const sections = [
    renderHeader(proposal, context),
    renderContent(proposal.content, facts),
    [
      "## Referencias de origen",
      list(proposal.sourceReferences.map((ref) => (facts.has(ref) ? factStatement(facts, ref) : ref))),
    ].join("\n"),
  ];

  return sections.join("\n\n") + "\n";
}
