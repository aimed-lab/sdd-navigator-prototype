"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const affiliationOptions = [
  "Clinical Researcher",
  "Data Scientist",
  "Institutional Administrator",
  "Pharma R&D Partner",
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    affiliation: affiliationOptions[0],
    institution: "",
    country: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect away
  useEffect(() => {
    if (!loading && user) {
      router.push("/navigator");
    }
  }, [user, loading, router]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please accept the Data Usage Agreement to continue.");
      return;
    }
    setError("");
    setSubmitting(true);

    // 1. Create auth user
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

    // 2. Insert profile row into public.users
    if (data.user) {
      const { error: profileError } = await supabase.from("users").insert({
        id: data.user.id,
        name: form.name,
        email: form.email,
        affiliation: form.affiliation,
        institution: form.institution,
        country: form.country,
      });

      if (profileError) {
        // Non-fatal: auth user was created; profile row may fail if table doesn't exist yet
        console.warn("Profile insert failed:", profileError.message);
      }
    }

    setSuccess(
      "Account created! Check your email to confirm your address, then log in."
    );
    setSubmitting(false);
  }

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen relative flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-16 h-20 max-w-[1440px] mx-auto bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.1)]">
        <Link
          href="/"
          className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight"
        >
          SDD Navigator
        </Link>
        <div className="flex gap-6 items-center">
          <span className="font-data-label text-data-label text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="status-pulse-ring absolute inline-flex h-full w-full rounded-full bg-status-pulse opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-pulse" />
            </span>
            Secure Terminal v4.2
          </span>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 relative">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 245, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 245, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 md:px-16 flex justify-center z-10">
          <div className="w-full max-w-2xl">
            <div className="glass-card p-8 md:p-12 rounded-xl shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50" />

              <header className="mb-8 flex justify-between items-start">
                <div>
                  <div className="font-data-label text-data-label text-status-pulse mb-2 tracking-[0.2em] uppercase">
                    Registration Pipeline
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-primary mb-2">
                    Create Research Profile
                  </h1>
                  <p className="text-on-surface-variant font-body-md">
                    Join the global network of clinical data scientists.
                  </p>
                </div>
                <Link href="/login">
                  <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">
                      close
                    </span>
                  </button>
                </Link>
              </header>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-error/10 border border-error/30 text-error font-data-label text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">
                    error
                  </span>
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/30 text-primary font-data-label text-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] mt-0.5">
                    check_circle
                  </span>
                  {success}
                </div>
              )}

              {!success && (
                <form
                  className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6"
                  onSubmit={handleSubmit}
                >
                  <div className="space-y-2 col-span-2">
                    <label className="font-data-label text-data-label text-on-surface-variant uppercase ml-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] focus:border-primary text-on-surface px-4 py-3 rounded-t-lg transition-all outline-none"
                      placeholder="Dr. Jane Smith"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-data-label text-data-label text-on-surface-variant uppercase ml-1">
                      Academic Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] focus:border-primary text-on-surface px-4 py-3 rounded-t-lg transition-all outline-none"
                      placeholder="jane.smith@mit.edu"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-data-label text-data-label text-on-surface-variant uppercase ml-1">
                      Access Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] focus:border-primary text-on-surface px-4 py-3 rounded-t-lg transition-all outline-none"
                      placeholder="Min. 8 characters"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-data-label text-data-label text-on-surface-variant uppercase ml-1">
                      Affiliation Level
                    </label>
                    <select
                      name="affiliation"
                      value={form.affiliation}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] focus:border-primary text-on-surface px-4 py-3 rounded-t-lg transition-all outline-none appearance-none cursor-pointer"
                    >
                      {affiliationOptions.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-data-label text-data-label text-on-surface-variant uppercase ml-1">
                      Institution
                    </label>
                    <input
                      type="text"
                      name="institution"
                      required
                      value={form.institution}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] focus:border-primary text-on-surface px-4 py-3 rounded-t-lg transition-all outline-none"
                      placeholder="Harvard Medical School"
                    />
                  </div>

                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="font-data-label text-data-label text-on-surface-variant uppercase ml-1">
                      Country / Territory
                    </label>
                    <input
                      type="text"
                      name="country"
                      required
                      value={form.country}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] focus:border-primary text-on-surface px-4 py-3 rounded-t-lg transition-all outline-none"
                      placeholder="United States"
                    />
                  </div>

                  <div className="col-span-2 pt-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1 rounded bg-surface-container border-[rgba(255,255,255,0.1)] text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-on-surface-variant leading-snug">
                        I confirm that I am a certified professional in the life
                        sciences field and agree to the{" "}
                        <a href="#" className="text-primary hover:underline">
                          Data Usage Agreement
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-primary hover:underline">
                          Clinical Privacy Policy
                        </a>
                        .
                      </span>
                    </label>
                  </div>

                  <div className="col-span-2 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 bg-primary-container text-on-primary-container font-headline-lg text-lg rounded-lg transition-all duration-150 ease-in-out active:scale-95 hover:shadow-[0_0_25px_rgba(0,245,255,0.5)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <span className="w-5 h-5 border-2 border-on-primary-container/30 border-t-on-primary-container rounded-full animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">
                            shield_person
                          </span>
                          <span>Create Free Account</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-on-surface-variant text-sm">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-primary font-bold hover:underline underline-offset-4"
                  >
                    Login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
