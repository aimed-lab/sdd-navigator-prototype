"use client";

import type { CROPartner } from "@/types/navigator";
import { track } from "@/lib/posthog";

export default function CROPartnersList({ partners }: { partners: CROPartner[] }) {
  if (!partners || partners.length === 0) return null;

  return (
    <div>
      <h4 className="font-label-sm text-label-sm text-outline mb-3 uppercase">CRO Partners</h4>
      <div className="space-y-3">
        {partners.map((partner) => (
          <div
            key={partner.name}
            className="p-3 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-start flex-wrap gap-1.5 mb-1.5">
              <span className="font-bold text-on-surface text-sm">{partner.name}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-surface-container text-on-surface-variant">
                CRO
              </span>
            </div>
            <p className="text-on-surface-variant text-xs mb-2 leading-relaxed">
              {partner.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {partner.estimated_cost && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">
                  <span className="material-symbols-outlined text-[13px]">payments</span>
                  {partner.estimated_cost}
                </span>
              )}
              {partner.estimated_timeline && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  {partner.estimated_timeline}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                track("provider_connect_clicked"); // fire-and-forget, before any navigation
                if (!partner.website) {
                  window.open("mailto:sparc@uab.edu");
                  return;
                }
                const url = /^https?:\/\//i.test(partner.website)
                  ? partner.website
                  : "https://" + partner.website;
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
