"use client";

import { useRouter } from "next/navigation";

export interface ClientBrandOption {
  clientId: string;
  brandId: string;
  clientName: string;
  brandName: string;
}

/**
 * Lets the owner switch between client/brand workspaces. Only Ventex is
 * seeded in this release, but the selector reads from the real client/brand
 * list — it is not hardcoded to Ventex.
 */
export function ClientBrandSelector({ options, current }: { options: ClientBrandOption[]; current: string }) {
  const router = useRouter();

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor="client-brand-selector" className="text-xs font-medium uppercase tracking-[0.12em] text-muted-on">
        Cliente / marca
      </label>
      <select
        id="client-brand-selector"
        className="min-h-10 max-w-full rounded-full border border-border bg-surface-raised px-4 py-2 text-sm text-on-surface focus-visible:ring-2 focus-visible:ring-primary"
        value={current}
        onChange={(event) => router.push(`/c/${event.target.value}`)}
      >
        {options.map((option) => (
          <option key={`${option.clientId}/${option.brandId}`} value={`${option.clientId}/b/${option.brandId}`}>
            {option.clientName} — {option.brandName}
          </option>
        ))}
      </select>
    </div>
  );
}
