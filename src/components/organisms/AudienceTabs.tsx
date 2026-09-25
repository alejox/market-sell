import Link from "next/link";

export interface AudienceTabOption {
  id: string;
  segmentName: string;
}

/**
 * Audience track switch, rendered as a segmented control of real links (no
 * client JS required) — selecting a track never touches proposals or
 * briefs, it only changes which audience's data the page shows.
 */
export function AudienceTabs({
  basePath,
  options,
  selectedId,
}: {
  basePath: string;
  options: AudienceTabOption[];
  selectedId: string;
}) {
  return (
    <nav aria-label="Selección de audiencia" className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <Link
            key={option.id}
            href={`${basePath}?audience=${option.id}`}
            aria-current={selected ? "page" : undefined}
            className={`rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selected
                ? "border-primary bg-primary text-primary-on"
                : "border-border bg-surface text-on-surface hover:bg-muted"
            }`}
          >
            {option.segmentName}
          </Link>
        );
      })}
    </nav>
  );
}
