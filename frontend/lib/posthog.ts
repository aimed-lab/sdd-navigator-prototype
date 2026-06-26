import posthog from "posthog-js";

// Single shared PostHog client. Initialized once (client-side only) by
// PostHogProvider, then used for fire-and-forget event capture everywhere.
// Reads the key/host from the existing NEXT_PUBLIC_* env vars — never hardcoded.

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  // No key configured → skip silently. Analytics is never load-bearing.
  if (!key) return;

  try {
    posthog.init(key, {
      api_host: host ?? "https://us.i.posthog.com",
      capture_pageview: true, // automatic pageviews (initial + SPA navigations)
      capture_pageleave: true,
    });
    initialized = true;
  } catch {
    // Init failure must never break the app.
  }
}

// Fire-and-forget event capture. Wrapped so a missing/uninitialized PostHog
// (or any internal error) can never block or throw inside a user action.
export function track(event: string, properties?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined") return;
    posthog.capture(event, properties);
  } catch {
    // swallow — analytics is best-effort only
  }
}

export { posthog };
