import { readFile } from "node:fs/promises";

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}

/**
 * Reads one `.data/<collection>.json` file for the importer. Mirrors
 * `JsonFileStore.readAll`'s behavior: a missing file (e.g. `.data` never had
 * a `review-decisions.json` or `result-snapshots.json`, per this project's
 * current data) reads as an empty collection, not an error.
 */
export async function readJsonCollection<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if (isEnoent(error)) return [];
    throw error;
  }
}
