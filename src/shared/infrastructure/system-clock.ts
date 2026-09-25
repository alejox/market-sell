import type { Clock } from "@/shared/application/ports/clock";

export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}
