import type { ClientRepository } from "@/modules/clients/application/ports/client-repository";
import type { BrandRepository } from "@/modules/clients/application/ports/brand-repository";
import type { AudienceRepository } from "@/modules/strategy/application/ports/audience-repository";
import type { BriefRepository } from "@/modules/strategy/application/ports/brief-repository";
import type { Brand, ProductFact } from "@/modules/clients/domain/brand";
import type { Client } from "@/modules/clients/domain/client";
import type { Audience } from "@/modules/strategy/domain/audience";
import type { CampaignBrief } from "@/modules/strategy/domain/campaign-brief";

/**
 * Fixed ids for the seeded Ventex workspace so `ensureVentexSeed` can check
 * "does this exact client already exist" rather than "is the store empty" —
 * that stays correct even after real external clients are added later.
 */
export const VENTEX_CLIENT_ID = "client-ventex-owner";
export const VENTEX_BRAND_ID = "brand-ventex";
export const VENTEX_AUDIENCE_STORES_ID = "audience-ventex-stores";
export const VENTEX_AUDIENCE_SALONS_ID = "audience-ventex-salons";

const VENTEX_WEBSITE_URL = "https://www.ventex.app/";

/**
 * Product facts read directly from https://www.ventex.app/ (fetched during
 * this task — no linked page had additional product detail worth a second
 * fetch). All marked `approvedForAds: false`: nothing here is cleared for
 * ad copy until the owner confirms it, per the human-approval boundary.
 */
function ventexProductFacts(): ProductFact[] {
  const fact = (id: string, statement: string): ProductFact => ({
    id,
    statement,
    provenance: "verified_website",
    sourceUrl: VENTEX_WEBSITE_URL,
    approvedForAds: false,
  });

  return [
    fact(
      "fact-integrated-platform",
      "Ventex integra punto de venta, inventario y gestión financiera en una sola plataforma.",
    ),
    fact("fact-realtime-inventory", "Cada venta actualiza el inventario en tiempo real."),
    fact(
      "fact-iva-handling",
      "Ventex calcula el IVA automáticamente, incluyendo 0% para clientes exentos.",
    ),
    fact(
      "fact-payment-methods",
      "Ventex admite múltiples métodos de pago: efectivo, tarjeta y transferencias.",
    ),
    fact("fact-low-stock-alerts", "Ventex envía alertas de stock bajo."),
    fact("fact-categories-sku", "Ventex organiza productos por categorías y SKU."),
    fact("fact-net-profit", "Ventex calcula la utilidad neta del negocio en tiempo real."),
    fact(
      "fact-income-expense-graphs",
      "Ventex muestra ingresos y gastos del negocio con gráficas.",
    ),
    fact(
      "fact-multi-user",
      "Ventex permite colaboración de varios usuarios/empleados según el plan contratado.",
    ),
    fact(
      "fact-appointments-module",
      "Ventex incluye un módulo de citas y agenda pensado para salones y barberías.",
    ),
    fact(
      "fact-commissions-module",
      "Ventex incluye seguimiento de comisiones para salones y barberías.",
    ),
    fact(
      "fact-target-segments",
      "Ventex está dirigido a tiendas minoristas y a salones y barberías; lava-autos y servicios profesionales figuran como 'Próximamente'.",
    ),
    fact(
      "fact-pricing-tiers",
      "Ventex ofrece un plan gratuito (1 colaborador, hasta $2.000.000 en ventas mensuales), un plan Plata ($29.000/mes, 3 colaboradores, hasta $6.000.000 mensuales) y un plan Oro ($60.000/mes, 5 colaboradores, ventas ilimitadas).",
    ),
  ];
}

const MISSING_INFORMATION = [
  "Oferta exacta, condiciones de prueba y qué reclamos están aprobados para publicidad.",
  "Lineamientos de marca, logo/activos y ejemplos de tono preferido o prohibido.",
  "Ciudades o regiones prioritarias dentro de Colombia.",
  "Perfiles existentes de Instagram/Facebook, métricas base y aprendizajes de campañas previas.",
  "Capacidad de producción disponible y presupuesto publicitario mensual (opcional).",
  "Acción de conversión deseada (visitar el sitio, iniciar prueba, solicitar demo o contactar ventas).",
];

/**
 * Inserts only when no row with this id exists yet and never modifies an
 * existing row, even to identical content. Every seeded repository (JSON,
 * in-memory, and Supabase) implements this alongside its port so
 * `ensureVentexSeed` never has to fall back to `save`'s upsert-and-overwrite
 * semantics — see `IdentifiedRepository`/`ScopedRepository`'s
 * `insertIfAbsent` (JSON/in-memory) and `ScopedSupabaseRepository`'s /
 * `SupabaseClientRepository`'s / `SupabaseBrandRepository`'s
 * `insertIfAbsent` (Supabase, backed by `ON CONFLICT DO NOTHING`).
 */
export interface IdempotentSeedRepository<T extends { id: string }> {
  insertIfAbsent(item: T): Promise<boolean>;
}

export interface VentexSeedRepositories {
  clients: ClientRepository & IdempotentSeedRepository<Client>;
  brands: BrandRepository & IdempotentSeedRepository<Brand>;
  audiences: AudienceRepository & IdempotentSeedRepository<Audience>;
  briefs: BriefRepository & IdempotentSeedRepository<CampaignBrief>;
}

export interface VentexSeedResult {
  /** false when the Ventex client already existed — nothing was written. */
  seeded: boolean;
  clientId: string;
  brandId: string;
}

function buildClient(owner: string, now: string): Client {
  return {
    id: VENTEX_CLIENT_ID,
    name: "Marca propia",
    owner,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

function buildBrand(now: string): Brand {
  return {
    id: VENTEX_BRAND_ID,
    clientId: VENTEX_CLIENT_ID,
    name: "Ventex",
    website: VENTEX_WEBSITE_URL,
    productFacts: ventexProductFacts(),
    voice:
      "Cercano, claro y profesional. Habla directamente al dueño del negocio, sin tecnicismos innecesarios ni promesas exageradas.",
    constraints: [
      "No prometer resultados de ventas, alcance o leads.",
      "No mencionar precios, promociones o condiciones sin confirmación explícita del dueño.",
      'No usar superlativos sin respaldo ("el mejor", "garantizado").',
      "Mantener un tono profesional colombiano; evitar jerga regional o groserías.",
    ],
    assets: [],
    createdAt: now,
    updatedAt: now,
  };
}

function buildAudiences(now: string): Audience[] {
  const hypothesis = (value: string) => ({ value, basis: "hypothesis" as const });

  return [
    {
      id: VENTEX_AUDIENCE_STORES_ID,
      clientId: VENTEX_CLIENT_ID,
      brandId: VENTEX_BRAND_ID,
      segmentName: "Tiendas / comercio minorista",
      geography: "Colombia",
      pains: [
        hypothesis("Pierden ventas por falta de control de inventario en tiempo real."),
        hypothesis("Llevan las finanzas del negocio de forma manual o dispersa."),
        hypothesis("Dificultad para saber la utilidad real del negocio día a día."),
      ],
      objections: [
        hypothesis("Ya usan una libreta, Excel u otro sistema y cambiar toma tiempo."),
        hypothesis("Preocupación por el costo mensual de una nueva herramienta."),
        hypothesis("Temor a que el sistema sea complicado de aprender."),
      ],
      hypotheses: [
        "La mayoría de tiendas pequeñas en Colombia aún no usa un sistema POS integrado.",
        "El dueño de la tienda es quien decide y usa el sistema personalmente.",
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: VENTEX_AUDIENCE_SALONS_ID,
      clientId: VENTEX_CLIENT_ID,
      brandId: VENTEX_BRAND_ID,
      segmentName: "Barberías y salones de belleza",
      geography: "Colombia",
      pains: [
        hypothesis("Dificultad para gestionar citas y evitar cruces de horario."),
        hypothesis("Falta de claridad en el cálculo de comisiones por empleado."),
        hypothesis("Control manual del inventario de insumos (tintes, productos, etc.)."),
      ],
      objections: [
        hypothesis("Ya coordinan citas por WhatsApp o de forma manual."),
        hypothesis("Dudas sobre si el sistema se adapta a un salón/barbería y no solo a una tienda."),
        hypothesis("Preocupación por el tiempo de capacitación del equipo."),
      ],
      hypotheses: [
        "Los barberos/estilistas son sensibles a que el cálculo de comisiones sea transparente.",
        "La mayoría de salones pequeños coordina citas de forma informal.",
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildBriefs(owner: string, now: string): CampaignBrief[] {
  return [
    {
      id: "brief-ventex-stores",
      clientId: VENTEX_CLIENT_ID,
      brandId: VENTEX_BRAND_ID,
      audienceId: VENTEX_AUDIENCE_STORES_ID,
      objective:
        "Mejorar el posicionamiento y alcance de Ventex en Instagram y Facebook entre tiendas de comercio minorista en Colombia.",
      timeframe: "4 semanas",
      valueProposition:
        "Control de ventas, inventario y finanzas del negocio en un solo lugar, sin integraciones manuales.",
      budgetRange: null,
      missingInformation: MISSING_INFORMATION,
      createdBy: owner,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "brief-ventex-salons",
      clientId: VENTEX_CLIENT_ID,
      brandId: VENTEX_BRAND_ID,
      audienceId: VENTEX_AUDIENCE_SALONS_ID,
      objective:
        "Mejorar el posicionamiento y alcance de Ventex en Instagram y Facebook entre barberías y salones de belleza en Colombia.",
      timeframe: "4 semanas",
      valueProposition:
        "Citas, comisiones, inventario y finanzas del salón en un solo lugar, sin integraciones manuales.",
      budgetRange: null,
      missingInformation: MISSING_INFORMATION,
      createdBy: owner,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Idempotent and concurrency-safe: every write is `insertIfAbsent`, never
 * `save`'s upsert-and-overwrite. The `getById` check below is only a fast
 * path that skips the four insert calls on the common case (already
 * seeded) — correctness does not depend on it. Two callers (e.g. two
 * serverless instances racing on the same cold start) can both pass that
 * check and both reach the inserts below; each fixed id is still inserted
 * at most once, and neither call ever overwrites a row the other inserted
 * or a row the owner has since edited, because `insertIfAbsent` never
 * updates an existing row.
 */
export async function ensureVentexSeed(
  repos: VentexSeedRepositories,
  options: { owner?: string; now?: () => string } = {},
): Promise<VentexSeedResult> {
  const owner = options.owner ?? "Owner";
  const now = (options.now ?? (() => new Date().toISOString()))();

  const existing = await repos.clients.getById(VENTEX_CLIENT_ID);
  if (existing) {
    return { seeded: false, clientId: VENTEX_CLIENT_ID, brandId: VENTEX_BRAND_ID };
  }

  const clientInserted = await repos.clients.insertIfAbsent(buildClient(owner, now));
  await repos.brands.insertIfAbsent(buildBrand(now));
  for (const audience of buildAudiences(now)) {
    await repos.audiences.insertIfAbsent(audience);
  }
  for (const brief of buildBriefs(owner, now)) {
    await repos.briefs.insertIfAbsent(brief);
  }

  return { seeded: clientInserted, clientId: VENTEX_CLIENT_ID, brandId: VENTEX_BRAND_ID };
}
