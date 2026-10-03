import { err, ok, type Result } from "@/shared/result";
import type { Clock } from "@/shared/application/ports/clock";
import type { ProfileRepository } from "@/modules/team/application/ports/profile-repository";
import type { TeamRepository } from "@/modules/team/application/ports/team-repository";
import {
  fallbackDisplayName,
  isProfileInputError,
  normalizeProfileFields,
  sortPeople,
  type Person,
  type Profile,
  type ProfileInputError,
} from "@/modules/team/domain/profile";

export interface PeopleDependencies {
  team: Pick<TeamRepository, "listMembers">;
  profiles: ProfileRepository;
  clock: Clock;
}

/** Everyone on the team, by name. A member without a profile shows the start of their email. */
export function createListPeople(deps: Pick<PeopleDependencies, "team" | "profiles">) {
  return async function listPeople(input: { clientId: string }): Promise<Person[]> {
    const [members, profiles] = await Promise.all([deps.team.listMembers(input.clientId), deps.profiles.list(input.clientId)]);
    const byUser = new Map(profiles.map((profile) => [profile.userId, profile]));

    return sortPeople(
      members.map((member) => {
        const profile = byUser.get(member.userId);
        return {
          userId: member.userId,
          displayName: profile?.displayName ?? fallbackDisplayName(member.email),
          jobTitle: profile?.jobTitle ?? null,
        };
      }),
    );
  };
}

export interface UpdateProfileInput {
  clientId: string;
  userId: string;
  displayName: string;
  jobTitle?: string | null;
}

/** A person edits their own profile: the user id comes from the session, never from the form. */
export function createUpdateProfile(deps: Pick<PeopleDependencies, "profiles" | "clock">) {
  return async function updateProfile(input: UpdateProfileInput): Promise<Result<Profile, ProfileInputError>> {
    const fields = normalizeProfileFields({ displayName: input.displayName, jobTitle: input.jobTitle });
    if (isProfileInputError(fields)) return err(fields);

    const profile: Profile = {
      clientId: input.clientId,
      userId: input.userId,
      displayName: fields.displayName,
      jobTitle: fields.jobTitle,
      updatedAt: deps.clock.now(),
    };
    await deps.profiles.save(profile);
    return ok(profile);
  };
}
