// lib/server/account.ts — account settings table ops (session-scoped, RLS).
//
// STEP 4a SCAFFOLD: signatures only. The users-table reads/writes move here from
// settings/page.tsx during Phase C. The auth.* calls (updateUser email/password,
// signOut) STAY client-side and are deliberately NOT represented here.

const NOT_IMPLEMENTED = "lib/server/account: not implemented yet (Step 4a migration pending)";

export type AccountSettings = {
  name: string | null;
  affiliation: string | null;
  institution: string | null;
  country: string | null;
  notify_weekly: boolean;
  notify_daily: boolean;
  is_public: boolean;
  profile_slug: string | null;
};

export type ProfileFieldPatch = Partial<
  Pick<AccountSettings, "name" | "affiliation" | "institution" | "country">
>;

export async function getAccountSettings(): Promise<AccountSettings> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function updateProfileFields(_patch: ProfileFieldPatch): Promise<void> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function toggleNotification(
  _field: "notify_weekly" | "notify_daily",
  _value: boolean,
): Promise<void> {
  throw new Error(NOT_IMPLEMENTED);
}
