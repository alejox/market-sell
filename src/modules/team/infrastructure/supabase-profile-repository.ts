import type { SupabaseClientProvider } from "@/shared/infrastructure/supabase/client-provider";
import { unwrapList, unwrapMaybe, unwrapWrite } from "@/shared/infrastructure/supabase/errors";
import type { ProfileRepository } from "@/modules/team/application/ports/profile-repository";
import type { Profile } from "@/modules/team/domain/profile";

const TABLE = "profiles";

/** Row shape of `public.profiles` (see the profiles_and_assignees migration). */
interface ProfileRow {
  client_id: string;
  user_id: string;
  display_name: string;
  job_title: string | null;
  updated_at: string;
}

function fromRow(row: ProfileRow): Profile {
  return {
    clientId: row.client_id,
    userId: row.user_id,
    displayName: row.display_name,
    jobTitle: row.job_title,
    updatedAt: row.updated_at,
  };
}

/** Runs as the signed-in user under RLS: everyone on the team reads all profiles, each person writes only their own. */
export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly getClient: SupabaseClientProvider) {}

  async list(clientId: string): Promise<Profile[]> {
    const supabase = await this.getClient();
    const result = await supabase.from(TABLE).select("*").eq("client_id", clientId);
    return unwrapList<ProfileRow>(`${TABLE}.list`, result).map(fromRow);
  }

  async getByUser(clientId: string, userId: string): Promise<Profile | null> {
    const supabase = await this.getClient();
    const result = await supabase.from(TABLE).select("*").eq("client_id", clientId).eq("user_id", userId).maybeSingle();
    const row = unwrapMaybe<ProfileRow>(`${TABLE}.getByUser`, result);
    return row ? fromRow(row) : null;
  }

  async save(profile: Profile): Promise<void> {
    const supabase = await this.getClient();
    const result = await supabase.from(TABLE).upsert(
      {
        client_id: profile.clientId,
        user_id: profile.userId,
        display_name: profile.displayName,
        job_title: profile.jobTitle,
        updated_at: profile.updatedAt,
      } satisfies ProfileRow,
      { onConflict: "client_id,user_id" },
    );
    unwrapWrite(`${TABLE}.save`, result);
  }
}
