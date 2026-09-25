import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const FIELD_CLASSES =
  "w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-on-surface placeholder:text-muted-on focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function Wrapper({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-on-surface">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-on">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  className = "",
  ...rest
}: { id: string; label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrapper id={id} label={label} hint={hint}>
      <input id={id} className={`${FIELD_CLASSES} ${className}`} aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
    </Wrapper>
  );
}

export function TextAreaField({
  id,
  label,
  hint,
  className = "",
  ...rest
}: { id: string; label: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrapper id={id} label={label} hint={hint}>
      <textarea
        id={id}
        className={`${FIELD_CLASSES} min-h-24 ${className}`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </Wrapper>
  );
}

export function SelectField({
  id,
  label,
  hint,
  className = "",
  children,
  ...rest
}: { id: string; label: string; hint?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrapper id={id} label={label} hint={hint}>
      <select id={id} className={`${FIELD_CLASSES} ${className}`} aria-describedby={hint ? `${id}-hint` : undefined} {...rest}>
        {children}
      </select>
    </Wrapper>
  );
}
