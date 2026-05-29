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
            <Link href="/login">
              <button className="text-on-surface-variant font-medium hover:text-primary-container transition-all px-4 py-2 font-label-sm text-label-sm">
                Sign In
              </button>
            </Link>
            <button className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-container transition-all shadow-sm font-label-sm text-label-sm">
              Register
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-xl px-gutter relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary opacity-5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary opacity-5 rounded-full blur-3xl pointer-events-none" />

        <section className="w-full max-w-[560px] mx-4 sm:mx-0">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-lg shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            {/* Header */}
            <div className="mb-lg text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-container rounded-full mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">school</span>
              </div>
              <h1 className="font-headline-md text-headline-md text-primary mb-2">Create Free Account</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Join the global community of researchers and institutions.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error-container border border-error/30 text-error font-body-md text-body-md flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Name + Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Dr. Jane Smith"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="jane.smith@uab.edu"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                />
              </div>

              {/* Affiliation + Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Affiliation</label>
                  <select
                    name="affiliation"
                    value={form.affiliation}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                  >
                    {AFFILIATIONS.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="United States"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                  />
                </div>
              </div>

              {/* Institution */}
              <div className="space-y-1.5">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Institution</label>
                <input
                  type="text"
                  name="institution"
                  value={form.institution}
                  onChange={handleChange}
                  placeholder="University of Alabama at Birmingham"
                  className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                />
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
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

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-on-primary font-bold py-4 rounded-lg hover:bg-primary-container active:scale-[0.98] transition-all shadow-md font-body-lg text-body-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account…
                  </>
                ) : (
                  "Create Free Account"
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary font-bold hover:underline">
                    Sign In
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
