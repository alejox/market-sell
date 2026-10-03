"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Top-level area switch. A fixed-width sidebar from `md` up, a horizontal
 * strip above the content on narrow screens. Marketing owns every route under
 * the brand except `/organizacion`.
 */
export function WorkspaceSidebar({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const inOrganization = pathname.startsWith(`${basePath}/organizacion`);

  const items = [
    { href: basePath, label: "Marketing", selected: !inOrganization },
    { href: `${basePath}/organizacion`, label: "Organización", selected: inOrganization },
  ];

  return (
    <nav
      aria-label="Áreas del espacio de trabajo"
      className="border-b border-border bg-surface-raised print:hidden md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:self-start md:border-b-0 md:border-r"
    >
      <p className="hidden px-6 pt-8 pb-4 text-xs font-medium uppercase tracking-widest text-muted-on md:block">Ventex</p>
      <ul className="flex gap-1 overflow-x-auto px-4 sm:px-6 md:flex-col md:px-3 md:pb-4">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              aria-current={item.selected ? "page" : undefined}
              className={`inline-flex min-h-11 w-full items-center rounded-full px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-info ${
                item.selected ? "bg-accent text-accent-on" : "text-muted-on hover:bg-muted hover:text-on-surface"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
