"use client";

import type { DiscoverItem } from "@/types/discover";
import { TYPE_CONFIG } from "@/components/DiscoverCard";

// Shared discovery/feed card — used on BOTH /discovery and the logged-in home
// dashboard so the two surfaces render items identically.
//
// Layout is the Discovery card's: type badge + match pill ("Strong match" /
// "Good match"), a top-right bookmark, source • date, title, description, and
// hashtag tags + "Read More →" at the bottom.
//
// Color-coding by type is pulled from the home DiscoverCard's TYPE_CONFIG so the
// accents stay consistent across surfaces:
//   • a colored LEFT BORDER (tool=purple, grant=amber, paper=blue, trial=green)
//   • a tinted TYPE BADGE (matching background + text), instead of the old
//     one-color green pill.
// The match pill is unchanged.

// Honest qualitative label for the real 1-5 relevance score (no fabricated
// percentages). Top tier reads as the mint accent, lower tiers as neutral.
function matchTier(relevance: number): { label: string; className: string } {
  if (relevance >= 4)
    return { label: "Strong match", className: "bg-secondary-fixed text-on-secondary-container" };
  if (relevance === 3)
    return { label: "Good match", className: "bg-secondary-fixed text-on-secondary-container" };
  return { label: "Related", className: "bg-surface-container-highest text-on-surface-variant" };
}

export function FeedCard({
  item,
  canSave = false,
  showMatch = false,
  saved = false,
  onToggleSave,
}: {
  item: DiscoverItem;
  // Save/bookmark is opt-in: surfaces that pass canSave + onToggleSave (the
  // Discovery feed for a logged-in user) get a toggle; others (the dashboard)
  // omit them and render read-only.
  canSave?: boolean;
  showMatch?: boolean;
  saved?: boolean;
  onToggleSave?: (item: DiscoverItem) => void;
}) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.paper;
  const tier = matchTier(item.relevance);
  return (
    <div
      className="bg-white border border-outline-variant p-5 rounded-xl hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)] hover:border-[#D1D5DB] transition-all duration-300 relative flex flex-col h-full"
      style={{ borderLeft: `3px solid ${cfg.color}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {showMatch && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${tier.className}`}
              title={`Relevance: ${item.relevance}/5`}
            >
              {tier.label}
            </span>
          )}
        </div>
        {canSave && onToggleSave && (
          <button
            onClick={() => onToggleSave(item)}
            aria-label={saved ? "Remove from saved" : "Save item"}
            aria-pressed={saved}
            className="text-on-surface-variant hover:text-primary transition-colors shrink-0"
          >
            <span
              className="material-symbols-outlined"
              style={{
                color: saved ? "#00523c" : undefined,
                fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              bookmark
            </span>
          </button>
        )}
      </div>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-headline-md text-headline-md text-primary leading-tight mb-2 line-clamp-2 hover:underline"
      >
        {item.title}
      </a>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-label-sm font-bold text-on-surface">{item.source}</span>
        <span className="w-1 h-1 rounded-full bg-outline-variant" />
        <span className="text-label-sm font-label-sm text-on-surface-variant">{item.date}</span>
      </div>

      <p className="text-body-md font-body-md text-on-surface-variant line-clamp-2 flex-grow">
        {item.description}
      </p>

      {item.tags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-surface-variant flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-[22px]">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-surface-container-low text-[10px] font-medium text-on-surface-variant rounded-full whitespace-nowrap"
              >
                #{tag}
              </span>
            ))}
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-primary hover:underline shrink-0"
          >
            Read More →
          </a>
        </div>
      )}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="bg-white border border-outline-variant p-5 rounded-xl flex flex-col h-full animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-16 bg-surface-container-high rounded-full" />
        <div className="w-6 h-6 bg-surface-container-high rounded" />
      </div>
      <div className="h-5 bg-surface-container-high rounded mb-2 w-full" />
      <div className="h-5 bg-surface-container-high rounded mb-3 w-4/5" />
      <div className="h-3 bg-surface-container-low rounded mb-3 w-1/2" />
      <div className="h-4 bg-surface-container-low rounded mb-2 w-full" />
      <div className="h-4 bg-surface-container-low rounded w-3/4" />
      <div className="mt-4 pt-4 border-t border-surface-variant flex gap-1.5">
        <div className="h-4 w-12 bg-surface-container-low rounded-full" />
        <div className="h-4 w-14 bg-surface-container-low rounded-full" />
      </div>
    </div>
  );
}
