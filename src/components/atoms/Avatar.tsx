import { initialsOf } from "@/modules/team/domain/profile";

const SIZES = { sm: "size-6 text-[10px]", md: "size-9 text-xs" } as const;

/** Initials in a lilac circle. Decorative: the name always sits next to it as text. */
export function Avatar({ name, size = "sm" }: { name: string; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-medium text-accent-on ${SIZES[size]}`}
    >
      {initialsOf(name)}
    </span>
  );
}
