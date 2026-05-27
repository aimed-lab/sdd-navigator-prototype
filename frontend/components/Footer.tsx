import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-container-highest border-t border-outline-variant">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg w-full px-margin-desktop py-stack-lg max-w-container-max mx-auto">
        {/* Brand */}
        <div className="flex flex-col gap-stack-md">
          <div className="flex flex-col">
            <span className="font-title-md text-title-md font-bold text-primary">
              SDD Navigator
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Center for Clinical and Translational Science
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
            Dedicated to accelerating the translation of laboratory discoveries
            into treatments for patients. Part of the UAB Research Ecosystem.
          </p>
          <div className="flex gap-stack-md">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
              public
            </span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
              mail
            </span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
              description
            </span>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-gutter">
          <div className="flex flex-col gap-2">
            <h5 className="font-label-md text-label-md text-on-surface font-bold">
              Resources
            </h5>
            <Link
              href="/knowledge-hub"
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all"
            >
              Knowledge Hub
            </Link>
            <Link
              href="/navigator"
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all"
            >
              Navigator
            </Link>
            <Link
              href="/graph"
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all"
            >
              Knowledge Graph
            </Link>
            <Link
              href="#"
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all"
            >
              Institutional Review Board
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h5 className="font-label-md text-label-md text-on-surface font-bold">
              Support
            </h5>
            <Link
              href="#"
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all"
            >
              Contact Support
            </Link>
            <Link
              href="#"
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-outline-variant py-4 px-margin-desktop text-center max-w-container-max mx-auto">
        <p className="font-body-sm text-body-sm text-on-surface-variant/70">
          © 2024 UAB SPARC - Center for Clinical and Translational Science. All
          rights reserved.
        </p>
      </div>
    </footer>
  );
}
