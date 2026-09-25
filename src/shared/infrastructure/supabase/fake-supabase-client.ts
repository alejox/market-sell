import type { PostgrestError } from "@supabase/supabase-js";

/**
 * A minimal, in-memory stand-in for the slice of the Supabase JS client the
 * repository adapters use: `.from(table).select().eq(...).maybeSingle()` /
 * `.upsert(...)`, and `.auth.getClaims()`. No network call is ever made —
 * every adapter test uses this instead of a real Supabase project, per
 * `odd/tasks/supabase-production-persistence.md`'s "no calls to the remote
 * Supabase project" constraint.
 *
 * It is intentionally not a `.test.ts` file so `npm test`'s glob does not
 * try to run it directly; it is imported by the adapter tests instead.
 */

type Row = Record<string, unknown>;

function ok<T>(data: T): { data: T; error: null } {
  return { data, error: null };
}

function postgrestError(message: string, code = "23505"): PostgrestError {
  return { name: "PostgrestError", message, details: "", hint: "", code } as PostgrestError;
}

class FakeTable {
  rows: Row[] = [];
  /** When set, every write against this table fails with this error instead of applying. */
  failWritesWith: PostgrestError | null = null;

  upsert(incoming: Row[]): { error: PostgrestError | null } {
    if (this.failWritesWith) return { error: this.failWritesWith };
    for (const row of incoming) {
      const index = this.rows.findIndex((existing) => existing.id === row.id);
      if (index === -1) this.rows.push(row);
      else this.rows[index] = { ...this.rows[index], ...row };
    }
    return { error: null };
  }
}

/** Chainable fake query builder. Every `.eq()` narrows an AND-ed filter list applied on read. */
class FakeQueryBuilder implements PromiseLike<{ data: unknown; error: PostgrestError | null }> {
  private readonly filters: Array<[string, unknown]> = [];
  private mode: "list" | "maybeSingle" = "list";
  private write: { kind: "upsert"; rows: Row[] } | null = null;

  constructor(private readonly table: FakeTable) {}

  select(_columns = "*"): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push([column, value]);
    return this;
  }

  limit(_n: number): this {
    return this;
  }

  maybeSingle(): this {
    this.mode = "maybeSingle";
    return this;
  }

  upsert(rows: Row | Row[], _options?: { onConflict?: string }): this {
    this.write = { kind: "upsert", rows: Array.isArray(rows) ? rows : [rows] };
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every(([column, value]) => row[column] === value);
  }

  private execute(): { data: unknown; error: PostgrestError | null } {
    if (this.write) {
      const { error } = this.table.upsert(this.write.rows);
      return error ? { data: null, error } : ok(null);
    }
    const rows = this.table.rows.filter((row) => this.matches(row));
    if (this.mode === "maybeSingle") {
      return ok(rows[0] ?? null);
    }
    return ok(rows);
  }

  then<TResult1 = { data: unknown; error: PostgrestError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: PostgrestError | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export interface FakeClaims {
  sub?: string;
}

/**
 * Cast the result `as unknown as SupabaseClient` at the call site — this
 * fake only implements the methods the adapters actually call, not the full
 * Supabase client surface.
 */
export class FakeSupabaseClient {
  private readonly tables = new Map<string, FakeTable>();
  private claims: FakeClaims | null = { sub: "owner-uuid" };
  private claimsError: PostgrestError | null = null;

  /** Accepts any plain row-shaped object — callers pass their own `*Row` interfaces, not `Record<string, unknown>`. */
  seed(table: string, rows: object[]): void {
    this.tableFor(table).rows = [...(rows as Row[])];
  }

  rowsOf(table: string): Row[] {
    return this.tableFor(table).rows;
  }

  failWritesOn(table: string, error: PostgrestError = postgrestError("row level security violation", "42501")): void {
    this.tableFor(table).failWritesWith = error;
  }

  setClaims(claims: FakeClaims | null): void {
    this.claims = claims;
  }

  setClaimsError(error: PostgrestError | null): void {
    this.claimsError = error;
  }

  private tableFor(name: string): FakeTable {
    let table = this.tables.get(name);
    if (!table) {
      table = new FakeTable();
      this.tables.set(name, table);
    }
    return table;
  }

  from(table: string): FakeQueryBuilder {
    return new FakeQueryBuilder(this.tableFor(table));
  }

  auth = {
    getClaims: async () => {
      if (this.claimsError) return { data: null, error: this.claimsError };
      return { data: this.claims ? { claims: this.claims } : null, error: null };
    },
  };
}
