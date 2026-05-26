"use client";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function LoginPage() {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen relative flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-16 h-20 max-w-[1440px] mx-auto bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.1)]">
        <Link
          href="/"
          className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight"
        >
          SDD Navigator
        </Link>
        <div className="flex gap-6 items-center">
          <span className="font-data-label text-data-label text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="status-pulse-ring absolute inline-flex h-full w-full rounded-full bg-status-pulse opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-pulse" />
            </span>
            Secure Terminal v4.2
          </span>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 relative">
        {/* Background effects */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 245, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 245, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 md:px-16 flex justify-center z-10">
          <div className="w-full max-w-md">
            <div className="glass-card p-8 md:p-12 rounded-xl shadow-2xl relative overflow-hidden">
              {/* Security accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

              <header className="mb-8">
                <div className="font-data-label text-data-label text-status-pulse mb-2 tracking-[0.2em] uppercase">
                  Authentication Required
                </div>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">
                  Welcome Back
                </h1>
                <p className="text-on-surface-variant font-body-md">
                  Enter your credentials to access the Navigator.
                </p>
              </header>

              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <label className="font-data-label text-data-label text-on-surface-variant uppercase ml-1">
                    Research Email
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                      alternate_email
                    </span>
                    <input
                      type="email"
                      className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] focus:border-primary text-on-surface pl-12 py-3 rounded-t-lg transition-all outline-none"
                      placeholder="name@institution.edu"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end ml-1">
                    <label className="font-data-label text-data-label text-on-surface-variant uppercase">
                      Security Password
                    </label>
                    <a
                      href="#"
                      className="font-data-label text-data-label text-primary-fixed-dim hover:text-primary transition-colors"
                    >
                      Forgot Access?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                      lock
                    </span>
                    <input
                      type="password"
                      className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] focus:border-primary text-on-surface pl-12 py-3 rounded-t-lg transition-all outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-primary-container text-on-primary-container font-headline-lg text-lg rounded-lg transition-all duration-150 ease-in-out active:scale-95 hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] flex items-center justify-center gap-2 group"
                >
                  <span>Login</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </button>
              </form>

              <footer className="mt-8 pt-8 border-t border-[rgba(255,255,255,0.1)] text-center">
                <p className="text-on-surface-variant text-sm">
                  New to SDD Navigator?{" "}
                  <Link
                    href="/register"
                    className="text-primary font-bold hover:underline underline-offset-4 ml-1"
                  >
                    Request Scientific Access
                  </Link>
                </p>
              </footer>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
