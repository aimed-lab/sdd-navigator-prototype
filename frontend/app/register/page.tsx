"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const AFFILIATIONS = ["Researcher", "Laboratory Head", "Institutional Admin", "Graduate Student"];

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    affiliation: AFFILIATIONS[0],
    country: "",
    institution: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/knowledge-hub");
  }, [user, loading, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }
    setError("");
    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          affiliation: form.affiliation,
          institution: form.institution,
          country: form.country,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (data.user) {
      await supabase.from("users").insert({
        id: data.user.id,
        name: form.name,
        email: form.email,
        affiliation: form.affiliation,
        institution: form.institution,
        country: form.country,
      });
    }

    router.push("/knowledge-hub");
  }

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      {/* Minimal header — transactional screen, global nav suppressed */}
      <header className="h-16 w-full flex items-center px-gutter max-w-[1280px] mx-auto">
        <Link href="/">
          <span className="font-headline-md text-headline-md font-bold text-primary cursor-pointer">
            SDD Navigator
          </span>
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center py-lg px-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm w-full max-w-md p-6 sm:p-lg">
          {/* Heading */}
          <div className="text-center mb-lg">
            <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Create your account</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Join the academic research intelligence network.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error-container border border-error/30 text-error font-body-md text-body-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          {/* Registration Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-on-surface-variant block">Full Name</label>
              <input
                type="text"
                name="name"
                required
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Dr. Jane Smith"
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all font-body-md text-body-md"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-on-surface-variant block">Email</label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane.smith@institution.edu"
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all font-body-md text-body-md"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-on-surface-variant block">Password</label>
              <input
                type="password"
                name="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all font-body-md text-body-md"
              />
            </div>

            {/* Affiliation Dropdown */}
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-on-surface-variant block">Affiliation</label>
              <div className="relative">
                <select
                  name="affiliation"
                  value={form.affiliation}
                  onChange={handleChange}
                  className="w-full h-12 px-4 appearance-none rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all font-body-md text-body-md"
                >
                  {AFFILIATIONS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                  expand_more
                </span>
              </div>
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-on-surface-variant block">Institution</label>
              <input
                type="text"
                name="institution"
                value={form.institution}
                onChange={handleChange}
                placeholder="University of Alabama at Birmingham"
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all font-body-md text-body-md"
              />
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-on-surface-variant block">Country</label>
              <input
                type="text"
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="United States"
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all font-body-md text-body-md"
              />
            </div>

            {/* Terms — required by existing validation; not present in the new design */}
            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 rounded text-primary focus:ring-primary border-outline-variant"
              />
              <label htmlFor="agree" className="font-body-md text-body-md text-on-surface-variant leading-tight cursor-pointer">
                I agree to the{" "}
                <a href="#" className="text-primary hover:underline font-semibold">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-primary hover:underline font-semibold">Privacy Policy</a>.
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-secondary text-on-secondary font-label-sm text-label-sm rounded-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account…
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

          {/* Bottom Link */}
          <div className="mt-lg text-center">
            <p className="text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="text-secondary font-semibold hover:underline decoration-2 underline-offset-4 transition-all">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer Segment */}
      <footer className="w-full py-md border-t border-outline-variant bg-surface-container-low">
        <div className="max-w-[1280px] mx-auto px-gutter flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-on-surface-variant">© 2026 SDD Navigator. Academic Research Intelligence Platform.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-on-surface-variant hover:text-secondary">Privacy Policy</a>
            <a href="#" className="text-xs text-on-surface-variant hover:text-secondary">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
