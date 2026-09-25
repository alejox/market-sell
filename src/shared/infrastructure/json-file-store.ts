import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CollectionStore } from "./collection-store";

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}

/**
 * One JSON array file, one instance per file. Writes are atomic (write a
 * temp file, then rename) and serialized behind an in-process queue so a
 * read-modify-write cycle from `mutate` never interleaves with another
 * write to the same file. This is a single-process, single-owner adapter —
 * it does not coordinate across OS processes.
 */
export class JsonFileStore<T> implements CollectionStore<T> {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async readAll(): Promise<T[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (error) {
      if (isEnoent(error)) {
        return [];
      }
      throw error;
    }
  }

  async mutate(transform: (items: T[]) => T[]): Promise<T[]> {
    return this.enqueue(async () => {
      const current = await this.readAll();
      const next = transform(current);
      await this.writeAll(next);
      return next;
    });
  }

  private async writeAll(items: T[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(items, null, 2), "utf8");
    await rename(tempPath, this.filePath);
  }

  private enqueue<R>(task: () => Promise<R>): Promise<R> {
    const result = this.queue.then(task, task);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
