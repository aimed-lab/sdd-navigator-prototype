"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// Must stay in sync with the list in register/page.tsx — that's the only
// other place a user's affiliation is ever set.
const AFFILIATIONS = ["Researcher", "Laboratory Head", "Institutional Admin", "Graduate Student"];

const MIN_PASSWORD_LENGTH = 8;

type SectionKey = "profile" | "account" | "notifications";

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "profile", label: "Profile", icon: "account_circle" },
  { key: "account", label: "Account", icon: "settings" },
  { key: "notifications", label: "Notifications", icon: "notifications_active" },
];

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer" aria-label={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
    </label>
  );
}

function SuccessBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary font-body-md text-body-md">
      <span className="material-symbols-outlined text-[16px]">check_circle</span>
      <span>{children}</span>
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-error-container text-on-error-container font-body-md text-body-md">
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<SectionKey>("profile");

  // Redirect if not logged in (same pattern as profile/setup/page.tsx;
  // middleware also protects this route server-side).
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?callbackUrl=/settings");
    }
  }, [user, loading, router]);

  // ── Profile fields ──────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState(AFFILIATIONS[0]);
  const [institution, setInstitution] = useState("");
  const [country, setCountry] = useState("");

  // ── Notification fields ─────────────────────────────────────────────────
  const [notifyWeekly, setNotifyWeekly] = useState(false);
  const [notifyDaily, setNotifyDaily] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pre-load current values on mount.
  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    setLoadError(null);

    supabase
      .from("users")
      .select("name, affiliation, institution, country, notify_weekly, notify_daily")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Settings load error:", error);
          setLoadError("Could not load your settings. Please refresh the page.");
          setLoadingData(false);
          return;
        }
        if (data) {
          setName(data.name ?? "");
          setAffiliation(data.affiliation ?? AFFILIATIONS[0]);
          setInstitution(data.institution ?? "");
          setCountry(data.country ?? "");
          setNotifyWeekly(data.notify_weekly ?? false);
          setNotifyDaily(data.notify_daily ?? false);
        }
        setLoadingData(false);
      });
  }, [user]);

  // ── Profile save ─────────────────────────────────────────────────────────
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    const { error } = await supabase
      .from("users")
      .update({ name, affiliation, institution, country })
      .eq("id", user.id);

    if (error) {
      console.error("Profile update error:", error);
      setProfileError("Could not save your changes. Please try again.");
    } else {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);
    }
    setProfileSaving(false);
  }

  // ── Account: change email ───────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    setEmailError(null);
    setEmailSuccess(false);

    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

    if (error) {
      console.error("Email update error:", error);
      setEmailError("Could not start the email change. Please try again.");
    } else {
      setEmailSuccess(true);
      setNewEmail("");
    }
    setEmailSaving(false);
  }

  // ── Account: change password ────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error("Password update error:", error);
      setPasswordError("Could not update your password. Please try again.");
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordSaving(false);
  }

  // ── Notifications: toggle + save ────────────────────────────────────────
  const [notifyError, setNotifyError] = useState<string | null>(null);

  async function handleToggleNotify(field: "notify_weekly" | "notify_daily", current: boolean) {
    if (!user) return;
    const next = !current;
    setNotifyError(null);
    if (field === "notify_weekly") setNotifyWeekly(next);
    else setNotifyDaily(next);

    const { error } = await supabase
      .from("users")
      .update({ [field]: next })
      .eq("id", user.id);

    if (error) {
      console.error("Notification preference update error:", error);
      // Revert the optimistic toggle.
      if (field === "notify_weekly") setNotifyWeekly(current);
      else setNotifyDaily(current);
      setNotifyError("Could not save your preference. Please try again.");
    }
  }

  if (loading || !user) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      <Navbar />

      <main className="flex flex-1 max-w-[1280px] mx-auto w-full">
        {/* Mobile section tabs — the design has no mobile treatment for the
            sidebar (it's `hidden md:flex`), so this is an addition to keep
            the page usable on small screens, matching the tab-bar pattern
            already used elsewhere in the app (e.g. Knowledge Hub). */}
        <div className="md:hidden w-full px-gutter pt-md">
          <div className="flex overflow-x-auto gap-2 pb-2">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`px-4 py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap shrink-0 transition-all ${
                  activeSection === s.key
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                {s.label}
              </button>
            ))}
            <Link
              href="/profile/setup"
              className="px-4 py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap shrink-0 bg-surface-container-low text-on-surface-variant flex items-center gap-1"
            >
              Public Profile
              <span className="material-symbols-outlined text-sm">arrow_outward</span>
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-outline-variant bg-surface-container-low p-md space-y-base sticky top-16 h-[calc(100vh-64px)]">
          <div className="mb-lg px-2">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest opacity-60">
              Settings
            </p>
          </div>
          <nav className="space-y-xs">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-sm p-sm rounded-lg transition-all duration-150 text-left ${
                  activeSection === s.key
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={activeSection === s.key ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {s.icon}
                </span>
                <span className="font-body-md text-body-md">{s.label}</span>
              </button>
            ))}

            <Link
              href="/profile/setup"
              className="flex items-center justify-between p-sm text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-150"
            >
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined">public</span>
                <span className="font-body-md text-body-md">Public Profile</span>
              </div>
              <span className="material-symbols-outlined text-sm">arrow_outward</span>
            </Link>
          </nav>
        </aside>

        {/* Content */}
        <section className="flex-1 p-margin md:p-lg overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-xl">
            {loadError && <ErrorBanner>{loadError}</ErrorBanner>}

            {/* ── Profile ──────────────────────────────────────────── */}
            {activeSection === "profile" && (
              <div>
                <div className="flex flex-col mb-lg">
                  <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-background">
                    Profile
                  </h1>
                  <p className="font-body-md text-on-surface-variant mt-xs">
                    Your account details
                  </p>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    </div>
                  ) : (
                    <form className="space-y-md" onSubmit={handleSaveProfile}>
                      <div className="flex flex-col md:flex-row gap-md">
                        <div className="flex-1 space-y-xs">
                          <label className="font-label-sm text-label-sm text-on-surface-variant">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                          />
                        </div>
                        <div className="flex-1 space-y-xs">
                          <label className="font-label-sm text-label-sm text-on-surface-variant">
                            Affiliation
                          </label>
                          <select
                            value={affiliation}
                            onChange={(e) => setAffiliation(e.target.value)}
                            className="w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                          >
                            {AFFILIATIONS.map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-xs">
                        <label className="font-label-sm text-label-sm text-on-surface-variant">
                          Institution
                        </label>
                        <input
                          type="text"
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                          className="w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                        />
                      </div>

                      <div className="space-y-xs">
                        <label className="font-label-sm text-label-sm text-on-surface-variant">
                          Country
                        </label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                        />
                      </div>

                      {profileError && <ErrorBanner>{profileError}</ErrorBanner>}
                      {profileSuccess && <SuccessBanner>Changes saved.</SuccessBanner>}

                      <div className="pt-md border-t border-outline-variant mt-lg flex justify-end">
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="bg-primary text-on-primary px-xl py-sm rounded-full font-label-sm text-label-sm hover:bg-primary-container transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {profileSaving && (
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          )}
                          {profileSaving ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* ── Account ──────────────────────────────────────────── */}
            {activeSection === "account" && (
              <div className="space-y-lg">
                <div className="flex flex-col">
                  <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-background">
                    Account
                  </h1>
                  <p className="font-body-md text-on-surface-variant mt-xs">
                    Manage your sign-in email and password
                  </p>
                </div>

                {/* Change email */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
                  <h2 className="font-headline-md text-headline-md text-on-background mb-xs">
                    Change Email
                  </h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mb-md">
                    Current email: <span className="font-medium text-on-surface">{user.email}</span>
                  </p>
                  <form className="space-y-sm" onSubmit={handleChangeEmail}>
                    <div className="space-y-xs">
                      <label className="font-label-sm text-label-sm text-on-surface-variant">
                        New Email Address
                      </label>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new.email@example.com"
                        className="w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                      />
                    </div>

                    {emailError && <ErrorBanner>{emailError}</ErrorBanner>}
                    {emailSuccess && (
                      <SuccessBanner>Check your new email to confirm the change.</SuccessBanner>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={emailSaving}
                        className="bg-primary text-on-primary px-xl py-sm rounded-full font-label-sm text-label-sm hover:bg-primary-container transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {emailSaving && (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {emailSaving ? "Sending…" : "Update Email"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Change password */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
                  <h2 className="font-headline-md text-headline-md text-on-background mb-md">
                    Change Password
                  </h2>
                  <form className="space-y-sm" onSubmit={handleChangePassword}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      <div className="space-y-xs">
                        <label className="font-label-sm text-label-sm text-on-surface-variant">
                          New Password
                        </label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          minLength={MIN_PASSWORD_LENGTH}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                        />
                      </div>
                      <div className="space-y-xs">
                        <label className="font-label-sm text-label-sm text-on-surface-variant">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          minLength={MIN_PASSWORD_LENGTH}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none"
                        />
                      </div>
                    </div>

                    {passwordError && <ErrorBanner>{passwordError}</ErrorBanner>}
                    {passwordSuccess && <SuccessBanner>Password updated.</SuccessBanner>}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={passwordSaving}
                        className="bg-primary text-on-primary px-xl py-sm rounded-full font-label-sm text-label-sm hover:bg-primary-container transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {passwordSaving && (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {passwordSaving ? "Saving…" : "Update Password"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Notifications ────────────────────────────────────── */}
            {activeSection === "notifications" && (
              <div>
                <div className="flex flex-col mb-lg">
                  <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-background">
                    Notifications
                  </h1>
                  <p className="font-body-md text-on-surface-variant mt-xs">
                    Choose what email updates you receive
                  </p>
                </div>

                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  </div>
                ) : (
                  <div className="bg-surface-container-low border border-outline-variant rounded-xl p-lg space-y-md">
                    {notifyError && <ErrorBanner>{notifyError}</ErrorBanner>}

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-body-md text-body-md font-bold text-on-surface">
                          Weekly digest
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Summary of research updates and community discussions.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={notifyWeekly}
                        onChange={() => handleToggleNotify("notify_weekly", notifyWeekly)}
                        label="Weekly digest"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-md border-t border-outline-variant/30">
                      <div>
                        <p className="font-body-md text-body-md font-bold text-on-surface">
                          Daily digest
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Instant updates on newly published roadmaps and molecules.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={notifyDaily}
                        onChange={() => handleToggleNotify("notify_daily", notifyDaily)}
                        label="Daily digest"
                      />
                    </div>

                    <div className="mt-md p-sm bg-surface-variant/30 rounded-lg flex items-center gap-sm">
                      <span className="material-symbols-outlined text-primary text-sm">info</span>
                      <p className="font-label-sm text-[11px] text-on-surface-variant italic">
                        Off by default — turn on to receive email updates.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
