import type { CollectionStore } from "./collection-store";

/** In-memory `CollectionStore` for tests (and any future in-process adapter). */
export class InMemoryStore<T> implements CollectionStore<T> {
  private items: T[] = [];

  async readAll(): Promise<T[]> {
    return [...this.items];
  }

  async mutate(transform: (items: T[]) => T[]): Promise<T[]> {
    this.items = transform(this.items);
    return [...this.items];
  }
}
