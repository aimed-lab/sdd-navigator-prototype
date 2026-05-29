"use client";
import Link from "next/link";
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

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-gutter max-w-[1280px] mx-auto h-20">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/">
            <span className="font-display-lg text-display-lg font-bold text-primary cursor-pointer">
              SDD Navigator
            </span>
          </Link>

          {/* Nav links */}
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
        </div>

        {/* Auth area */}
        <div className="flex items-center gap-4">
          {!loading && user ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="text-on-secondary-container text-xs font-bold uppercase">
                    {displayName.charAt(0) || "U"}
                  </span>
                </div>
                <span className="text-on-surface-variant text-sm font-medium truncate max-w-[160px]">
                  {displayName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-6 py-2 rounded-full border border-outline text-primary font-semibold hover:bg-surface-container-low transition-all active:scale-95 text-sm"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="px-6 py-2 rounded-full border border-outline text-primary font-semibold hover:bg-surface-container-low transition-all active:scale-95">
                  Sign In
                </button>
              </Link>
              <Link href="/register">
                <button className="px-6 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary-container transition-all active:scale-95 shadow-sm">
                  Register
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
