"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { track } from "@/lib/posthog";

// Real (not faked) password strength — based on length + character variety.
// Returns a 0-4 score used to fill the meter bars and pick a label/color.
function passwordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) score++;
  score = Math.min(score, 4);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] };
}

// Bar/label color per strength tier.
const STRENGTH_TEXT = ["", "text-error", "text-uab-gold", "text-secondary", "text-primary"];
const STRENGTH_BAR  = ["", "bg-error", "bg-uab-gold", "bg-secondary", "bg-primary"];

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Real confirm-password validation — block submit on mismatch.
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSubmitting(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // `name` is read server-side by the on_auth_user_created trigger, which
        // creates the public.users profile row with definer rights. We do NOT
        // insert the row from the client: email confirmation is ON, so there's
        // no session yet at signup and an RLS-protected insert would 401.
        data: { name: form.name },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    track("account_created"); // fire-and-forget; never blocks the redirect
    router.push("/register/confirm");
  }

  const strength = passwordStrength(form.password);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel: branded green canvas (hidden on mobile) */}
      <section className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Wordmark — LOCKED to "SDD Navigator" */}
        <div className="z-10">
          <h1 className="font-headline-md text-headline-md font-bold tracking-tight">SDD Navigator</h1>
        </div>

        {/* Center pitch */}
        <div className="z-10 max-w-lg">
          <h2 className="font-display-lg text-display-lg mb-6 leading-tight">Join SDD Navigator</h2>
          <p className="font-body-lg text-body-lg text-primary-fixed/80">
            Start turning research into discovery plans. Access computational tools and molecular
            modeling frameworks designed for the future of drug discovery.
          </p>
        </div>

        {/* Decorative molecular line-art accent (consistent with the login page) */}
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

        {/* Bottom attribution mark */}
        <div className="z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                science
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-white/60 uppercase tracking-widest">
                Collaborative Infrastructure
              </span>
              <span className="text-sm text-white font-semibold">Built at UAB SPARC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right panel: form area */}
      <section className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 md:p-10 overflow-y-auto">
        <div className="w-full max-w-[380px] space-y-8">
          {/* Mobile wordmark (left panel hidden on small screens) */}
          <Link href="/" className="lg:hidden inline-block">
            <span className="font-headline-md text-headline-md font-bold text-primary">SDD Navigator</span>
          </Link>

          {/* Header */}
          <header className="space-y-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">Create your account</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Free — open to all researchers</p>
          </header>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-error-container border border-error/20 text-error">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span className="font-body-md text-body-md">{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block font-label-sm text-label-sm text-on-surface-variant">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Dr. Jane Smith"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block font-label-sm text-label-sm text-on-surface-variant">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane.smith@research.edu"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block font-label-sm text-label-sm text-on-surface-variant">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-1 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>

              {/* Real password strength meter (only once typing starts) */}
              {form.password && (
                <div className="flex items-center gap-2 mt-2 px-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 w-8 rounded-full transition-colors ${
                          i <= strength.score ? STRENGTH_BAR[strength.score] : "bg-outline-variant"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${STRENGTH_TEXT[strength.score]}`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block font-label-sm text-label-sm text-on-surface-variant">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-1 transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined">
                    {showConfirm ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm shadow-sm hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create account
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer links */}
          <div className="text-center space-y-4">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="text-secondary font-semibold hover:underline decoration-2 underline-offset-4">
                Log in
              </Link>
            </p>
            <p className="text-[12px] leading-relaxed text-outline">
              By creating an account, you agree to our{" "}
              <a href="#" className="underline hover:text-primary">Terms of Service</a> and{" "}
              <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
