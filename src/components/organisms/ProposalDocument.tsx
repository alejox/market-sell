import type { ReactNode } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Card } from "@/components/atoms/Card";
import { ClaimText } from "@/components/molecules/ClaimText";
import { CONTENT_FORMAT_LABELS, PROPOSAL_STATE_LABELS, PROPOSAL_STATE_TONES } from "@/components/labels";
import type { Proposal } from "@/modules/strategy/domain/proposal";
import type { ProductFact } from "@/modules/clients/domain/brand";

const SECTIONS = [
  { id: "brief", label: "Brief" },
  { id: "audience", label: "Audiencia" },
  { id: "positioning", label: "Posicionamiento" },
  { id: "concept", label: "Concepto" },
  { id: "content", label: "Contenido" },
  { id: "creative", label: "Creatividad" },
  { id: "promotion", label: "Promoción" },
  { id: "measurement", label: "Medición" },
  { id: "risks", label: "Riesgos" },
] as const;

function PhaseLabel({ number, children }: { number: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-border pt-6">
      <span className="text-xs font-medium tracking-wider text-muted-on">{number}</span>
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-on">{children}</p>
    </div>
  );
}

/**
 * Renders every section of §4 of the spec for one proposal version. Used by
 * both the interactive proposal page and the print-friendly page — this
 * component does no I/O, it only presents data it is given.
 */
export function ProposalDocument({
  proposal,
  brandName,
  audienceSegmentName,
  productFacts,
  showHeader = true,
}: {
  proposal: Proposal;
  brandName: string;
  audienceSegmentName: string;
  productFacts: ProductFact[];
  showHeader?: boolean;
}) {
  const facts = new Map(productFacts.map((fact) => [fact.id, fact]));
  const content = proposal.content;

  return (
    <article className="flex min-w-0 flex-col gap-6">
      {showHeader && (
        <header className="flex flex-col gap-3 border-b border-border pb-6">
          <h1 className="text-3xl text-on-surface">{brandName} · {audienceSegmentName}</h1>
          {proposal.state !== "approved" && !proposal.approvedBy && (
            <p className="w-fit rounded-full border border-warning bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
              SIN APROBACIÓN REGISTRADA
            </p>
          )}
          {proposal.state === "archived" && proposal.approvedBy && (
            <p className="text-sm text-muted-on">Versión archivada · aprobación histórica por {proposal.approvedBy} el {proposal.approvedAt}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-on">
            <span>Versión {proposal.version}</span>
            <Badge tone={PROPOSAL_STATE_TONES[proposal.state]}>{PROPOSAL_STATE_LABELS[proposal.state]}</Badge>
            {proposal.state === "approved" && proposal.approvedBy && (
              <span>Aprobado por {proposal.approvedBy} el {proposal.approvedAt}</span>
            )}
            {proposal.generation && (
              <span>Generado por {proposal.generation.provider} / {proposal.generation.model} el {proposal.generation.generatedAt}</span>
            )}
          </div>
        </header>
      )}

      <nav aria-label="Secciones de la propuesta" className="sticky top-0 z-10 -mx-1 overflow-x-auto border-b border-border bg-surface/95 px-1 py-3 backdrop-blur-sm print:hidden">
        <div className="flex w-max gap-2">
          {SECTIONS.map((section, index) => (
            <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-border bg-surface-raised px-3 text-xs font-medium text-on-surface hover:bg-muted">
              <span className="mr-1 text-muted-on">{index + 1}.</span> {section.label}
            </a>
          ))}
        </div>
      </nav>

      <PhaseLabel number="01 / 04">Fundamentos</PhaseLabel>

      <div id="brief" className="scroll-mt-24">
        <Card title="1. Resumen del brief">
          <p className="text-sm font-medium text-on-surface">Hechos usados</p>
          <ul className="list-inside list-disc text-sm text-muted-on">
            {content.briefRecap.factsUsed.map((id, i) => (
              <li key={i}>{facts.get(id)?.statement ?? id}</li>
            ))}
          </ul>
          {content.briefRecap.assumptionsUsed.length > 0 && (
            <>
              <p className="text-sm font-medium text-on-surface">Supuestos usados</p>
              <ul className="list-inside list-disc text-sm text-muted-on">
                {content.briefRecap.assumptionsUsed.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
          {content.briefRecap.missingInformation.length > 0 && (
            <>
              <p className="text-sm font-medium text-danger">Información faltante</p>
              <ul className="list-inside list-disc text-sm text-danger">
                {content.briefRecap.missingInformation.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div id="audience" className="scroll-mt-24">
        <Card title="2. Perspectiva de la audiencia">
          <ClaimText claim={content.audienceInsight.operationalProblem} facts={facts} />
          <ClaimText claim={content.audienceInsight.desiredOutcome} facts={facts} />
          <ClaimText claim={content.audienceInsight.likelyObjection} facts={facts} />
          <ClaimText claim={content.audienceInsight.messageAngle} facts={facts} />
        </Card>
      </div>

      <PhaseLabel number="02 / 04">Estrategia</PhaseLabel>
      <div id="positioning" className="scroll-mt-24">
        <Card title="3. Posicionamiento">
          <ClaimText claim={content.positioning.promise} facts={facts} />
          <p className="text-sm font-medium text-on-surface">Respaldo</p>
          {content.positioning.supportingProof.map((proof, i) => (
            <ClaimText key={i} claim={proof} facts={facts} />
          ))}
          {content.positioning.wordingToAvoid.length > 0 && (
            <>
              <p className="text-sm font-medium text-on-surface">Palabras a evitar</p>
              <p className="text-sm text-muted-on">{content.positioning.wordingToAvoid.join(", ")}</p>
            </>
          )}
        </Card>
      </div>

      <div id="concept" className="scroll-mt-24">
        <Card title="4. Concepto de campaña">
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-on-surface">Objetivo</dt>
              <dd className="text-muted-on">{content.campaignConcept.goal}</dd>
            </div>
            <div>
              <dt className="font-medium text-on-surface">Audiencia objetivo</dt>
              <dd className="text-muted-on">{content.campaignConcept.targetAudience}</dd>
            </div>
            <div>
              <dt className="font-medium text-on-surface">Duración recomendada</dt>
              <dd className="text-muted-on">{content.campaignConcept.recommendedDurationWeeks} semana(s)</dd>
            </div>
          </dl>
          <ClaimText claim={content.campaignConcept.coreMessage} facts={facts} />
          <ClaimText claim={content.campaignConcept.offerOrCta} facts={facts} />
          <p className="text-sm font-medium text-on-surface">Rol de cada canal</p>
          <ul className="list-inside list-disc text-sm text-muted-on">
            {content.campaignConcept.channelRoles.map((c, i) => (
              <li key={i}>
                {c.channel}: {c.role}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <PhaseLabel number="03 / 04">Activación propuesta</PhaseLabel>
      <div id="content" className="scroll-mt-24">
        <Card title="5. Plan de contenido (4 semanas)">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...content.contentPlan]
              .sort((a, b) => a.week - b.week)
              .map((item, i) => (
                <div key={i} className="rounded-2xl bg-muted p-4 text-sm">
                  <p className="font-medium text-on-surface">
                    Semana {item.week} · {CONTENT_FORMAT_LABELS[item.format] ?? item.format}
                  </p>
                  <p className="text-muted-on">Propósito: {item.purpose}</p>
                  <p className="text-muted-on">Tema: {item.topic}</p>
                  <p className="text-muted-on">Hook: “{item.hook}”</p>
                  <p className="text-muted-on">CTA: {item.cta}</p>
                  <p className="text-muted-on">Activo requerido: {item.requiredAsset}</p>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div id="creative" className="scroll-mt-24">
        <Card title="6. Briefs creativos">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {content.creativeBriefs.map((brief, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-2xl bg-muted p-4 text-sm">
                <p className="font-medium text-on-surface">{CONTENT_FORMAT_LABELS[brief.format] ?? brief.format}</p>
                <ClaimText claim={brief.concept} facts={facts} />
                <p className="text-muted-on">Dirección visual: {brief.visualDirection}</p>
                <p className="text-muted-on">Texto en pantalla: {brief.onScreenText}</p>
                <p className="text-muted-on">Caption: {brief.captionDraft}</p>
                <p className="font-medium text-on-surface">Checklist de producción</p>
                <ul className="list-inside list-disc text-muted-on">
                  {brief.productionChecklist.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div id="promotion" className="scroll-mt-24">
        <Card title="7. Promoción pagada">
          <p className="text-sm text-on-surface">
            <span className="font-medium">Objetivo:</span> {content.paidPromotion.objective}
          </p>
          <ClaimText claim={content.paidPromotion.audienceHypothesis} facts={facts} />
          <p className="text-sm font-medium text-on-surface">Creatividades a probar</p>
          <ul className="list-inside list-disc text-sm text-muted-on">
            {content.paidPromotion.creativeToTest.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <p className="text-sm text-on-surface">
            <span className="font-medium">Presupuesto:</span>{" "}
            {content.paidPromotion.budgetRange
              ? `${content.paidPromotion.budgetRange.min.toLocaleString("es-CO")} – ${content.paidPromotion.budgetRange.max.toLocaleString("es-CO")} ${content.paidPromotion.budgetRange.currency}`
              : "No definido por el propietario"}
          </p>
          <p className="text-sm font-medium text-on-surface">Checklist para ejecución manual</p>
          <ul className="list-inside list-disc text-sm text-muted-on">
            {content.paidPromotion.humanChecklist.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Card>
      </div>

      <PhaseLabel number="04 / 04">Evaluación</PhaseLabel>
      <div id="measurement" className="scroll-mt-24">
        <Card title="8. Plan de medición">
          <p className="text-sm text-on-surface">
            <span className="font-medium">Frecuencia de revisión:</span> {content.measurementPlan.reviewCadence}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-on-surface">Línea base necesaria</p>
              <ul className="list-inside list-disc text-sm text-muted-on">
                {content.measurementPlan.baselineNeeded.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Indicadores de alcance</p>
              <ul className="list-inside list-disc text-sm text-muted-on">
                {content.measurementPlan.reachIndicators.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">Indicadores de interés calificado</p>
              <ul className="list-inside list-disc text-sm text-muted-on">
                {content.measurementPlan.qualifiedInterestIndicators.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-sm font-medium text-on-surface">Qué decide cada métrica</p>
          <ul className="list-inside list-disc text-sm text-muted-on">
            {content.measurementPlan.metricDecisions.map((m, i) => (
              <li key={i}>
                {m.metric}: {m.decisionInformed}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div id="risks" className="scroll-mt-24">
        <Card title="9. Riesgos y preguntas abiertas">
          {content.risksAndOpenQuestions.unsupportedClaims.length > 0 && (
            <>
              <p className="text-sm font-medium text-danger">Afirmaciones sin respaldo</p>
              <ul className="list-inside list-disc text-sm text-danger">
                {content.risksAndOpenQuestions.unsupportedClaims.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}
          {content.risksAndOpenQuestions.missingAssets.length > 0 && (
            <>
              <p className="text-sm font-medium text-on-surface">Activos faltantes</p>
              <ul className="list-inside list-disc text-sm text-muted-on">
                {content.risksAndOpenQuestions.missingAssets.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </>
          )}
          {content.risksAndOpenQuestions.unclearTargeting.length > 0 && (
            <>
              <p className="text-sm font-medium text-on-surface">Segmentación poco clara</p>
              <ul className="list-inside list-disc text-sm text-muted-on">
                {content.risksAndOpenQuestions.unclearTargeting.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </>
          )}
          {content.risksAndOpenQuestions.assumptionsToConfirm.length > 0 && (
            <>
              <p className="text-sm font-medium text-warning">Supuestos a confirmar con el propietario</p>
              <ul className="list-inside list-disc text-sm text-warning">
                {content.risksAndOpenQuestions.assumptionsToConfirm.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </article>
  );
}
