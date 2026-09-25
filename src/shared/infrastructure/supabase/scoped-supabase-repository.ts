import type { Scope } from "@/shared/scope";
import type { SupabaseClientProvider } from "./client-provider";
import { unwrapList, unwrapMaybe, unwrapWrite } from "./errors";

/**
 * Supabase counterpart to `ScopedRepository` (see
 * `src/shared/infrastructure/scoped-repository.ts`): every query filters
 * explicitly by `client_id` and `brand_id` — defense in depth on top of the
 * RLS policies in `supabase/migrations/20260925053019_workspace_schema.sql`,
 * which enforce the same scoping at the database layer. A query for one
 * brand can never return another brand's rows even if RLS were ever
 * misconfigured, because the filter is also applied here in application
 * code.
 *
 * Shared by the five modules whose ports follow the
 * "list / getById / save, plus a couple of derived lookups" shape:
 * audiences, campaign briefs, proposals, review decisions, and result
 * snapshots. `clients` (unscoped) and `brands` (scoped by `clientId` only)
 * are small enough to implement directly against Supabase in their own
 * adapters instead of forcing them through this shape.
 */
export class ScopedSupabaseRepository<Row extends object, T extends { id: string }> {
  constructor(
    private readonly getClient: SupabaseClientProvider,
    private readonly table: string,
    private readonly fromRow: (row: Row) => T,
    private readonly toRow: (item: T) => Row,
  ) {}

  async list(scope: Scope): Promise<T[]> {
    const supabase = await this.getClient();
    const result = await supabase.from(this.table).select("*").eq("client_id", scope.clientId).eq("brand_id", scope.brandId);
    return unwrapList<Row>(`${this.table}.list`, result).map(this.fromRow);
  }

  async getById(scope: Scope, id: string): Promise<T | null> {
    const supabase = await this.getClient();
    const result = await supabase
      .from(this.table)
      .select("*")
      .eq("client_id", scope.clientId)
      .eq("brand_id", scope.brandId)
      .eq("id", id)
      .maybeSingle();
    const row = unwrapMaybe<Row>(`${this.table}.getById`, result);
    return row ? this.fromRow(row) : null;
  }

  /** Backs derived single-row lookups such as `BriefRepository.getByAudience`. */
  async findOneBy(scope: Scope, column: string, value: string): Promise<T | null> {
    const supabase = await this.getClient();
    const result = await supabase
      .from(this.table)
      .select("*")
      .eq("client_id", scope.clientId)
      .eq("brand_id", scope.brandId)
      .eq(column, value)
      .limit(1)
      .maybeSingle();
    const row = unwrapMaybe<Row>(`${this.table}.findOneBy(${column})`, result);
    return row ? this.fromRow(row) : null;
  }

  /** Backs derived list lookups such as `listByThread`/`listByProposal`. */
  async listBy(scope: Scope, column: string, value: string): Promise<T[]> {
    const supabase = await this.getClient();
    const result = await supabase
      .from(this.table)
      .select("*")
      .eq("client_id", scope.clientId)
      .eq("brand_id", scope.brandId)
      .eq(column, value);
    return unwrapList<Row>(`${this.table}.listBy(${column})`, result).map(this.fromRow);
  }

  async save(item: T): Promise<void> {
    const supabase = await this.getClient();
    const result = await supabase.from(this.table).upsert(this.toRow(item), { onConflict: "id" });
    unwrapWrite(`${this.table}.save`, result);
  }

  /**
   * Inserts only when no row with this id exists yet, using `ON CONFLICT DO
   * NOTHING` (`ignoreDuplicates: true`) at the database level — never a
   * read-then-write, so it stays correct even when several serverless
   * instances race to seed/import the same fixed id at once, and it never
   * overwrites a row the owner has since edited. `.select("id")` reads back
   * which rows were actually inserted; PostgREST returns none for a
   * conflict it ignored. Returns whether this call actually inserted a row.
   */
  async insertIfAbsent(item: T): Promise<boolean> {
    const supabase = await this.getClient();
    const result = await supabase
      .from(this.table)
      .upsert(this.toRow(item), { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    const inserted = unwrapList<{ id: string }>(`${this.table}.insertIfAbsent`, result);
    return inserted.length > 0;
  }
}
