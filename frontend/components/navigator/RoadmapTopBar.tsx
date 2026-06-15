"use client";

export default function RoadmapTopBar({
  title,
  summary,
  badgeLabel,
  badgeClassName,
  onStartOver,
  onDownloadPDF,
}: {
  title: string;
  summary: string;
  badgeLabel: string;
  badgeClassName?: string;
  onStartOver: () => void;
  onDownloadPDF: () => void;
}) {
  return (
    <div className="bg-white border-b border-outline-variant px-4 sm:px-gutter py-4 shrink-0">
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-gutter">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-bold text-xl md:text-3xl text-on-surface leading-snug">
              {title}
            </h1>
            <span
              className={`font-label-sm text-label-sm px-3 py-1 rounded-full shrink-0 ${
                badgeClassName ?? "bg-primary-container text-on-primary-container"
              }`}
            >
              {badgeLabel}
            </span>
          </div>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {summary}
          </p>
        </div>
        <div className="flex items-center gap-md shrink-0 w-full sm:w-auto">
          <button
            onClick={onStartOver}
            className="text-primary font-bold flex items-center gap-1 hover:underline"
          >
            <span className="material-symbols-outlined text-[20px]">restart_alt</span>
            Start Over
          </button>
          <button
            onClick={onDownloadPDF}
            className="flex-1 sm:flex-none bg-primary text-on-primary px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined">download</span>
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
