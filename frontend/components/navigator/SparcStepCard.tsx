"use client";

import type { InternalProvider, SparcStepContribution } from "@/types/navigator";
import { track } from "@/lib/posthog";

// Step-specific SPARC card. Unlike the old static InternalProviderCard (which
// showed SPARC's full capability/tool list identically on every step), this
// renders only the subset of SPARC's REAL capabilities/tools relevant to the
// CURRENTLY selected roadmap step, plus a short "how" explanation. Provider
// identity (name, contact, cost/timeline, FREE) comes from the DB row; the
// step-specific selection comes from `contribution` (validated server-side).
// `speciality` = description, `contact` = URL.
export default function SparcStepCard({
  provider,
  contribution,
}: {
  provider: InternalProvider | null;
  contribution?: SparcStepContribution | null;
}) {
  // No SPARC row, or SPARC doesn't fit this particular step → render nothing.
  if (!provider) return null;
  if (!contribution || !contribution.relevant) return null;

  const capabilities = contribution.capabilities ?? [];
  const tools = contribution.tools ?? [];
  if (capabilities.length === 0 && tools.length === 0) return null;

  return (
    <div>
      <h4 className="font-label-sm text-label-sm text-primary mb-3 uppercase flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]">verified</span>
        How UAB SPARC Helps Here
      </h4>
      <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
        <div className="flex items-start flex-wrap gap-1.5 mb-1.5">
          <span className="font-bold text-on-surface text-sm">{provider.name}</span>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-primary text-on-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">verified</span>
            Internal · UAB
          </span>
          {provider.is_free && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-100 text-green-700">
              FREE
            </span>
          )}
        </div>

        {/* Step-specific explanation — changes as the researcher clicks steps. */}
        {contribution.how && (
          <p className="text-on-surface-variant text-xs mb-2.5 leading-relaxed">
            {contribution.how}
          </p>
        )}

        {capabilities.length > 0 && (
          <div className="mb-2.5">
            <span className="block text-[10px] font-bold uppercase text-outline mb-1">
              Relevant Capabilities
            </span>
            <div className="flex flex-wrap gap-1">
              {capabilities.map((c) => (
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

        {tools.length > 0 && (
          <div className="mb-2.5">
            <span className="block text-[10px] font-bold uppercase text-outline mb-1">
              Relevant Tools
            </span>
            <div className="flex flex-wrap gap-1">
              {tools.map((t) => (
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
          {provider.estimated_cost && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">
              <span className="material-symbols-outlined text-[13px]">payments</span>
              {provider.estimated_cost}
            </span>
          )}
          {provider.estimated_timeline && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              {provider.estimated_timeline}
            </span>
          )}
        </div>

        <button
          onClick={() => {
            track("provider_connect_clicked"); // fire-and-forget, before any navigation
            if (!provider.contact) {
              window.open("mailto:sparc@uab.edu");
              return;
            }
            const url = /^https?:\/\//i.test(provider.contact)
              ? provider.contact
              : "https://" + provider.contact;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          className="text-primary font-bold text-xs hover:underline"
        >
          Connect →
        </button>
      </div>
    </div>
  );
}
