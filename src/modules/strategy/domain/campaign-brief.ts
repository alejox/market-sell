export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

export type BriefStatus = "draft" | "ready";

/**
 * The owner-editable input that grounds proposal generation for one
 * audience track. `budgetRange` is null unless the owner supplies it — it
 * must never be inferred or defaulted.
 */
export interface CampaignBrief {
  id: string;
  clientId: string;
  brandId: string;
  audienceId: string;
  objective: string;
  timeframe: string;
  valueProposition: string;
  budgetRange: BudgetRange | null;
  /** Open gaps the owner still needs to fill in (see spec §11). */
  missingInformation: string[];
  createdBy: string;
  status: BriefStatus;
  createdAt: string;
  updatedAt: string;
}
