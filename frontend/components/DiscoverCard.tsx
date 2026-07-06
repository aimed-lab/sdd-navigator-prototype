"use client";

import type { DiscoverItem } from "@/types/discover";

// Shared with the Knowledge Hub Discover tab and the Navigator's Live Research
// Radar panel so both surfaces render live discovery items identically.

export const TYPE_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  paper: { color: "#1E88E5", bg: "#E3F2FD", label: "Paper" },
  grant: { color: "#FFA000", bg: "#FFF8E1", label: "Grant" },
  trial: { color: "#388E3C", bg: "#E8F5E9", label: "Trial" },
  tool:  { color: "#8E24AA", bg: "#F3E5F5", label: "Tool" },
};

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-container-high overflow-hidden flex flex-col animate-pulse">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <div className="h-5 w-16 bg-surface-container-high rounded" />
          <div className="w-6 h-6 bg-surface-container-high rounded" />
        </div>
        <div className="h-4 bg-surface-container-high rounded mb-2 w-full" />
        <div className="h-4 bg-surface-container-high rounded mb-4 w-4/5" />
        <div className="h-3 bg-surface-container-low rounded mb-2 w-full" />
        <div className="h-3 bg-surface-container-low rounded mb-2 w-3/4" />
        <div className="flex gap-1.5 mt-3">
          <div className="h-4 w-12 bg-surface-container-low rounded-full" />
          <div className="h-4 w-14 bg-surface-container-low rounded-full" />
        </div>
      </div>
      <div className="px-5 py-3 bg-surface-container-lowest border-t border-surface-container-high flex justify-between">
        <div className="h-3 w-24 bg-surface-container-high rounded" />
        <div className="h-3 w-16 bg-surface-container-high rounded" />
      </div>
    </div>
  );
}

export function DiscoverCard({
  item,
  canSave = false,
  saved = false,
  onToggleSave,
}: {
  item: DiscoverItem;
  // Save/bookmark is opt-in: surfaces that pass these (the Discover tab, for a
  // logged-in user) get a toggle; others (e.g. the Navigator radar) render as
  // before. canSave gates visibility so logged-out users never see the button.
  canSave?: boolean;
  saved?: boolean;
  onToggleSave?: (item: DiscoverItem) => void;
}) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.paper;
  const abbr = item.source
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-surface-container-high overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col"
      style={{ borderLeft: `3px solid ${cfg.color}` }}
    >
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <span
            className="px-3 py-1 rounded font-label-sm text-label-sm"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {canSave && onToggleSave && (
              <button
                onClick={() => onToggleSave(item)}
                aria-label={saved ? "Remove from saved" : "Save item"}
                aria-pressed={saved}
                className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{
                    color: saved ? cfg.color : undefined,
                    fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  bookmark
                </span>
              </button>
            )}
            <div className="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant shadow-inner">
              {abbr}
            </div>
          </div>
        </div>
        <h3 className="font-bold text-on-surface mb-2 line-clamp-2 hover:text-primary transition-colors cursor-pointer leading-snug">
          {item.title}
        </h3>
        <p className="text-on-surface-variant text-sm mb-3 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
        <div className="flex items-center gap-0.5 mb-3" title={`Relevance: ${item.relevance}/5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="material-symbols-outlined text-[14px]"
              style={{
                color: i < item.relevance ? cfg.color : "#d1d5db",
                fontVariationSettings: i < item.relevance ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              star
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-surface-container-low text-[10px] font-medium text-on-surface-variant rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
      <div className="px-5 py-3 bg-surface-container-lowest border-t border-surface-container-high flex justify-between items-center mt-auto">
        <span className="text-[11px] text-on-surface-variant font-medium">
          {item.source} • {item.date}
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-primary hover:underline"
        >
          Read More →
        </a>
      </div>
    </div>
  );
}
