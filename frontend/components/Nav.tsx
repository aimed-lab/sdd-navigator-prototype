"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// ── LOCKED SHELL — Nav (single source of truth: /design/SHELL.md) ────────────────
//
// Wordmark is ALWAYS "SDD Navigator" — never "PharmaAI" (Stitch HTML drift is
// ignored). Top-level links, in this exact order: Home · Discovery · Podcast ·
// Researchers, as plain text links. Navigator is the HERO, rendered as a filled
// green (#00523c → `bg-primary`) pill so it stands out. Wiki, Knowledge Graph,
// and Settings are intentionally NOT top-level (reached contextually; Settings
// lives in the avatar menu).
//
// Discovery/Podcast/Researchers are still TABS inside /knowledge-hub, not their
// own routes yet — so these point at the working knowledge-hub tab URLs for now
// (avoids 404s). They'll be repointed at /discovery, /podcast, /researchers once
// those real routes exist.
const NAV_LINKS = [
  { href: "/",                              label: "Home" },
  { href: "/discovery",                     label: "Discovery" },
  { href: "/podcast",                       label: "Podcast" },
  { href: "/researchers",                   label: "Researchers" },
] as const;

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, displayName, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);   // mobile drawer
  const [acctOpen, setAcctOpen] = useState(false);   // avatar dropdown

  // Home matches exactly; every other link matches on path prefix (query string
  // stripped) so nested routes still highlight their top-level link.
  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return path === "/" ? pathname === "/" : pathname?.startsWith(path) ?? false;
  };

  async function handleLogout() {
    await signOut();
    setAcctOpen(false);
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <header className="bg-background border-b border-outline-variant sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-gutter max-w-[1280px] mx-auto h-16">
        {/* Wordmark — LOCKED to "SDD Navigator" */}
        <Link href="/" onClick={() => setMenuOpen(false)} className="shrink-0">
          <span className="text-xl font-bold text-primary cursor-pointer tracking-tight">
            SDD Navigator
          </span>
        </Link>

        {/* Desktop text links */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isActive(link.href)
                  ? "text-primary font-semibold border-b-2 border-primary pb-1 transition-colors"
                  : "text-on-surface-variant font-medium border-b-2 border-transparent pb-1 hover:text-primary transition-colors"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right cluster: Navigator hero + account area */}
        <div className="hidden md:flex items-center gap-3">
          {/* HERO: Navigator as a filled green pill */}
          <Link
            href="/navigator"
            className="px-5 py-2 rounded-xl bg-primary text-on-primary font-semibold text-sm shadow-sm hover:bg-primary-container transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">explore</span>
            Navigator
          </Link>

          {!loading && user ? (
            <>
              {/* Notification bell — feature not built yet (honest "coming soon") */}
              <button
                type="button"
                title="Notifications — coming soon"
                aria-label="Notifications (coming soon)"
                className="relative p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-default"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim" />
              </button>

              {/* Avatar + dropdown (Settings lives here per SHELL) */}
              <div className="relative">
                <button
                  onClick={() => setAcctOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={acctOpen}
                  aria-label="Account menu"
                  className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center shrink-0 ring-offset-2 hover:ring-2 hover:ring-primary/30 transition-all"
                >
                  <span className="text-on-secondary-container text-sm font-bold uppercase">
                    {displayName.charAt(0) || "U"}
                  </span>
                </button>

                {acctOpen && (
                  <>
                    {/* click-away backdrop */}
                    <button
                      aria-hidden="true"
                      tabIndex={-1}
                      onClick={() => setAcctOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    {/* w-max + explicit px max-w overrides the global `* { max-width:100% }`
                        rule (which otherwise clamps this absolute panel to its ~36px
                        avatar-sized containing block). min-w guarantees labels fit. */}
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 z-50 w-max min-w-[220px] max-w-[280px] bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg overflow-hidden py-1"
                    >
                      <div className="px-4 py-3 border-b border-outline-variant">
                        <p className="text-sm font-semibold text-on-surface truncate max-w-[248px]">{displayName || "Account"}</p>
                        {user.email && (
                          <p className="text-[11px] text-on-surface-variant truncate max-w-[248px]">{user.email}</p>
                        )}
                      </div>
                      <Link
                        href="/settings"
                        role="menuitem"
                        onClick={() => setAcctOpen(false)}
                        className="flex items-center gap-3 whitespace-nowrap px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] shrink-0">settings</span>
                        Settings
                      </Link>
                      <Link
                        href="/profile/setup"
                        role="menuitem"
                        onClick={() => setAcctOpen(false)}
                        className="flex items-center gap-3 whitespace-nowrap px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] shrink-0">badge</span>
                        Researcher Profile
                      </Link>
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 whitespace-nowrap px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors border-t border-outline-variant"
                      >
                        <span className="material-symbols-outlined text-[18px] shrink-0">logout</span>
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-5 py-2 rounded-xl text-primary font-semibold text-sm hover:bg-surface-container-low transition-all active:scale-95"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-semibold text-sm shadow-sm hover:bg-primary-container transition-all active:scale-95"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden p-2 rounded-lg hover:bg-surface-container-low transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <span className="material-symbols-outlined text-on-surface">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden bg-background border-t border-outline-variant shadow-lg">
          <nav className="flex flex-col px-gutter py-4 gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-xl font-medium min-h-[44px] flex items-center transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Navigator hero pill in the drawer too */}
            <Link
              href="/navigator"
              onClick={() => setMenuOpen(false)}
              className="mt-1 px-4 py-3 rounded-xl bg-primary text-on-primary font-semibold min-h-[44px] flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">explore</span>
              Navigator
            </Link>

            <div className="border-t border-outline-variant mt-2 pt-3 flex flex-col gap-2">
              {!loading && user ? (
                <>
                  <div className="px-4 py-2 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                      <span className="text-on-secondary-container text-sm font-bold uppercase">
                        {displayName.charAt(0) || "U"}
                      </span>
                    </div>
                    <span className="text-on-surface-variant text-sm font-medium truncate">
                      {displayName}
                    </span>
                  </div>
                  <div className="px-4 py-2 flex items-center gap-2 text-on-surface-variant/70 text-sm">
                    <span className="material-symbols-outlined text-[18px]">notifications</span>
                    Notifications
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded">
                      Soon
                    </span>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl font-medium min-h-[44px] flex items-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    Settings
                  </Link>
                  <Link
                    href="/profile/setup"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl font-medium min-h-[44px] flex items-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    Researcher Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mx-4 py-3 rounded-xl border border-outline text-primary font-semibold text-sm min-h-[44px] hover:bg-surface-container-low transition-all"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    <button className="w-full py-3 rounded-xl border border-outline text-primary font-semibold text-sm min-h-[44px] hover:bg-surface-container-low transition-all">
                      Log in
                    </button>
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)}>
                    <button className="w-full py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm min-h-[44px] hover:bg-primary-container transition-all shadow-sm">
                      Sign up
                    </button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
