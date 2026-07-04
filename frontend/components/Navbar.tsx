"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "/knowledge-hub", label: "Knowledge Hub" },
  { href: "/navigator", label: "Navigator" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, displayName, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  // Log in returns the user to the page they were on.
  const loginHref = `/login?callbackUrl=${encodeURIComponent(pathname || "/")}`;

  async function handleLogout() {
    await signOut();
    router.push("/");
    setMenuOpen(false);
  }

  return (
    <header className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-gutter max-w-[1280px] mx-auto h-16 md:h-20">
        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)}>
          <span className="text-xl md:font-display-lg md:text-display-lg font-bold text-primary cursor-pointer">
            SDD Navigator
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname?.startsWith(link.href)
                  ? "text-primary font-bold border-b-2 border-primary pb-1 transition-colors duration-200"
                  : "text-on-surface-variant font-medium hover:text-primary-container transition-colors duration-200"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-4">
          {!loading && user ? (
            <>
              <Link
                href="/settings"
                aria-label="Settings"
                title="Settings"
                className="p-2 rounded-full text-on-surface-variant hover:text-primary-container hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined">settings</span>
              </Link>
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                <span className="text-on-secondary-container text-xs font-bold uppercase">
                  {displayName.charAt(0) || "U"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-2 min-h-[44px] rounded-full border border-outline text-primary font-semibold hover:bg-surface-container-low transition-all active:scale-95 text-sm"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href={loginHref}>
                <button className="px-5 py-2 min-h-[44px] rounded-full border border-outline text-primary font-semibold hover:bg-surface-container-low transition-all active:scale-95">
                  Sign In
                </button>
              </Link>
              <Link href="/register">
                <button className="px-5 py-2 min-h-[44px] rounded-full bg-primary text-white font-semibold hover:bg-primary-container transition-all active:scale-95 shadow-sm">
                  Register
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-surface-container-low transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <span className="material-symbols-outlined text-on-surface">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-surface border-t border-outline-variant shadow-lg">
          <nav className="flex flex-col px-gutter py-4 gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-xl font-medium min-h-[44px] flex items-center transition-colors ${
                  pathname?.startsWith(link.href)
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-outline-variant mt-2 pt-3 flex flex-col gap-2">
              {!loading && user ? (
                <>
                  <div className="px-4 py-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                      <span className="text-on-secondary-container text-xs font-bold uppercase">
                        {displayName.charAt(0) || "U"}
                      </span>
                    </div>
                    <span className="text-on-surface-variant text-sm font-medium truncate">
                      {displayName}
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
                    Public Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mx-4 py-3 rounded-xl border border-outline text-primary font-semibold text-sm min-h-[44px] hover:bg-surface-container-low transition-all"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href={loginHref} onClick={() => setMenuOpen(false)}>
                    <button className="w-full py-3 rounded-xl border border-outline text-primary font-semibold text-sm min-h-[44px] hover:bg-surface-container-low transition-all">
                      Sign In
                    </button>
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)}>
                    <button className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm min-h-[44px] hover:bg-primary-container transition-all shadow-sm">
                      Register
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
