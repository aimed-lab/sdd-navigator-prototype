"use client";

import Link from "next/link";
import type { ResearcherMini } from "@/types/navigator";

export default function ResearchersWhoCanHelp({
  researchers,
}: {
  researchers: ResearcherMini[];
}) {
  if (researchers.length === 0) return null;

  return (
    <div>
      <h4 className="font-label-sm text-label-sm text-outline mb-3 uppercase">
        Researchers Who Can Help
      </h4>
      <div className="space-y-2">
        {researchers.map((r) => {
          const initials = r.name
            .split(" ")
            .map((n) => n[0] ?? "")
            .join("")
            .toUpperCase()
            .slice(0, 2);
          return (
            <div
              key={r.id}
              className="p-2.5 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface text-xs leading-tight truncate">
                    {r.name}
                  </p>
                  {r.research_focus && (
                    <p
                      className="text-[10px] text-on-surface-variant line-clamp-2"
                      title={r.research_focus}
                    >
                      {r.research_focus}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {r.profile_slug && (
                  <Link href={`/researchers/${r.profile_slug}`}>
                    <button className="text-[10px] font-bold text-primary border border-primary/30 px-2 py-0.5 rounded hover:bg-primary/5 transition-colors">
                      View
                    </button>
                  </Link>
                )}
                {r.email && (
                  <button
                    onClick={() => window.open("mailto:" + r.email)}
                    className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded hover:opacity-90 transition-opacity"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
