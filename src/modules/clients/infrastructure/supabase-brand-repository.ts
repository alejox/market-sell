import type { BrandRepository } from "@/modules/clients/application/ports/brand-repository";
import type { Brand, ProductFact } from "@/modules/clients/domain/brand";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { unwrapList, unwrapMaybe, unwrapWrite } from "@/shared/infrastructure/supabase/errors";

const TABLE = "brands";

/** Row shape of `public.brands` (see the workspace schema migration). */
interface BrandRow {
  id: string;
  client_id: string;
  name: string;
  website: string;
  product_facts: ProductFact[];
  voice: string;
  constraints: string[];
  assets: string[];
  created_at: string;
  updated_at: string;
}

function fromRow(row: BrandRow): Brand {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    website: row.website,
    productFacts: row.product_facts,
    voice: row.voice,
    constraints: row.constraints,
    assets: row.assets,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(brand: Brand): BrandRow {
  return {
    id: brand.id,
    client_id: brand.clientId,
    name: brand.name,
    website: brand.website,
    product_facts: brand.productFacts,
    voice: brand.voice,
    constraints: brand.constraints,
    assets: brand.assets,
    created_at: brand.createdAt,
    updated_at: brand.updatedAt,
  };
}

/**
 * `brands` is scoped by `clientId` only (a brand has no brand-level
 * parent) — every query filters explicitly by `client_id` in addition to
 * the RLS `brands_*_own` policies, which check ownership through the
 * `clients` table.
 */
export class SupabaseBrandRepository implements BrandRepository {
  constructor(private readonly getClient: SupabaseClientProvider) {}

  async listByClient(clientId: string): Promise<Brand[]> {
    const supabase = await this.getClient();
    const result = await supabase.from(TABLE).select("*").eq("client_id", clientId);
    return unwrapList<BrandRow>("brands.listByClient", result).map(fromRow);
  }

  async getById(clientId: string, brandId: string): Promise<Brand | null> {
    const supabase = await this.getClient();
    const result = await supabase.from(TABLE).select("*").eq("client_id", clientId).eq("id", brandId).maybeSingle();
    const row = unwrapMaybe<BrandRow>("brands.getById", result);
    return row ? fromRow(row) : null;
  }

  async save(brand: Brand): Promise<void> {
    const supabase = await this.getClient();
    const result = await supabase.from(TABLE).upsert(toRow(brand), { onConflict: "id" });
    unwrapWrite("brands.save", result);
  }
}
