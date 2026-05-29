"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { href: "/knowledge-hub", label: "Knowledge Hub" },
  { href: "/navigator",    label: "Navigator"     },
  { href: "/graph",        label: "Graph"          },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, loading, displayName, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="bg-primary shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto">
        {/* Logo + nav */}
        <div className="flex items-center gap-stack-md">
          <Link href="/" className="flex flex-col leading-tight">
            <span className="font-title-lg text-title-lg font-bold text-on-primary tracking-tight leading-none">
              SDD Navigator
            </span>
            <span className="text-[10px] font-bold text-on-primary/70 tracking-widest uppercase -mt-0.5">
              by UAB SPARC
            </span>
          </Link>

          <nav className="hidden md:flex items-center ml-stack-md gap-gutter">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname === link.href
                    ? "text-on-primary border-b-2 border-secondary-container pb-1 font-semibold font-label-md text-label-md"
                    : "text-on-primary/80 hover:text-on-primary transition-colors font-medium font-label-md text-label-md"
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
              {/* User name */}
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="text-on-secondary-container text-xs font-bold uppercase">
                    {displayName.charAt(0) || "U"}
                  </span>
                </div>
                <span className="font-label-md text-label-md text-on-primary/80 truncate max-w-[160px]">
                  {displayName}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-on-primary font-label-md text-label-md hover:bg-white/10 px-4 py-2 rounded-lg transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="text-on-primary font-label-md text-label-md hover:bg-white/10 px-4 py-2 rounded-lg transition-all">
                  Sign In
                </button>
              </Link>
              <Link href="/register">
                <button className="bg-primary-fixed text-on-primary-fixed font-label-md text-label-md px-4 py-2 rounded-lg font-bold hover:scale-95 transition-transform">
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
