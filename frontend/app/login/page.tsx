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
  const callbackUrl = searchParams.get("callbackUrl") || "/";

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
    <div className="min-h-screen flex bg-background">
      {/* Left panel: branded green canvas (hidden on mobile) */}
      <section className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Wordmark — LOCKED to "SDD Navigator" */}
        <div className="z-10">
          <h1 className="font-headline-md text-headline-md font-bold tracking-tight">SDD Navigator</h1>
        </div>

        {/* Center pitch */}
        <div className="z-10 max-w-md">
          <h2 className="font-display-lg text-display-lg mb-4">
            AI-driven drug discovery for every researcher
          </h2>
          <p className="font-body-lg text-body-lg text-primary-fixed/80">
            Turn your project into a phased discovery plan.
          </p>
        </div>

        {/* Decorative molecular line-art accent */}
        <div className="absolute inset-0 opacity-20 pointer-events-none text-primary-fixed">
          <div className="absolute top-1/4 right-0 w-96 h-96 border border-primary-fixed rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-1/4 -left-20 w-80 h-80 border border-primary-fixed rounded-full blur-2xl opacity-20" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" fill="currentColor" r="2" />
            <circle cx="300" cy="150" fill="currentColor" r="3" />
            <circle cx="200" cy="400" fill="currentColor" r="2" />
            <circle cx="500" cy="300" fill="currentColor" r="4" />
            <circle cx="600" cy="600" fill="currentColor" r="2" />
            <circle cx="150" cy="700" fill="currentColor" r="3" />
            <path
              d="M100 100 L300 150 M300 150 L500 300 M500 300 L600 600 M200 400 L500 300 M150 700 L200 400"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        {/* Bottom attribution */}
        <div className="z-10">
          <p className="font-label-sm text-label-sm tracking-widest opacity-60 uppercase">Built at UAB SPARC</p>
        </div>
      </section>

      {/* Right panel: form area */}
      <section className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 md:p-10">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile wordmark (left panel is hidden on small screens) */}
          <Link href="/" className="lg:hidden inline-block">
            <span className="font-headline-md text-headline-md font-bold text-primary">SDD Navigator</span>
          </Link>

          {/* Header */}
          <header className="space-y-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">Welcome back.</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Log in to your account.</p>
          </header>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-error-container border border-error/20 text-error">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span className="font-body-md text-body-md">{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block font-label-sm text-label-sm text-on-surface">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full px-4 py-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block font-label-sm text-label-sm text-on-surface">
                  Password
                </label>
                <a href="#" className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-12 py-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-1 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm shadow-sm hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Log in"
              )}
            </button>
          </form>

          {/* Footer link */}
          <footer className="pt-4 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-secondary font-semibold hover:underline transition-all">
                Sign up
              </Link>
            </p>
          </footer>
        </div>
      </section>
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
