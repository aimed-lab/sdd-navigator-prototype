"use client";

import type { InternalProvider } from "@/types/navigator";
import { track } from "@/lib/posthog";

// Renders REAL internal UAB providers (SPARC) read from the `providers` table.
// Styled deliberately distinct from the LLM-suggested external CROs: a solid
// primary border + "Internal · UAB" verified badge make clear this entry is
// grounded in the DB, not generated. `speciality` = description, `contact` = URL.
export default function InternalProviderCard({
  providers,
}: {
  providers: InternalProvider[];
}) {
  if (!providers || providers.length === 0) return null;

  return (
    <div>
      <h4 className="font-label-sm text-label-sm text-primary mb-3 uppercase flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]">verified</span>
        UAB Internal Provider
      </h4>
      <div className="space-y-3">
        {providers.map((p) => (
          <div
            key={p.name}
            className="p-4 border-2 border-primary rounded-lg bg-primary/5"
          >
            <div className="flex items-start flex-wrap gap-1.5 mb-1.5">
              <span className="font-bold text-on-surface text-sm">{p.name}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-primary text-on-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Internal · UAB
              </span>
              {p.is_free && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-100 text-green-700">
                  FREE
                </span>
              )}
            </div>

            {p.speciality && (
              <p className="text-on-surface-variant text-xs mb-2.5 leading-relaxed">
                {p.speciality}
              </p>
            )}

            {p.capabilities && p.capabilities.length > 0 && (
              <div className="mb-2.5">
                <span className="block text-[10px] font-bold uppercase text-outline mb-1">
                  Capabilities
                </span>
                <div className="flex flex-wrap gap-1">
                  {p.capabilities.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {p.tools && p.tools.length > 0 && (
              <div className="mb-2.5">
                <span className="block text-[10px] font-bold uppercase text-outline mb-1">
                  Tools
                </span>
                <div className="flex flex-wrap gap-1">
                  {p.tools.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-2">
              {p.estimated_cost && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">
                  <span className="material-symbols-outlined text-[13px]">payments</span>
                  {p.estimated_cost}
                </span>
              )}
              {p.estimated_timeline && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  {p.estimated_timeline}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                track("provider_connect_clicked"); // fire-and-forget, before any navigation
                if (!p.contact) {
                  window.open("mailto:sparc@uab.edu");
                  return;
                }
                const url = /^https?:\/\//i.test(p.contact)
                  ? p.contact
                  : "https://" + p.contact;
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
