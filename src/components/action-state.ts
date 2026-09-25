/**
 * Shared shape for every Server Action driven by `useActionState` in this
 * workspace. Kept outside any "use server" file so presentational
 * components can import the type without pulling in server-action module
 * semantics.
 */
export interface ActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export const IDLE_ACTION_STATE: ActionState = { status: "idle", message: null };

/** The exact function shape `useActionState`'s `action` argument expects. */
export type BoundFormAction = (prevState: ActionState, formData: FormData) => Promise<ActionState>;
