import type { Profile } from "@/modules/team/domain/profile";

/** Profiles are scoped by client (like membership). Nothing here deletes a profile. */
export interface ProfileRepository {
  list(clientId: string): Promise<Profile[]>;
  getByUser(clientId: string, userId: string): Promise<Profile | null>;
  save(profile: Profile): Promise<void>;
}
