"use client";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const callbackUrl = searchParams.get("callbackUrl") || "/knowledge-hub";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(callbackUrl);
  }, [user, loading, router, callbackUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
    } else {
      if (data.user) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("id", data.user.id)
          .single();
        if (!existingUser) {
          await supabase.from("users").insert({
            id: data.user.id,
            name: data.user.user_metadata?.name ?? email.split("@")[0],
            email: data.user.email ?? email,
            affiliation: data.user.user_metadata?.affiliation ?? "",
            institution: data.user.user_metadata?.institution ?? "",
            country: data.user.user_metadata?.country ?? "",
          });
        }
      }
      router.push(callbackUrl);
    }
  }

  return (
    <div className="bg-background min-h-screen flex flex-col academic-grid-pattern">
      {/* Minimal nav */}
      <header className="bg-surface shadow-sm">
        <div className="flex justify-between items-center w-full px-gutter max-w-[1280px] mx-auto h-20">
          <Link href="/">
            <span className="font-display-lg text-display-lg font-bold text-primary cursor-pointer">
              SDD Navigator
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/knowledge-hub" className="text-on-surface-variant font-medium hover:text-primary-container transition-colors font-body-md text-body-md">
              Knowledge Hub
            </Link>
            <Link href="/navigator" className="text-on-surface-variant font-medium hover:text-primary-container transition-colors font-body-md text-body-md">
              Navigator
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/login")}
              className="text-on-surface-variant font-medium hover:text-primary-container transition-all px-4 py-2 font-label-sm text-label-sm"
            >
              Sign In
            </button>
            <Link href="/register">
              <button className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-container transition-all shadow-sm font-label-sm text-label-sm">
                Register
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-xl px-gutter relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary opacity-5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary opacity-5 rounded-full blur-3xl pointer-events-none" />

        <section className="w-full max-w-[440px] mx-4 sm:mx-0">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-lg shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            {/* Header */}
            <div className="mb-lg text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-container rounded-full mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">lock_open</span>
              </div>
              <h1 className="font-headline-md text-headline-md text-primary mb-2">Sign In</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Access your academic roadmaps and data.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error-container border border-error/30 text-error font-body-md text-body-md flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Email Address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.edu"
                  className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Password</label>
                  <a href="#" className="font-label-sm text-label-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 pr-12 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline cursor-pointer hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-on-primary font-bold py-4 rounded-lg hover:bg-primary-container active:scale-[0.98] transition-all shadow-md font-body-lg text-body-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-surface-container-lowest px-2 font-label-sm text-label-sm text-on-surface-variant">
                    OR CONTINUE WITH
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 border border-outline-variant rounded-lg py-2.5 hover:bg-surface-container-low transition-colors font-label-sm text-label-sm text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">business</span>
                  Institutional SSO
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 border border-outline-variant rounded-lg py-2.5 hover:bg-surface-container-low transition-colors font-label-sm text-label-sm text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">account_circle</span>
                  ORCID iD
                </button>
              </div>

              <div className="pt-2 text-center">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  New to SDD?{" "}
                  <Link href="/register" className="text-primary font-bold hover:underline">
                    Create Account
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
