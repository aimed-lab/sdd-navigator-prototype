import { createClient } from "@supabase/supabase-js";
import { getRouteClient } from "@/lib/supabaseRoute";

// =============================================================================
// lib/server — single entry point for server-side Supabase access.
// =============================================================================
// Two clients, two trust levels. Every lib/server module MUST get its client
// from here so the RLS/session model stays consistent across the codebase.
//
//   • getSessionClient()  — user-scoped, cookie-based, RLS-enforcing. This is a
//                           re-export of the SAME getRouteClient() the projects
//                           API already uses (consolidated, not duplicated).
//                           Use for anything user-owned; uid is always derived
//                           from getUser() on the returned client, never passed
//                           in from the caller.
//   • getAnonServerClient() — anon key, no session/cookies. Public-read RLS only
//                           (wiki, graph, public researcher profiles). NEVER use
//                           it for user-scoped reads/writes.
//
// Both return null when the required env vars are missing so callers can fail
// cleanly with a 500 rather than throwing at construction.
// =============================================================================

// Session-scoped client (cookie-based, RLS). Consolidated re-export of the
// existing route-handler client — one source of truth for "act as this user".
export const getSessionClient = getRouteClient;

// Anon server client for PUBLIC reads only. No persisted session; relies on
// public-read RLS. Do not use for user-owned data.
export function getAnonServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
