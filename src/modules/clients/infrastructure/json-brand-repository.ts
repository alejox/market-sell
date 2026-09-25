import { IdentifiedRepository } from "@/shared/infrastructure/identified-repository";
import { JsonFileStore } from "@/shared/infrastructure/json-file-store";
import type { BrandRepository } from "@/modules/clients/application/ports/brand-repository";
import type { Brand } from "@/modules/clients/domain/brand";

export class JsonBrandRepository implements BrandRepository {
  private readonly repo: IdentifiedRepository<Brand>;

  constructor(filePath: string) {
    this.repo = new IdentifiedRepository<Brand>(new JsonFileStore<Brand>(filePath));
  }

  async listByClient(clientId: string): Promise<Brand[]> {
    const all = await this.repo.list();
    return all.filter((brand) => brand.clientId === clientId);
  }

  async getById(clientId: string, brandId: string): Promise<Brand | null> {
    const brand = await this.repo.getById(brandId);
    return brand && brand.clientId === clientId ? brand : null;
  }

  save(brand: Brand): Promise<void> {
    return this.repo.save(brand);
  }

  /** Never overwrites an existing brand — used by seed/import, safe under concurrent serverless instances. */
  insertIfAbsent(brand: Brand): Promise<boolean> {
    return this.repo.insertIfAbsent(brand);
  }
}
