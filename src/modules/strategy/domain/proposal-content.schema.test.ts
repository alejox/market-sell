import assert from "node:assert/strict";
import { test } from "node:test";
import { proposalContentSchema } from "./proposal-content.schema";

function claim(value: string) {
  return { value, basis: "hypothesis" as const };
}

function validContent() {
  return {
    briefRecap: {
      factsUsed: ["Ventex es un POS integrado."],
      assumptionsUsed: ["Los negocios priorizan control de inventario."],
      missingInformation: ["Precios exactos de Ventex."],
    },
    audienceInsight: {
      operationalProblem: claim("Pierden ventas por falta de control de stock."),
      desiredOutcome: claim("Vender con confianza sin quiebres de stock."),
      likelyObjection: claim("Ya usamos una libreta o Excel."),
      messageAngle: claim("De la libreta al control en tiempo real."),
    },
    positioning: {
      promise: claim("Control total de tu tienda en un solo lugar."),
      supportingProof: [claim("Inventario y ventas integrados.")],
      wordingToAvoid: ["garantizado", "el mejor del mercado"],
    },
    campaignConcept: {
      goal: "Aumentar reconocimiento entre comercios minoristas.",
      targetAudience: "Tiendas de barrio en Colombia.",
      coreMessage: claim("Simplifica tu tienda con Ventex."),
      offerOrCta: claim("Agenda una demo gratuita."),
      channelRoles: [
        { channel: "instagram" as const, role: "Descubrimiento visual." },
        { channel: "facebook" as const, role: "Alcance en comunidades locales." },
      ],
      recommendedDurationWeeks: 4,
    },
    contentPlan: [
      {
        week: 1,
        purpose: "Educar",
        format: "short_video" as const,
        topic: "Problema del control manual",
        hook: "¿Sigues contando inventario a mano?",
        cta: "Conoce Ventex",
        requiredAsset: "Video corto del local",
      },
      {
        week: 2,
        purpose: "Mostrar producto",
        format: "carousel" as const,
        topic: "Funciones clave",
        hook: "Todo tu negocio en una pantalla",
        cta: "Agenda una demo",
        requiredAsset: "Capturas de pantalla",
      },
      {
        week: 3,
        purpose: "Prueba social",
        format: "static_or_story" as const,
        topic: "Beneficios diarios",
        hook: "Menos tiempo contando, más tiempo vendiendo",
        cta: "Escríbenos",
        requiredAsset: "Foto del punto de venta",
      },
      {
        week: 4,
        purpose: "Cierre",
        format: "short_video" as const,
        topic: "Llamado a la acción final",
        hook: "Empieza hoy",
        cta: "Agenda una demo",
        requiredAsset: "Video testimonial (si está disponible)",
      },
    ],
    creativeBriefs: [
      {
        format: "short_video" as const,
        concept: claim("Un día en la tienda con y sin Ventex."),
        visualDirection: "Contraste antes/después en el mostrador.",
        onScreenText: "Antes vs. después",
        captionDraft: "Así de simple puede ser tu día a día. #Ventex",
        productionChecklist: ["Grabar en el local", "Buena luz natural"],
      },
      {
        format: "carousel" as const,
        concept: claim("Tres funciones que resuelven problemas diarios."),
        visualDirection: "Una función por tarjeta con ícono simple.",
        onScreenText: "3 problemas, 1 solución",
        captionDraft: "Todo lo que necesitas en un solo lugar.",
        productionChecklist: ["Diseñar 3 tarjetas", "Revisar textos con el dueño"],
      },
      {
        format: "static_or_story" as const,
        concept: claim("Testimonio breve del dueño."),
        visualDirection: "Foto del dueño en su tienda.",
        onScreenText: "Recomendado por dueños como tú",
        captionDraft: "La opinión de quienes ya lo usan.",
        productionChecklist: ["Confirmar autorización del dueño"],
      },
    ],
    paidPromotion: {
      objective: "Generar solicitudes de demo.",
      audienceHypothesis: claim("Dueños de tiendas de 25 a 55 años en Colombia."),
      creativeToTest: ["Video antes/después", "Carrusel de funciones"],
      budgetRange: null,
      humanChecklist: ["Confirmar presupuesto con el dueño antes de activar."],
    },
    measurementPlan: {
      baselineNeeded: ["Seguidores actuales en Instagram y Facebook."],
      reachIndicators: ["Alcance", "Impresiones"],
      qualifiedInterestIndicators: ["Mensajes directos", "Clics al sitio"],
      reviewCadence: "Semanal",
      metricDecisions: [{ metric: "Mensajes directos", decisionInformed: "Ajustar el mensaje de la semana 2." }],
    },
    risksAndOpenQuestions: {
      unsupportedClaims: [],
      missingAssets: ["Fotos del local"],
      unclearTargeting: [],
      assumptionsToConfirm: ["Rango de presupuesto mensual."],
    },
  };
}

test("accepts a fully valid proposal content payload", () => {
  const result = proposalContentSchema.safeParse(validContent());
  assert.equal(result.success, true);
});

test("rejects creative briefs missing a required format", () => {
  const content = validContent();
  content.creativeBriefs = content.creativeBriefs.filter((brief) => brief.format !== "static_or_story");
  const result = proposalContentSchema.safeParse(content);
  assert.equal(result.success, false);
});

test("rejects a content plan that does not cover all four weeks", () => {
  const content = validContent();
  content.contentPlan = content.contentPlan.filter((item) => item.week !== 4);
  const result = proposalContentSchema.safeParse(content);
  assert.equal(result.success, false);
});

test("rejects a claim missing its basis", () => {
  const content = validContent();
  // @ts-expect-error intentionally malformed for the test
  content.positioning.promise = { value: "sin basis" };
  const result = proposalContentSchema.safeParse(content);
  assert.equal(result.success, false);
});
