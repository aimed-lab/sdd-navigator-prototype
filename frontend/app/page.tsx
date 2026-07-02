import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import LandingLoggedOut from "@/components/LandingLoggedOut";
import HomeDashboard from "@/components/HomeDashboard";

// "/" branches on auth (server-side, so no logged-out→dashboard flash):
//   • Not logged in → the public marketing landing (unchanged).
//   • Logged in     → the researcher home/dashboard.
// "/" stays public (no redirect-to-login) — the landing must remain reachable.
export default async function RootPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // "/" is a read-only server component — cookie refresh is handled by
        // middleware, so a no-op setAll is correct here.
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? <HomeDashboard /> : <LandingLoggedOut />;
}
