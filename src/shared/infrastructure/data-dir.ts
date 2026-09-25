import { join, resolve } from "node:path";

/** Resolves the on-disk path for one JSON collection file under DATA_DIR (default ".data"). */
export function collectionFilePath(collection: string, dataDir: string = process.env.DATA_DIR ?? ".data"): string {
  return join(resolve(dataDir), `${collection}.json`);
}
