"use client";

import { useEffect } from "react";
import { initPostHog } from "@/lib/posthog";

// Client component: initializes PostHog once on mount. Rendered by the
// (server) root layout so the rest of the tree stays server-rendered.
// Renders children unchanged — purely a side-effect boundary.
export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <>{children}</>;
}
