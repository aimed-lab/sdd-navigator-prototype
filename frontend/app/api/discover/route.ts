import { NextResponse } from "next/server";

export type DiscoverItem = {
  id: string;
  type: "paper" | "patent" | "grant" | "trial" | "preprint";
  title: string;
  description: string;
  source: string;
  date: string;
  dateISO: string;
  url: string;
  tags: string[];
};

// ── XML/RSS helpers ───────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const cdata = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`,
    "i"
  );
  const cdataMatch = cdata.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const plainMatch = plain.exec(xml);
  return plainMatch
    ? plainMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function parseRSSItems(
  xml: string
): { title: string; description: string; link: string; pubDate: string }[] {
  const items: { title: string; description: string; link: string; pubDate: string }[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    items.push({
      title: extractTag(match[1], "title"),
      description: extractTag(match[1], "description"),
      link:
        extractTag(match[1], "link") || extractTag(match[1], "guid"),
      pubDate:
        extractTag(match[1], "pubDate") || extractTag(match[1], "dc:date"),
    });
  }
  return items;
}

function toISO(dateStr: string): string {
  if (!dateStr) return new Date(0).toISOString();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();
  // PubMed "2024 Oct" or "2024 Oct 15"
  const m = /(\d{4})\s+([A-Za-z]{3})(?:\s+(\d{1,2}))?/.exec(dateStr);
  if (m) {
    const parsed = new Date(`${m[2]} ${m[3] ?? "1"} ${m[1]}`);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function fmtDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "Recent";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Source fetchers ───────────────────────────────────────────────────────────

async function fetchPubMed(): Promise<DiscoverItem[]> {
  const searchUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
    "?db=pubmed&term=drug+discovery+AI&retmax=6&sort=date&mindate=2024&retmode=json";

  const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
  const searchData = await searchRes.json() as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = searchData.esearchresult?.idlist ?? [];
  if (!ids.length) return [];

  const summaryUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` +
    `?db=pubmed&id=${ids.join(",")}&retmode=json`;
  const summaryRes = await fetch(summaryUrl, { next: { revalidate: 3600 } });
  const summaryData = await summaryRes.json() as {
    result?: Record<string, {
      title?: string; source?: string; pubdate?: string;
      authors?: { name: string }[];
    }>;
  };
  const result = summaryData.result ?? {};
  const uids = (result.uids as string[] | undefined) ?? ids;

  return uids.map((id) => {
    const item = result[id] ?? {};
    const isoDate = toISO(item.pubdate ?? "");
    const authorStr =
      (item.authors ?? [])
        .slice(0, 2)
        .map((a) => a.name)
        .join(", ") +
      ((item.authors?.length ?? 0) > 2 ? " et al." : "");

    return {
      id: `pubmed-${id}`,
      type: "paper" as const,
      title: item.title ?? "Untitled",
      description: `Published in ${item.source ?? "Unknown Journal"}. ${authorStr}`.trim(),
      source: item.source ?? "PubMed",
      date: fmtDate(isoDate),
      dateISO: isoDate,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      tags: ["Drug Discovery", "AI"],
    };
  });
}

async function fetchNIHGrants(): Promise<DiscoverItem[]> {
  const res = await fetch("https://api.reporter.nih.gov/v2/projects/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ criteria: { terms: "drug discovery AI" }, limit: 3 }),
    next: { revalidate: 3600 },
  });
  const data = await res.json() as {
    results?: {
      appl_id?: number;
      project_title?: string;
      abstract_text?: string;
      project_start_date?: string;
      award_amount?: number;
    }[];
  };

  return (data.results ?? []).map((p) => {
    const isoDate = toISO(p.project_start_date ?? "");
    const amount = p.award_amount
      ? ` · $${(p.award_amount / 1_000_000).toFixed(1)}M`
      : "";
    const desc = (p.abstract_text ?? "").replace(/<[^>]+>/g, " ").slice(0, 220);
    return {
      id: `nih-${p.appl_id ?? Math.random()}`,
      type: "grant" as const,
      title: p.project_title ?? "NIH Grant",
      description: desc || "NIH-funded drug discovery research project.",
      source: `NIH Reporter${amount}`,
      date: fmtDate(isoDate),
      dateISO: isoDate,
      url: `https://reporter.nih.gov/project-details/${p.appl_id ?? ""}`,
      tags: ["NIH", "Grant"],
    };
  });
}

async function fetchClinicalTrials(): Promise<DiscoverItem[]> {
  const url =
    "https://clinicaltrials.gov/api/v2/studies" +
    "?query.term=drug+discovery+AI&filter.overallStatus=RECRUITING&pageSize=3";
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json() as {
    studies?: {
      protocolSection?: {
        identificationModule?: { nctId?: string; briefTitle?: string };
        statusModule?: { startDateStruct?: { date?: string } };
        descriptionModule?: { briefSummary?: string };
      };
    }[];
  };

  return (data.studies ?? []).map((s) => {
    const proto = s.protocolSection ?? {};
    const ident = proto.identificationModule ?? {};
    const status = proto.statusModule ?? {};
    const desc = proto.descriptionModule ?? {};
    const nctId = ident.nctId ?? "";
    const isoDate = toISO(status.startDateStruct?.date ?? "");
    return {
      id: `ct-${nctId}`,
      type: "trial" as const,
      title: ident.briefTitle ?? "Clinical Trial",
      description:
        (desc.briefSummary ?? "").slice(0, 220) ||
        "Actively recruiting clinical trial.",
      source: "ClinicalTrials.gov",
      date: fmtDate(isoDate),
      dateISO: isoDate,
      url: `https://clinicaltrials.gov/study/${nctId}`,
      tags: ["Clinical Trial", "Recruiting"],
    };
  });
}

async function fetchPatents(): Promise<DiscoverItem[]> {
  const url = "https://patents.google.com/rss/query=drug+discovery+AI";
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SDD-Navigator/1.0; +https://sdd-navigator-six.vercel.app)",
    },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Patents RSS ${res.status}`);
  const xml = await res.text();
  const items = parseRSSItems(xml).slice(0, 5).filter((i) => i.title);

  return items.map((item, i) => {
    const isoDate = toISO(item.pubDate);
    const titleHash = item.title
      .split("")
      .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    return {
      id: `patent-${Math.abs(titleHash)}-${i}`,
      type: "patent" as const,
      title: item.title,
      description: item.description.slice(0, 220) || "Drug discovery patent.",
      source: "Google Patents",
      date: fmtDate(isoDate),
      dateISO: isoDate,
      url: item.link || url,
      tags: ["Patent", "Drug Discovery"],
    };
  });
}

async function fetchBioRxiv(): Promise<DiscoverItem[]> {
  const url =
    "https://biorxiv.org/rss/subject_collection/pharmacology_and_toxicology";
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`bioRxiv RSS ${res.status}`);
  const xml = await res.text();
  const items = parseRSSItems(xml).slice(0, 5).filter((i) => i.title);

  return items.map((item, i) => {
    const isoDate = toISO(item.pubDate);
    const titleHash = item.title
      .split("")
      .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    return {
      id: `biorxiv-${Math.abs(titleHash)}-${i}`,
      type: "preprint" as const,
      title: item.title,
      description: item.description.slice(0, 220) || "Pharmacology preprint.",
      source: "bioRxiv",
      date: fmtDate(isoDate),
      dateISO: isoDate,
      url: item.link || url,
      tags: ["Preprint", "Pharmacology"],
    };
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const results = await Promise.allSettled([
    fetchPubMed(),
    fetchNIHGrants(),
    fetchClinicalTrials(),
    fetchPatents(),
    fetchBioRxiv(),
  ]);

  const items: DiscoverItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
    // silently skip failed sources per spec
  }

  items.sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    }
  );
}
