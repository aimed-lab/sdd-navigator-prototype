"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const AFFILIATIONS = [
  "Clinical Researcher",
  "Data Scientist",
  "Institutional Administrator",
  "Pharma R&D Partner",
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "Canada",
  "Australia",
  "India",
  "France",
  "Japan",
  "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    affiliation: AFFILIATIONS[0],
    institution: "",
    country: COUNTRIES[0],
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in → go to hub.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/knowledge-hub");
    }
  }, [user, loading, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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

    // 1. Create auth user with metadata.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name:        form.name,
          affiliation: form.affiliation,
          institution: form.institution,
          country:     form.country,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    // 2. Insert profile row into public.users table.
    if (data.user) {
      const { error: profileError } = await supabase.from("users").insert({
        id:          data.user.id,
        name:        form.name,
        email:       form.email,
        affiliation: form.affiliation,
        institution: form.institution,
        country:     form.country,
      });

      if (profileError) {
        console.warn("Profile insert failed:", profileError.message);
      }
    }

    // 3. Redirect to Knowledge Hub.
    router.push("/knowledge-hub");
  }

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center px-margin-mobile md:px-margin-desktop py-stack-lg relative overflow-hidden">
        {/* Atmospheric blobs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-fixed-dim/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary-fixed/20 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="h-1 bg-primary w-full" />

          <div className="p-stack-lg flex flex-col gap-stack-md">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <h1 className="font-headline-md text-headline-md text-primary font-bold">
                  Create Research Profile
                </h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Join the global network of clinical data scientists.
                </p>
              </div>
              <Link href="/login">
                <button className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </Link>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error-container border border-error/30 text-error font-body-sm text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-x-gutter gap-y-stack-md"
              onSubmit={handleSubmit}
            >
              {/* Full Name */}
              <div className="flex flex-col gap-base col-span-2">
                <label className="font-label-md text-label-md text-on-surface-variant">
                  FULL NAME
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors">
                    person
                  </span>
                  <input
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-base">
                <label className="font-label-md text-label-md text-on-surface-variant">
                  INSTITUTIONAL EMAIL
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors">
                    mail
                  </span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    placeholder="jane.smith@uab.edu"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-base">
                <label className="font-label-md text-label-md text-on-surface-variant">
                  PASSWORD
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors">
                    lock
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    value={form.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    placeholder="Min. 8 characters"
                  />
                </div>
              </div>

              {/* Affiliation */}
              <div className="flex flex-col gap-base">
                <label className="font-label-md text-label-md text-on-surface-variant">
                  AFFILIATION
                </label>
                <div className="relative">
                  <select
                    name="affiliation"
                    value={form.affiliation}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    {AFFILIATIONS.map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Institution */}
              <div className="flex flex-col gap-base">
                <label className="font-label-md text-label-md text-on-surface-variant">
                  INSTITUTION
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors">
                    school
                  </span>
                  <input
                    type="text"
                    name="institution"
                    required
                    value={form.institution}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    placeholder="University of Alabama at Birmingham"
                  />
                </div>
              </div>

              {/* Country */}
              <div className="flex flex-col gap-base">
                <label className="font-label-md text-label-md text-on-surface-variant">
                  COUNTRY
                </label>
                <div className="relative">
                  <select
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Data Usage Agreement */}
              <div className="col-span-2 p-4 bg-surface-container-low border border-outline-variant rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    I confirm that I am a certified professional in the life sciences field and agree
                    to the{" "}
                    <a href="#" className="text-primary font-semibold hover:underline">Data Usage Agreement</a>
                    {" "}and{" "}
                    <a href="#" className="text-primary font-semibold hover:underline">Clinical Privacy Policy</a>.
                    This platform is intended for institutional and research use only.
                  </span>
                </label>
              </div>

              {/* Submit */}
              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-on-primary font-title-md text-title-md py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                      Creating Account…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">shield_person</span>
                      Create Free Account
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>

          <div className="bg-surface-container-low px-stack-lg py-stack-sm flex items-center justify-center gap-2 border-t border-outline-variant">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">verified_user</span>
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
