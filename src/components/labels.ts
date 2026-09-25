import type { BadgeTone } from "@/components/atoms/Badge";
import type { ClaimBasis } from "@/modules/strategy/domain/claim";
import type { FactProvenance } from "@/modules/clients/domain/brand";
import type { ProposalState } from "@/modules/strategy/domain/proposal";
import type { ResultSnapshotSource } from "@/modules/results/domain/result-snapshot";

/** Pure presentational label/tone mappings — no I/O, safe to import from any component. */

export const CLAIM_BASIS_LABELS: Record<ClaimBasis, string> = {
  fact: "Hecho",
  owner_input: "Dato del propietario",
  assumption: "Supuesto",
  hypothesis: "Hipótesis",
};

export const CLAIM_BASIS_TONES: Record<ClaimBasis, BadgeTone> = {
  fact: "success",
  owner_input: "info",
  assumption: "neutral",
  hypothesis: "warning",
};

export const FACT_PROVENANCE_LABELS: Record<FactProvenance, string> = {
  verified_website: "Verificado en sitio web",
  owner_provided: "Aportado por el propietario",
  hypothesis: "Hipótesis",
};

export const FACT_PROVENANCE_TONES: Record<FactProvenance, BadgeTone> = {
  verified_website: "success",
  owner_provided: "info",
  hypothesis: "warning",
};

export const PROPOSAL_STATE_LABELS: Record<ProposalState, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  changes_requested: "Cambios solicitados",
  approved: "Aprobado",
  archived: "Archivado",
};

export const PROPOSAL_STATE_TONES: Record<ProposalState, BadgeTone> = {
  draft: "neutral",
  in_review: "info",
  changes_requested: "warning",
  approved: "success",
  archived: "neutral",
};

export const RESULT_SOURCE_LABELS: Record<ResultSnapshotSource, string> = {
  manual_owner_entry: "Ingreso manual del propietario",
  manual_meta_export: "Exportación de Meta Business Suite (manual)",
  manual_other: "Otro",
};

export const CONTENT_FORMAT_LABELS: Record<string, string> = {
  short_video: "Video corto",
  carousel: "Carrusel",
  static_or_story: "Imagen / historia",
};
