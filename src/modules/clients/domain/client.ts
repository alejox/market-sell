export type ClientStatus = "active" | "archived";

/**
 * A client owns one or more brands. The first release seeds one internal
 * client for the owner's own brands (Ventex); external clients follow the
 * same shape without a domain redesign.
 */
export interface Client {
  id: string;
  name: string;
  owner: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}
