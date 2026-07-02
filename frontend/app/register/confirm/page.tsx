import Link from "next/link";

// Static "check your email" confirmation screen. Users land here right after
// signup (register/page.tsx does router.push("/register/confirm")), before they
// have confirmed their email — so this is a PUBLIC route with no auth gate and
// no data fetching. Visual design mirrors the signup/login split-screen.
export default function RegisterConfirmPage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel: branded green canvas (hidden on mobile) — matches signup */}
      <section className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Wordmark */}
        <div className="z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                science
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md font-bold tracking-tight">SDD Navigator</h1>
          </div>
        </div>

        {/* Center pitch */}
        <div className="z-10 max-w-lg">
          <h2 className="font-display-lg text-display-lg mb-6 leading-tight">Accelerating Discovery.</h2>
          <p className="font-body-lg text-body-lg text-primary-fixed/80">
            Join the global network of researchers leveraging AI to pioneer the next generation of
            therapeutic solutions.
          </p>
        </div>

        {/* Decorative molecular line-art accent (consistent with login/signup) */}
        <div className="absolute inset-0 opacity-20 pointer-events-none text-primary-fixed">
          <div className="absolute top-1/4 right-0 w-96 h-96 border border-primary-fixed rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-1/4 -left-20 w-80 h-80 border border-primary-fixed rounded-full blur-2xl opacity-20" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" fill="currentColor" r="2" />
            <circle cx="300" cy="150" fill="currentColor" r="3" />
            <circle cx="200" cy="400" fill="currentColor" r="2" />
            <circle cx="500" cy="300" fill="currentColor" r="4" />
            <circle cx="600" cy="600" fill="currentColor" r="2" />
            <circle cx="150" cy="700" fill="currentColor" r="3" />
            <path
              d="M100 100 L300 150 M300 150 L500 300 M500 300 L600 600 M200 400 L500 300 M150 700 L200 400"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        {/* Bottom attribution mark */}
        <div className="z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                science
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-white/60 uppercase tracking-widest">
                Collaborative Infrastructure
              </span>
              <span className="text-sm text-white font-semibold">Built at UAB SPARC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right panel: confirmation card */}
      <section className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 md:p-10 relative">
        {/* Mobile wordmark (left panel hidden on small screens) */}
        <Link href="/" className="lg:hidden absolute top-8 left-6 inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">science</span>
          <span className="font-headline-md text-headline-md font-bold text-primary">SDD Navigator</span>
        </Link>

        <div className="w-full max-w-md text-center">
          <div className="bg-surface-container-lowest border border-outline-variant p-8 sm:p-12 rounded-3xl shadow-sm">
            {/* Mail icon in a circle */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary-container rounded-full mb-8">
              <span
                className="material-symbols-outlined text-primary text-[40px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mail
              </span>
            </div>

            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Check your email</h2>

            {/* Honest instructions — no "Open Email App" button that pretends to
                launch a mail client. Just tell the user what to do. */}
            <p className="font-body-md text-body-md text-on-surface-variant mb-10">
              We&rsquo;ve sent a verification link to your email. Open your inbox and click the link to
              activate your account and start your research journey.
            </p>

            {/* Back to login — real link. No fake resend button (we don't have the
                email address on this route, so a real supabase.auth.resend can't
                be wired here — a fake "sent!" toast would be dishonest). */}
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to login
            </Link>
          </div>

          {/* Assistance footer — real mailto to the SPARC support address used
              elsewhere in the app (SparcStepCard, ProvidersList). */}
          <p className="mt-8 font-label-sm text-label-sm text-outline">
            Need help?{" "}
            <a
              href="mailto:sparc@uab.edu"
              className="text-primary hover:underline decoration-1 underline-offset-2"
            >
              Contact support
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
