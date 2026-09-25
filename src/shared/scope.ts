/**
 * Every domain record except Client and Brand is scoped by both ids.
 * Repository ports require this scope on every read so one client/brand's
 * data can never leak into another's.
 */
export interface Scope {
  clientId: string;
  brandId: string;
}
