import type { ProfileRepository } from "@/modules/team/application/ports/profile-repository";
import type { Profile } from "@/modules/team/domain/profile";

/** Test double, and the local fallback when Supabase is not configured (nothing is persisted). */
export class InMemoryProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, Profile>();

  private key(clientId: string, userId: string) {
    return `${clientId}:${userId}`;
  }

  async list(clientId: string): Promise<Profile[]> {
    return [...this.profiles.values()].filter((profile) => profile.clientId === clientId).map((profile) => ({ ...profile }));
  }

  async getByUser(clientId: string, userId: string): Promise<Profile | null> {
    const found = this.profiles.get(this.key(clientId, userId));
    return found ? { ...found } : null;
  }

  async save(profile: Profile): Promise<void> {
    this.profiles.set(this.key(profile.clientId, profile.userId), { ...profile });
  }
}
