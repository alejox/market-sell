/**
 * Shared fixtures for the generation use-case tests. Not itself a test file
 * (no assertions), so `npm test`'s `*.test.ts` glob skips it.
 */
import type { Clock } from "@/shared/application/ports/clock";
import type { IdGenerator } from "@/shared/application/ports/id-generator";
import type { Result } from "@/shared/result";
import type { Brand } from "@/modules/clients/domain/brand";
import type { Audience } from "@/modules/strategy/domain/audience";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";
import type { ProposalContent } from "@/modules/strategy/domain/proposal-content.schema";
import type { GenerationError, ProposalGenerator } from "@/modules/strategy/application/ports/proposal-generator";

export const SCOPE = { clientId: "client-1", brandId: "brand-1" };

export function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: SCOPE.brandId,
    clientId: SCOPE.clientId,
    name: "Ventex",
    website: "https://www.ventex.app/",
    productFacts: [
      {
        id: "fact-1",
        statement: "Ventex actualiza el inventario en tiempo real.",
        provenance: "verified_website",
        sourceUrl: "https://www.ventex.app/",
        approvedForAds: false,
      },
    ],
    voice: "Cercano y profesional.",
    constraints: ["No prometer resultados de ventas."],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeAudience(overrides: Partial<Audience> = {}): Audience {
  return {
    id: "audience-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    segmentName: "Tiendas / comercio minorista",
    geography: "Colombia",
    pains: [{ value: "Pierden ventas por falta de inventario.", basis: "hypothesis" }],
    objections: [{ value: "Ya usan Excel.", basis: "hypothesis" }],
    hypotheses: ["El dueño decide y usa el sistema personalmente."],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeBrief(overrides: Partial<CampaignBrief> = {}): CampaignBrief {
  return {
    id: "brief-1",
    clientId: SCOPE.clientId,
    brandId: SCOPE.brandId,
    audienceId: "audience-1",
    objective: "Mejorar posicionamiento en Instagram y Facebook.",
    timeframe: "4 semanas",
    valueProposition: "Control de ventas, inventario y finanzas en un solo lugar.",
    budgetRange: null,
    missingInformation: ["Presupuesto publicitario mensual."],
    createdBy: "Owner",
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/** A minimal but schema-shaped ProposalContent — every claim tagged, all 9 sections present. */
export function makeProposalContent(overrides: Partial<ProposalContent> = {}): ProposalContent {
  return {
    briefRecap: { factsUsed: ["fact-1"], assumptionsUsed: [], missingInformation: [] },
    audienceInsight: {
      operationalProblem: { value: "Pierden ventas por falta de inventario.", basis: "hypothesis" },
      desiredOutcome: { value: "Controlar el inventario en tiempo real.", basis: "fact", factIds: ["fact-1"] },
      likelyObjection: { value: "Ya usan Excel.", basis: "hypothesis" },
      messageAngle: { value: "Deja de perder ventas por falta de control.", basis: "assumption" },
    },
    positioning: {
      promise: { value: "Controla tu negocio en tiempo real.", basis: "fact", factIds: ["fact-1"] },
      supportingProof: [{ value: "Actualización de inventario en tiempo real.", basis: "fact", factIds: ["fact-1"] }],
      wordingToAvoid: ["el mejor", "garantizado"],
    },
    campaignConcept: {
      goal: "Aumentar el reconocimiento de marca entre tiendas.",
      targetAudience: "Tiendas de comercio minorista en Colombia.",
      coreMessage: { value: "Tu negocio, bajo control.", basis: "fact", factIds: ["fact-1"] },
      offerOrCta: { value: "Conoce Ventex.", basis: "assumption" },
      channelRoles: [
        { channel: "instagram", role: "Alcance y descubrimiento." },
        { channel: "facebook", role: "Retención y comunidad." },
      ],
      recommendedDurationWeeks: 4,
    },
    contentPlan: [
      { week: 1, purpose: "Awareness", format: "short_video", topic: "El problema", hook: "¿Pierdes ventas?", cta: "Conoce más", requiredAsset: "video" },
      { week: 2, purpose: "Educación", format: "carousel", topic: "Cómo ayuda Ventex", hook: "Así funciona", cta: "Agenda una demo", requiredAsset: "carrusel" },
      { week: 3, purpose: "Prueba social", format: "static_or_story", topic: "Casos de uso", hook: "Así lo usan otros", cta: "Escríbenos", requiredAsset: "imagen" },
      { week: 4, purpose: "Conversión", format: "short_video", topic: "Llamado a la acción", hook: "Empieza hoy", cta: "Solicita acceso", requiredAsset: "video" },
    ],
    creativeBriefs: [
      {
        format: "short_video",
        concept: { value: "Un dueño de tienda revisando su inventario desde el celular.", basis: "assumption" },
        visualDirection: "Plano cercano al celular y al mostrador.",
        onScreenText: "Tu inventario, siempre al día.",
        captionDraft: "Controla tu negocio desde donde estés.",
        productionChecklist: ["Grabar en tienda real", "Autorización del dueño"],
      },
      {
        format: "carousel",
        concept: { value: "Antes/después del control de inventario.", basis: "assumption" },
        visualDirection: "Contraste visual claro entre desorden y orden.",
        onScreenText: "Del caos al control.",
        captionDraft: "Así se ve un negocio organizado.",
        productionChecklist: ["Definir 4 slides"],
      },
      {
        format: "static_or_story",
        concept: { value: "Cita de un dueño de tienda ficticio, marcado como ejemplo.", basis: "assumption" },
        visualDirection: "Fondo neutro, tipografía grande.",
        onScreenText: "Ejemplo ilustrativo.",
        captionDraft: "Así podría ayudarte Ventex.",
        productionChecklist: ["Aclarar que es un ejemplo, no un testimonio real"],
      },
    ],
    paidPromotion: {
      objective: "Generar tráfico calificado al sitio web.",
      audienceHypothesis: { value: "Dueños de tienda entre 25 y 55 años en Colombia.", basis: "hypothesis" },
      creativeToTest: ["Video de producto", "Carrusel antes/después"],
      budgetRange: null,
      humanChecklist: ["Configurar campaña manualmente en Meta Ads Manager"],
    },
    measurementPlan: {
      baselineNeeded: ["Seguidores actuales en Instagram y Facebook"],
      reachIndicators: ["Alcance", "Impresiones"],
      qualifiedInterestIndicators: ["Clics al sitio", "Mensajes directos"],
      reviewCadence: "Cada 2 semanas",
      metricDecisions: [{ metric: "Clics al sitio", decisionInformed: "Si el mensaje conecta con la audiencia" }],
    },
    risksAndOpenQuestions: {
      unsupportedClaims: [],
      missingAssets: ["Fotos reales del negocio"],
      unclearTargeting: [],
      assumptionsToConfirm: ["Confirmar si fact-1 puede citarse en anuncios pagos."],
    },
    ...overrides,
  };
}

export class FixedClock implements Clock {
  constructor(private readonly value: string) {}
  now(): string {
    return this.value;
  }
}

export class SequentialIds implements IdGenerator {
  private count = 0;
  constructor(private readonly prefix: string) {}
  next(): string {
    this.count += 1;
    return `${this.prefix}-${this.count}`;
  }
}

export class FakeProposalGenerator implements ProposalGenerator {
  readonly providerName = "fake";
  readonly modelId = "fake-model";
  readonly prompts: string[] = [];
  private available: boolean;
  private result: Result<ProposalContent, GenerationError>;

  constructor(result: Result<ProposalContent, GenerationError>, available = true) {
    this.result = result;
    this.available = available;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async generate(prompt: string): Promise<Result<ProposalContent, GenerationError>> {
    this.prompts.push(prompt);
    return this.result;
  }
}
