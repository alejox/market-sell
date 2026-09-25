import { IdentifiedRepository } from "@/shared/infrastructure/identified-repository";
import { InMemoryStore } from "@/shared/infrastructure/in-memory-store";
import type { BrandRepository } from "@/modules/clients/application/ports/brand-repository";
import type { Brand } from "@/modules/clients/domain/brand";

export class InMemoryBrandRepository implements BrandRepository {
  private readonly repo = new IdentifiedRepository<Brand>(new InMemoryStore<Brand>());

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
}
