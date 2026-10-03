/** Formats an ISO calendar date (`YYYY-MM-DD`) as e.g. "5 oct 2026". Timezone-free: the date is never shifted. */
export function formatCalendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(/\./g, "");
}
