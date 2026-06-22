import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const FRIENDLY_ERROR =
  "Something went wrong while deleting your account. Please try again or contact support.";

type FlaggedProject = { id: string; name: string | null; otherMemberCount: number };

// `projects` / `project_members` aren't part of this app's documented schema (see CLAUDE.md) —
// they may not exist in the live database at all. Treat "relation does not exist" as a no-op,
// not a failure, so the rest of account deletion still proceeds.
function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /does not exist|could not find the table/i.test(error.message ?? "");
}

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
  const warnings: string[] = [];
  const flaggedProjects: FlaggedProject[] = [];

  try {
    const { error: worksError } = await admin.from("researcher_works").delete().eq("user_id", userId);
    if (worksError) throw worksError;

    const { error: commentsError } = await admin.from("comments").delete().eq("user_id", userId);
    if (commentsError) throw commentsError;

    // ── Projects / project_members — defensive, schema not documented in this app. ──────
    const { data: ownedProjects, error: ownedError } = await admin
      .from("projects")
      .select("id, name")
      .eq("owner_id", userId);

    if (ownedError && !isMissingTableError(ownedError)) {
      console.error("delete-account: projects lookup failed", ownedError);
      warnings.push("Could not check project ownership — any owned projects were left untouched.");
    } else if (!ownedError && ownedProjects) {
      const { data: myMemberships, error: membershipError } = await admin
        .from("project_members")
        .select("project_id")
        .eq("user_id", userId);

      if (membershipError && !isMissingTableError(membershipError)) {
        console.error("delete-account: project_members lookup failed", membershipError);
        warnings.push("Could not check project memberships — left untouched.");
      } else if (!membershipError) {
        const soleOwnedIds: string[] = [];

        for (const project of ownedProjects) {
          const { data: otherMembers, error: othersError } = await admin
            .from("project_members")
            .select("user_id")
            .eq("project_id", project.id)
            .neq("user_id", userId);

          if (othersError) {
            console.error("delete-account: project_members check failed", othersError);
            warnings.push(`Could not verify members of project "${project.name ?? project.id}" — left untouched.`);
            continue;
          }

          if (otherMembers && otherMembers.length > 0) {
            flaggedProjects.push({
              id: project.id,
              name: project.name ?? null,
              otherMemberCount: otherMembers.length,
            });
          } else {
            soleOwnedIds.push(project.id);
          }
        }

        // Remove this user's own membership rows everywhere EXCEPT the flagged projects,
        // which are left fully intact (project + all memberships) for manual review.
        const flaggedIds = new Set(flaggedProjects.map((p) => p.id));
        const membershipIdsToClear = (myMemberships ?? [])
          .map((m) => m.project_id)
          .filter((id) => !flaggedIds.has(id));

        if (membershipIdsToClear.length > 0) {
          const { error: memberDeleteError } = await admin
            .from("project_members")
            .delete()
            .eq("user_id", userId)
            .in("project_id", membershipIdsToClear);
          if (memberDeleteError) {
            console.error("delete-account: project_members delete failed", memberDeleteError);
            warnings.push("Could not remove all project memberships.");
          }
        }

        if (soleOwnedIds.length > 0) {
          const { error: projectDeleteError } = await admin.from("projects").delete().in("id", soleOwnedIds);
          if (projectDeleteError) {
            console.error("delete-account: projects delete failed", projectDeleteError);
            warnings.push("Could not delete one or more solely-owned projects.");
          }
        }
      }
    }

    const { error: usersError } = await admin.from("users").delete().eq("id", userId);
    if (usersError) throw usersError;

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthError) throw deleteAuthError;
  } catch (err) {
    // Intentionally generic — never leak raw Supabase/Postgres error details to the client.
    console.error("delete-account: fatal error during deletion", err);
    return NextResponse.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }

  return NextResponse.json({ success: true, flaggedProjects, warnings });
}
