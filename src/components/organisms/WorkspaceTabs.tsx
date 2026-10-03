"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Top-level area switch. Marketing owns every route under the brand except `/organizacion`. */
export function WorkspaceTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const inOrganization = pathname.startsWith(`${basePath}/organizacion`);

  const tabs = [
    { href: basePath, label: "Marketing", selected: !inOrganization },
    { href: `${basePath}/organizacion`, label: "Organización", selected: inOrganization },
  ];

  return (
    <nav aria-label="Áreas del espacio de trabajo" className="border-b border-border bg-surface-raised print:hidden">
      <div className="mx-auto flex w-full max-w-[1200px] gap-1 px-4 sm:px-6 lg:px-8">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.selected ? "page" : undefined}
            className={`-mb-px inline-flex min-h-12 items-center border-b-2 px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-info ${
              tab.selected ? "border-primary text-on-surface" : "border-transparent text-muted-on hover:text-on-surface"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
