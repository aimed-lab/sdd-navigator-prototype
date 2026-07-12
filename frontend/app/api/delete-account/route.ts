import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const FRIENDLY_ERROR =
  "Something went wrong while deleting your account. Please try again or contact support.";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("delete-account: missing required Supabase env vars");
    return NextResponse.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }

  let password: unknown;
  try {
    const body = await req.json();
    password = body?.password;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json(
      { error: "Your password is required to delete your account." },
      { status: 400 }
    );
  }

  // ── 1. Identify the caller from their session cookie. getUser() validates the JWT
  //       against Supabase directly — never trust a client-supplied user id. ───────────
  const cookieStore = await cookies();
  const sessionClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Not required for this short-lived request — ignore.
        }
      },
    },
  });

  const { data: { user }, error: userError } = await sessionClient.auth.getUser();
  if (userError || !user || !user.email) {
    return NextResponse.json({ error: "You must be signed in to do this." }, { status: 401 });
  }

  // ── 2. Re-verify the password before doing anything destructive. A fresh, throwaway
  //       client with no session persistence — this never touches the caller's cookies. ──
  const passwordCheckClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: verifyData, error: verifyError } = await passwordCheckClient.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (verifyError || !verifyData.user || verifyData.user.id !== user.id) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  // ── 3. Service-role client — bypasses RLS and can call admin.deleteUser(). This key is
  //       read only from process.env on the server and never sent to the browser. ────────
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = user.id;

  try {
    const { error: worksError } = await admin.from("researcher_works").delete().eq("user_id", userId);
    if (worksError) throw worksError;

    const { error: commentsError } = await admin.from("comments").delete().eq("user_id", userId);
    if (commentsError) throw commentsError;

    // The live `projects` table is single-owner, keyed by user_id (not the old
    // owner_id / project_members multi-member design, which no longer exists).
    // Its user_id → auth.users FK is ON DELETE CASCADE, so admin.deleteUser below
    // would remove these anyway; we delete them explicitly here (as with
    // works/comments above) so the cleanup is self-documenting and stays correct
    // even if that cascade is ever dropped.
    const { error: projectsError } = await admin.from("projects").delete().eq("user_id", userId);
    if (projectsError) throw projectsError;

    const { error: usersError } = await admin.from("users").delete().eq("id", userId);
    if (usersError) throw usersError;

    // Removing the auth user cascades (ON DELETE CASCADE) to any remaining
    // user-owned rows — saved_items, connection_requests, and the tables above —
    // so nothing is left orphaned.
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthError) throw deleteAuthError;
  } catch (err) {
    // Intentionally generic — never leak raw Supabase/Postgres error details to the client.
    console.error("delete-account: fatal error during deletion", err);
    return NextResponse.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
