import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border border-primary bg-primary text-primary-on hover:opacity-85 disabled:opacity-50",
  secondary: "border border-border bg-surface-raised text-on-surface hover:bg-muted disabled:opacity-50",
  danger: "border border-danger bg-danger text-primary-on hover:opacity-85 disabled:opacity-50",
  ghost: "border border-transparent text-on-surface hover:border-border hover:bg-muted disabled:opacity-50",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Real <button> element — never a clickable <div> — so keyboard and screen-reader users get native semantics for free. */
export function Button({ variant = "primary", className = "", type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}
