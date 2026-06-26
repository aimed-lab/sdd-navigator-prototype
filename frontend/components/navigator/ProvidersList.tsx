"use client";

import type { Provider } from "@/types/navigator";
import { track } from "@/lib/posthog";

export default function ProvidersList({
  providers,
  title = "Service Providers",
}: {
  providers: Provider[];
  title?: string;
}) {
  if (!providers || providers.length === 0) return null;

  return (
    <div>
      <h4 className="font-label-sm text-label-sm text-outline mb-3 uppercase">
        {title}
      </h4>
      <div className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.name}
            className="p-3 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-start flex-wrap gap-1.5 mb-1.5">
              <span className="font-bold text-on-surface text-sm">
                {provider.name}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-surface-container text-on-surface-variant">
                {provider.type}
              </span>
              {provider.free && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-100 text-green-700">
                  FREE
                </span>
              )}
            </div>
            <p className="text-on-surface-variant text-xs mb-2 leading-relaxed">
              {provider.description}
            </p>
            <button
              onClick={() => {
                track("provider_connect_clicked"); // fire-and-forget, before any navigation
                if (!provider.website) {
                  window.open("mailto:sparc@uab.edu");
                  return;
                }
                const url = /^https?:\/\//i.test(provider.website)
                  ? provider.website
                  : "https://" + provider.website;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="text-primary font-bold text-xs hover:underline"
            >
              Connect →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
