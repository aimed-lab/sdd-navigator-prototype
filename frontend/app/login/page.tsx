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
    <div className="bg-background min-h-screen flex flex-col">
      <main
        className="flex-grow flex items-center justify-center px-gutter py-xl"
        style={{
          background:
            "radial-gradient(circle at 10% 20%, rgba(0,82,60,0.04) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(52,104,84,0.05) 0%, transparent 40%)",
        }}
      >
        <div className="w-full max-w-[440px]">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            {/* Logo Section */}
            <div className="pt-10 pb-6 flex flex-col items-center px-8">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-white text-[28px]">biotech</span>
              </div>
              <h1 className="font-headline-md text-headline-md text-on-surface">Welcome back.</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2 text-center">
                Access the SDD Navigator academic intelligence platform.
              </p>
            </div>

            {error && (
              <div className="mx-8 mb-4 p-3 rounded-lg bg-error-container border border-error/30 text-error font-body-md text-body-md flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            {/* Login Form */}
            <form className="px-8 pb-10 space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block font-label-sm text-label-sm text-on-surface-variant">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                  className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline-variant"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">Password</label>
                  <a href="#" className="font-label-sm text-label-sm text-secondary hover:underline transition-all">
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
                    className="w-full h-12 pl-4 pr-12 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline-variant"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-1"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-primary hover:bg-primary-container text-white font-label-sm text-label-sm rounded-lg shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In…
                  </>
                ) : (
                  <>
                    Sign in
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

              {/* Create Account Link */}
              <div className="pt-4 border-t border-outline-variant flex flex-col items-center gap-2">
                <p className="text-sm text-on-surface-variant">New here?</p>
                <Link
                  href="/register"
                  className="font-label-sm text-label-sm text-secondary hover:text-primary-container font-semibold transition-colors"
                >
                  Create an account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer Segment */}
      <footer className="w-full border-t border-outline-variant bg-surface-container-low py-lg px-gutter">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-label-sm text-label-sm font-bold text-on-surface">SDD Navigator</span>
            <span className="text-sm text-secondary">© 2026 SDD Navigator. Academic Research Intelligence Platform.</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Institutional Access</a>
            <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Contact Support</a>
          </nav>
        </div>
      </footer>
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
