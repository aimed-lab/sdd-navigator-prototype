import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full py-12 px-4 md:px-16 flex flex-col md:flex-row justify-between items-center gap-2 bg-surface-container-lowest border-t border-[rgba(255,255,255,0.1)]">
      <div className="flex flex-col items-center md:items-start gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container">
            hub
          </span>
          <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            SDD Navigator
          </span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant text-center md:text-left">
          © 2024 UAB SPARC. Bridging research assets to outcomes worldwide.
        </p>
      </div>
      <div className="flex gap-6 mt-8 md:mt-0">
        {[
          { href: "/knowledge-hub", label: "Hub" },
          { href: "/navigator", label: "Navigator" },
          { href: "/graph", label: "Graph" },
          { href: "#", label: "About" },
          { href: "#", label: "Contact" },
        ].map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="font-data-label text-data-label text-on-surface-variant hover:text-primary transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
