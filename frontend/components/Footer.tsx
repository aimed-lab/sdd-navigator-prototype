import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-gutter py-lg max-w-[1280px] mx-auto gap-8">
        <div className="flex flex-col gap-2">
          <span className="font-headline-md text-headline-md font-semibold text-on-surface">
            SDD Navigator
          </span>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Copyright 2026 University of Alabama at Birmingham
          </p>
        </div>

        <div className="flex gap-8">
          <Link
            href="/knowledge-hub"
            className="text-on-surface-variant font-medium hover:underline decoration-primary-container"
          >
            Knowledge Hub
          </Link>
          <Link
            href="/navigator"
            className="text-on-surface-variant font-medium hover:underline decoration-primary-container"
          >
            Navigator
          </Link>
          <a href="#" className="text-on-surface-variant font-medium hover:underline decoration-primary-container">
            About
          </a>
        </div>

        <div className="flex gap-4">
          <a
            href="#"
            className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">mail</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
