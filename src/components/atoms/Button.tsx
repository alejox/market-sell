import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-on hover:opacity-90 disabled:opacity-50",
  secondary: "bg-muted text-on-surface border border-border hover:bg-border disabled:opacity-50",
  danger: "bg-danger text-primary-on hover:opacity-90 disabled:opacity-50",
  ghost: "text-primary underline underline-offset-2 hover:opacity-80 disabled:opacity-50",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Real <button> element — never a clickable <div> — so keyboard and screen-reader users get native semantics for free. */
export function Button({ variant = "primary", className = "", type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}
