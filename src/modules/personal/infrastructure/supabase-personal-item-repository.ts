import type { Scope } from "@/shared/scope";
import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { unwrapList, unwrapMaybe, unwrapWrite } from "@/shared/infrastructure/supabase/errors";
import type { PersonalItemRepository } from "@/modules/personal/application/ports/personal-item-repository";
import type { PersonalItem, PersonalKind } from "@/modules/personal/domain/personal-item";

const TABLE = "personal_items";

/** Row shape of `public.personal_items` (see the personal_items migration). */
interface PersonalItemRow {
  id: string;
  client_id: string;
  brand_id: string;
  user_id: string;
  kind: PersonalKind;
  title: string;
  body: string;
  done: boolean;
  created_at: string;
  updated_at: string;
}

function fromRow(row: PersonalItemRow): PersonalItem {
  return {
    id: row.id,
    clientId: row.client_id,
    brandId: row.brand_id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    done: row.done,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(item: PersonalItem): PersonalItemRow {
  return {
    id: item.id,
    client_id: item.clientId,
    brand_id: item.brandId,
    user_id: item.userId,
    kind: item.kind,
    title: item.title,
    body: item.body,
    done: item.done,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

/**
 * Filters by client, brand AND user in application code, on top of the RLS
 * policies (`user_id = auth.uid()`), so another person's item can never come
 * back from here even if a policy were ever misconfigured.
 */
export class SupabasePersonalItemRepository implements PersonalItemRepository {
  constructor(private readonly getClient: SupabaseClientProvider) {}

  async list(scope: Scope, userId: string): Promise<PersonalItem[]> {
    const supabase = await this.getClient();
    const result = await supabase
      .from(TABLE)
      .select("*")
      .eq("client_id", scope.clientId)
      .eq("brand_id", scope.brandId)
      .eq("user_id", userId);
    return unwrapList<PersonalItemRow>(`${TABLE}.list`, result).map(fromRow);
  }

  async getById(scope: Scope, userId: string, id: string): Promise<PersonalItem | null> {
    const supabase = await this.getClient();
    const result = await supabase
      .from(TABLE)
      .select("*")
      .eq("client_id", scope.clientId)
      .eq("brand_id", scope.brandId)
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    const row = unwrapMaybe<PersonalItemRow>(`${TABLE}.getById`, result);
    return row ? fromRow(row) : null;
  }

  async save(item: PersonalItem): Promise<void> {
    const supabase = await this.getClient();
    const result = await supabase.from(TABLE).upsert(toRow(item), { onConflict: "id" });
    unwrapWrite(`${TABLE}.save`, result);
  }

  async delete(scope: Scope, userId: string, id: string): Promise<void> {
    const supabase = await this.getClient();
    const result = await supabase
      .from(TABLE)
      .delete()
      .eq("client_id", scope.clientId)
      .eq("brand_id", scope.brandId)
      .eq("user_id", userId)
      .eq("id", id);
    unwrapWrite(`${TABLE}.delete`, result);
  }
}
