import Link from "next/link";

// ── LOCKED SHELL — Footer (single source of truth: /design/SHELL.md) ─────────────
// Identical on every page.
//   Left:  SDD Navigator · Built at UAB SPARC
//   Right: Privacy Policy · Terms of Service · Contact

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms",   label: "Terms of Service" },
  { href: "/contact", label: "Contact" },
] as const;

export default function Footer() {
  return (
    <footer className="bg-background border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full px-gutter py-6 max-w-[1280px] mx-auto">
        {/* Left: wordmark + SPARC attribution */}
        <p className="text-sm text-on-surface-variant text-center md:text-left">
          <span className="font-semibold text-on-surface">SDD Navigator</span>
          <span className="mx-2 text-outline-variant">·</span>
          Built at UAB SPARC
        </p>

        {/* Right: legal links */}
        <nav className="flex items-center gap-1 text-sm">
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.href} className="flex items-center">
              {i > 0 && <span className="mx-2 text-outline-variant">·</span>}
              <Link
                href={link.href}
                className="text-on-surface-variant hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
