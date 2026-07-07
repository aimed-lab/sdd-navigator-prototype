"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// Must stay in sync with the list in register/page.tsx — that's the only
// other place a user's affiliation is ever set.
const AFFILIATIONS = ["Researcher", "Laboratory Head", "Institutional Admin", "Graduate Student"];

const MIN_PASSWORD_LENGTH = 8;

type SectionKey = "account" | "researcher" | "interests" | "notifications" | "danger";

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "account", label: "Account", icon: "account_circle" },
  { key: "researcher", label: "Researcher Profile", icon: "badge" },
  { key: "interests", label: "Interests", icon: "psychology" },
  { key: "notifications", label: "Notifications", icon: "notifications_active" },
  { key: "danger", label: "Danger Zone", icon: "warning" },
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

// Shared styles
const cardCls =
  "bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-[0px_4px_20px_rgba(0,0,0,0.05)]";
const inputCls =
  "w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md text-body-md outline-none";
const labelCls = "font-label-sm text-label-sm text-on-surface-variant";
const primaryBtnCls =
  "bg-primary text-on-primary px-xl py-sm rounded-full font-label-sm text-label-sm hover:bg-primary-container transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2";

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<SectionKey>("account");

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

  // ── Researcher-profile existence (read-only; drives the link-out card) ────
  const [isPublic, setIsPublic] = useState(false);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);

  // ── Notification fields ─────────────────────────────────────────────────
  const [notifyWeekly, setNotifyWeekly] = useState(false);
  const [notifyDaily, setNotifyDaily] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pre-load current values on mount. (is_public + profile_slug are additive
  // reads used only to render the Researcher Profile link-out card's empty vs
  // active state — no write path touches them here.)
  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    setLoadError(null);

    // Session-scoped read through /api/account (RLS ties it to the caller; no
    // uid is sent). Same fields/mapping as before — including the "no row → keep
    // defaults" behavior, preserved by the `if (data)` guard.
    fetch("/api/account")
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          settings?: {
            name: string | null;
            affiliation: string | null;
            institution: string | null;
            country: string | null;
            notify_weekly: boolean | null;
            notify_daily: boolean | null;
            is_public: boolean | null;
            profile_slug: string | null;
          } | null;
        };
        if (!res.ok) {
          console.error("Settings load error:", body);
          setLoadError("Could not load your settings. Please refresh the page.");
          setLoadingData(false);
          return;
        }
        const data = body.settings;
        if (data) {
          setName(data.name ?? "");
          setAffiliation(data.affiliation ?? AFFILIATIONS[0]);
          setInstitution(data.institution ?? "");
          setCountry(data.country ?? "");
          setNotifyWeekly(data.notify_weekly ?? false);
          setNotifyDaily(data.notify_daily ?? false);
          setIsPublic(data.is_public ?? false);
          setProfileSlug(data.profile_slug ?? null);
        }
        setLoadingData(false);
      })
      .catch((error) => {
        console.error("Settings load error:", error);
        setLoadError("Could not load your settings. Please refresh the page.");
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

    // Session-scoped write through /api/account (uid derived server-side).
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, affiliation, institution, country }),
      });
      if (!res.ok) {
        console.error("Profile update error:", await res.json().catch(() => ({})));
        setProfileError("Could not save your changes. Please try again.");
      } else {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 2500);
      }
    } catch (error) {
      console.error("Profile update error:", error);
      setProfileError("Could not save your changes. Please try again.");
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

  // ── Danger zone: log out ─────────────────────────────────────────────────
  // Reuses the same signOut logic the nav avatar menu uses.
  const [loggingOut, setLoggingOut] = useState(false);
  async function handleLogout() {
    setLoggingOut(true);
    await signOut();
    router.push("/");
  }

  // ── Account: delete account ──────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function closeDeleteModal() {
    if (deleting) return;
    setShowDeleteConfirm(false);
    setDeletePassword("");
    setDeleteError(null);
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const result = await res.json().catch(() => null);

      if (!res.ok) {
        setDeleteError(result?.error || "Could not delete your account. Please try again.");
        setDeleting(false);
        return;
      }

      if (Array.isArray(result?.flaggedProjects) && result.flaggedProjects.length > 0) {
        const names = result.flaggedProjects
          .map((p: { name: string | null; id: string }) => p.name ?? p.id)
          .join(", ");
        window.alert(
          `Your account was deleted. Note: you owned project(s) with other active members (${names}) — these were left untouched and need manual review.`
        );
      }

      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      console.error("Delete account error:", err);
      setDeleteError("Could not delete your account. Please try again.");
      setDeleting(false);
    }
  }

  // ── Notifications: toggle + save ────────────────────────────────────────
  const [notifyError, setNotifyError] = useState<string | null>(null);

  async function handleToggleNotify(field: "notify_weekly" | "notify_daily", current: boolean) {
    if (!user) return;
    const next = !current;
    setNotifyError(null);
    if (field === "notify_weekly") setNotifyWeekly(next);
    else setNotifyDaily(next);

    // Session-scoped write through /api/account/notifications (uid derived
    // server-side). Optimistic update above; revert below on failure.
    try {
      const res = await fetch("/api/account/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
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
        <Nav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const hasProfile = !!profileSlug;

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      <Nav />

      <main className="flex-grow w-full max-w-[1280px] mx-auto flex flex-col md:flex-row md:gap-gutter md:px-margin md:py-8 min-w-0">
        {/* Mobile section tabs — kept from the original responsive treatment
            (the design has no mobile sidebar spec). Matches the tab-bar
            pattern used elsewhere in the app. */}
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
          </div>
        </div>

        {/* Sidebar — transparent inline column (design), sticks without a
            fixed-height rail so the divider can never end mid-content. */}
        <aside className="hidden md:block w-64 flex-shrink-0 self-start md:sticky md:top-24">
          <div className="mb-md px-3">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest opacity-60">
              Settings
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            {SECTIONS.map((s) => {
              const isDanger = s.key === "danger";
              const active = activeSection === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left ${
                    active
                      ? isDanger
                        ? "bg-error-container text-error font-semibold"
                        : "bg-primary text-on-primary font-semibold"
                      : isDanger
                        ? "text-error hover:bg-error-container/20"
                        : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {s.icon}
                  </span>
                  <span className="font-body-md text-body-md">{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <section className="flex-grow min-w-0 px-gutter py-lg md:px-0 md:py-0">
          <div className="max-w-2xl mx-auto md:mx-0 space-y-xl">
            {loadError && <ErrorBanner>{loadError}</ErrorBanner>}

            {/* ── Account (name + email + password) ─────────────────── */}
            {activeSection === "account" && (
              <div className="space-y-lg">
                <div className="flex flex-col">
                  <h1 className="text-2xl md:text-3xl font-bold text-on-background">Account</h1>
                  <p className="font-body-md text-on-surface-variant mt-xs">
                    Your details, sign-in email, and password
                  </p>
                </div>

                {/* Personal details */}
                <div className={cardCls}>
                  <h2 className="font-headline-md text-headline-md text-on-background mb-md">
                    Personal Details
                  </h2>
                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    </div>
                  ) : (
                    <form className="space-y-md" onSubmit={handleSaveProfile}>
                      <div className="flex flex-col md:flex-row gap-md">
                        <div className="flex-1 space-y-xs">
                          <label className={labelCls}>Full Name</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div className="flex-1 space-y-xs">
                          <label className={labelCls}>Role</label>
                          <select
                            value={affiliation}
                            onChange={(e) => setAffiliation(e.target.value)}
                            className={inputCls}
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
                        <label className={labelCls}>Institution</label>
                        <input
                          type="text"
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                          className={inputCls}
                        />
                      </div>

                      <div className="space-y-xs">
                        <label className={labelCls}>Country</label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className={inputCls}
                        />
                      </div>

                      {profileError && <ErrorBanner>{profileError}</ErrorBanner>}
                      {profileSuccess && <SuccessBanner>Changes saved.</SuccessBanner>}

                      <div className="pt-md border-t border-outline-variant mt-lg flex justify-end">
                        <button type="submit" disabled={profileSaving} className={primaryBtnCls}>
                          {profileSaving && (
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          )}
                          {profileSaving ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Change email */}
                <div className={cardCls}>
                  <h2 className="font-headline-md text-headline-md text-on-background mb-xs">
                    Change Email
                  </h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mb-md">
                    Current email: <span className="font-medium text-on-surface">{user.email}</span>
                  </p>
                  <form className="space-y-sm" onSubmit={handleChangeEmail}>
                    <div className="space-y-xs">
                      <label className={labelCls}>New Email Address</label>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new.email@example.com"
                        className={inputCls}
                      />
                    </div>

                    {emailError && <ErrorBanner>{emailError}</ErrorBanner>}
                    {emailSuccess && (
                      <SuccessBanner>Check your new email to confirm the change.</SuccessBanner>
                    )}

                    <div className="flex justify-end">
                      <button type="submit" disabled={emailSaving} className={primaryBtnCls}>
                        {emailSaving && (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {emailSaving ? "Sending…" : "Update Email"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Change password */}
                <div className={cardCls}>
                  <h2 className="font-headline-md text-headline-md text-on-background mb-md">
                    Change Password
                  </h2>
                  <form className="space-y-sm" onSubmit={handleChangePassword}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      <div className="space-y-xs">
                        <label className={labelCls}>New Password</label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          minLength={MIN_PASSWORD_LENGTH}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className={inputCls}
                        />
                      </div>
                      <div className="space-y-xs">
                        <label className={labelCls}>Confirm New Password</label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          minLength={MIN_PASSWORD_LENGTH}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {passwordError && <ErrorBanner>{passwordError}</ErrorBanner>}
                    {passwordSuccess && <SuccessBanner>Password updated.</SuccessBanner>}

                    <div className="flex justify-end">
                      <button type="submit" disabled={passwordSaving} className={primaryBtnCls}>
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

            {/* ── Researcher Profile (link-out card) ───────────────── */}
            {activeSection === "researcher" && (
              <div className="space-y-lg">
                <div className="flex flex-col">
                  <h1 className="text-2xl md:text-3xl font-bold text-on-background">
                    Researcher Profile
                  </h1>
                  <p className="font-body-md text-on-surface-variant mt-xs">
                    Your public presence in the Researchers directory
                  </p>
                </div>

                <div className={cardCls}>
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-3xl">badge</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                        {hasProfile ? "Researcher Profile" : "Create your profile"}
                      </h2>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        {hasProfile
                          ? "Your profile appears in the Researchers directory, letting peers discover your work and reach out to collaborate."
                          : "Set up a researcher profile so peers can discover your work, publications, and tools in the directory."}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-5">
                        <Link
                          href="/profile/setup"
                          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm hover:bg-primary-container transition-all duration-200"
                        >
                          {hasProfile ? "Edit your profile" : "Create your profile"}
                        </Link>
                        {hasProfile && isPublic && profileSlug && (
                          <Link
                            href={`/researchers/${profileSlug}`}
                            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl border border-primary text-primary font-label-sm text-label-sm hover:bg-primary/5 transition-all duration-200 group"
                          >
                            View public profile
                            <span className="material-symbols-outlined text-[18px] ml-2 group-hover:translate-x-1 transition-transform">
                              open_in_new
                            </span>
                          </Link>
                        )}
                      </div>

                      {hasProfile && (
                        <div className="mt-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant">
                            <span
                              className="material-symbols-outlined text-[14px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {isPublic ? "visibility" : "visibility_off"}
                            </span>
                            {isPublic ? "Directory: Listed" : "Directory: Hidden"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Interests (link-out to Discovery) ────────────────── */}
            {activeSection === "interests" && (
              <div className="space-y-lg">
                <div className="flex flex-col">
                  <h1 className="text-2xl md:text-3xl font-bold text-on-background">Interests</h1>
                  <p className="font-body-md text-on-surface-variant mt-xs">
                    Personalize your Discovery feed
                  </p>
                </div>

                <div className={cardCls}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-headline-md text-headline-md text-primary mb-2">
                        Research interests
                      </h2>
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed max-w-md">
                        Your interests tailor the Discovery feed to your field. Add or edit them from
                        Discovery.
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
                  </div>
                  <div className="mt-6">
                    <Link
                      href="/discovery"
                      className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-label-sm text-label-sm hover:bg-primary-container transition-all"
                    >
                      Edit interests in Discovery
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ── Notifications (functional — NOT coming-soon) ─────── */}
            {activeSection === "notifications" && (
              <div>
                <div className="flex flex-col mb-lg">
                  <h1 className="text-2xl md:text-3xl font-bold text-on-background">
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
                  <div className={`${cardCls} space-y-md`}>
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

            {/* ── Danger Zone (log out + delete account) ───────────── */}
            {activeSection === "danger" && (
              <div className="space-y-lg">
                <div className="flex flex-col">
                  <h1 className="text-2xl md:text-3xl font-bold text-on-background">Danger Zone</h1>
                  <p className="font-body-md text-on-surface-variant mt-xs">
                    Sign out or permanently delete your account
                  </p>
                </div>

                {/* Log out */}
                <div className={cardCls}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">
                        Log out
                      </h2>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        Sign out of your account on this device.
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="shrink-0 inline-flex items-center gap-2 px-xl py-sm rounded-full border border-outline-variant text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loggingOut && (
                        <span className="w-3.5 h-3.5 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin" />
                      )}
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      {loggingOut ? "Logging out…" : "Log out"}
                    </button>
                  </div>
                </div>

                {/* Delete account */}
                <div className="bg-error-container/20 border-2 border-error/40 rounded-xl p-lg">
                  <div className="flex items-start gap-sm mb-md">
                    <span className="material-symbols-outlined text-error">warning</span>
                    <div>
                      <h2 className="font-headline-md text-headline-md text-error">Delete account</h2>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
                        Deleting your account is permanent and cannot be undone.
                      </p>
                    </div>
                  </div>
                  <ul className="font-label-sm text-label-sm text-on-surface-variant space-y-1 mb-md list-disc list-inside">
                    <li>Your public profile, works, and comments will be permanently removed.</li>
                    <li>You will be signed out everywhere immediately.</li>
                    <li>This action cannot be reversed.</li>
                  </ul>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-error text-on-error px-xl py-sm rounded-full font-label-sm text-label-sm hover:opacity-90 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    Delete account
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Delete account confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-full bg-error" />
            <div className="p-lg">
              <div className="flex items-center gap-sm mb-md">
                <span className="material-symbols-outlined text-error text-3xl">warning</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Delete your account?
                </h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                This permanently deletes your profile, works, and comments, and signs you out
                everywhere.{" "}
                <span className="font-bold text-on-surface">This cannot be undone.</span>
              </p>

              <form onSubmit={handleDeleteAccount} className="space-y-sm">
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">
                    Enter your password to confirm
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    autoFocus
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-error focus:border-error transition-all font-body-md text-body-md outline-none"
                  />
                </div>

                {deleteError && <ErrorBanner>{deleteError}</ErrorBanner>}

                <div className="flex gap-sm pt-sm">
                  <button
                    type="submit"
                    disabled={deleting || !deletePassword}
                    className="flex-1 bg-error text-on-error py-sm rounded-full font-label-sm text-label-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleting && (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {deleting ? "Deleting…" : "Permanently delete my account"}
                  </button>
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={deleting}
                    className="px-lg py-sm rounded-full font-label-sm text-label-sm border border-outline-variant hover:bg-surface-container-low transition-colors text-on-surface-variant disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
