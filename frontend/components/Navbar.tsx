"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/knowledge-hub", label: "Knowledge Hub" },
  { href: "/navigator", label: "Navigator" },
  { href: "/graph", label: "Graph" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-16 h-20 max-w-[1440px] mx-auto bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.1)] shadow-sm">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[#00f5ff]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            hub
          </span>
          <span className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
            SDD Navigator
          </span>
        </Link>
        <nav className="hidden md:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "text-primary border-b-2 border-primary pb-1 font-body-md text-body-md"
                  : "text-on-surface-variant hover:text-primary transition-colors duration-200 font-body-md text-body-md"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {!loading && user ? (
          /* ── Logged-in state ── */
          <>
            <span className="hidden md:block font-data-label text-data-label text-on-surface-variant mr-2 truncate max-w-[180px]">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] text-on-surface-variant hover:text-error hover:border-error transition-all font-data-label text-data-label active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                logout
              </span>
              Logout
            </button>
          </>
        ) : (
          /* ── Logged-out state ── */
          <>
            <Link href="/login">
              <button className="text-on-surface hover:text-primary transition-all duration-150 ease-in-out active:scale-95 px-4 py-2 font-data-label text-data-label">
                Login
              </button>
            </Link>
            <Link href="/register">
              <button className="bg-primary-container text-on-primary-container px-6 py-2 rounded-lg font-data-label text-data-label font-bold hover:shadow-[0_0_15px_rgba(0,245,255,0.3)] transition-all active:scale-95">
                Register
              </button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
