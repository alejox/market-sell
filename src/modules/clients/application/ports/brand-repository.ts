import type { Brand } from "@/modules/clients/domain/brand";

/**
 * Scoped by clientId only (a brand has no brand-level parent). Listing
 * brands by client is the one exception to full client+brand scoping.
 */
export interface BrandRepository {
  listByClient(clientId: string): Promise<Brand[]>;
  getById(clientId: string, brandId: string): Promise<Brand | null>;
  save(brand: Brand): Promise<void>;
}
