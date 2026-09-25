import type { ReactNode } from "react";

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-[24px] border border-border bg-surface-raised p-5 sm:p-6">
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-xl font-normal tracking-tight text-on-surface">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
