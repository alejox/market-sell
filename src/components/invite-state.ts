/** State of the "create invitation link" form. `link` is only ever present right after creating it. */
export interface InviteState {
  status: "idle" | "created" | "error";
  message: string | null;
  link: string | null;
  expiresAt: string | null;
}

export const IDLE_INVITE_STATE: InviteState = { status: "idle", message: null, link: null, expiresAt: null };

export type InviteFormAction = (prevState: InviteState, formData: FormData) => Promise<InviteState>;
