"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect away
  useEffect(() => {
    if (!loading && user) {
      router.push("/navigator");
    }
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      router.push("/navigator");
    }
  }

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center px-margin-mobile md:px-margin-desktop py-stack-lg relative overflow-hidden">
        {/* Atmospheric background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-fixed-dim/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-fixed/20 rounded-full blur-[120px]" />
        </div>

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-[440px] bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden flex flex-col">
          {/* Green accent bar */}
          <div className="h-1 bg-primary w-full" />

          <div className="p-stack-lg flex flex-col gap-stack-md">
            {/* Header */}
            <div className="flex flex-col items-center gap-base mb-2">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-on-primary mb-2">
                <span className="material-symbols-outlined text-[32px]">
                  science
                </span>
              </div>
              <h1 className="font-title-lg text-title-lg text-primary tracking-tight font-bold">
                SDD Navigator
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center max-w-[280px]">
                Secure access for clinical and translational science
                researchers.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-error-container border border-error/30 text-error font-body-sm text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">
                  error
                </span>
                {error}
              </div>
            )}

            {/* Form */}
            <form className="flex flex-col gap-stack-md" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="flex flex-col gap-base">
                <label
                  className="font-label-md text-label-md text-on-surface-variant"
                  htmlFor="email"
                >
                  EMAIL ADDRESS
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors">
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    placeholder="researcher@uab.edu"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-base">
                <div className="flex justify-between items-center">
                  <label
                    className="font-label-md text-label-md text-on-surface-variant"
                    htmlFor="password"
                  >
                    PASSWORD
                  </label>
                  <a
                    href="#"
                    className="font-label-md text-label-md text-primary hover:underline transition-all"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors">
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface transition-colors"
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
                className="mt-2 w-full bg-primary text-on-primary font-title-md text-title-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-stack-md py-stack-sm">
              <div className="h-[1px] flex-grow bg-outline-variant" />
              <span className="font-label-md text-label-md text-on-surface-variant/60">
                OR
              </span>
              <div className="h-[1px] flex-grow bg-outline-variant" />
            </div>

            {/* Register link */}
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-primary font-semibold hover:underline transition-all"
              >
                Register
              </Link>
            </p>
          </div>

          {/* SSO Footer bar */}
          <div className="bg-surface-container-low px-stack-lg py-stack-sm flex items-center justify-center gap-2 border-t border-outline-variant">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              verified_user
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              Institutional Single Sign-On Enabled
            </span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
