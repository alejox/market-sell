/**
 * The calendar date (`YYYY-MM-DD`) of an instant as seen in a given time
 * zone. The workspace is operated from Colombia, so "today" for deadlines
 * must not roll over at 19:00 local time the way UTC would. The instant is
 * passed in, never read from a clock here, so the result is testable.
 */
export const WORKSPACE_TIME_ZONE = "America/Bogota";

export function localIsoDate(instant: Date, timeZone: string = WORKSPACE_TIME_ZONE): string {
  // The `en-CA` locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}
