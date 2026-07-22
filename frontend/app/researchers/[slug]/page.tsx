"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

type Researcher = {
  id: string;
  name: string;
  affiliation: string | null;
  institution: string | null;
  country: string | null;
  bio: string | null;
  research_focus: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  interests: string[] | null;
  is_public: boolean;
  profile_slug: string | null;
};

type Work = {
  id: string;
  user_id: string;
  type: "paper" | "tool" | "dataset";
  title: string;
  journal: string | null;
  year: number | null;
  url: string | null;
  description: string | null;
  created_at: string;
};

// One of this researcher's registered lab resources (public columns; no
// contact_info — revealed per-resource via the auth-gated /contact route).
type LabResource = {
  id: string;
  category: string;
  fields: Record<string, unknown>;
  created_at: string;
};

type ContactPayload = { contact_info: string | null; owner_name: string | null };

const AVATAR_COLORS = [
  { bg: "bg-primary-container", text: "text-on-primary-container" },
  { bg: "bg-secondary-container", text: "text-on-secondary-container" },
  { bg: "bg-tertiary-container", text: "text-on-tertiary-container" },
  { bg: "bg-surface-container-high", text: "text-on-surface-variant" },
];

// Lab-resource categories, in display order (only registered ones are rendered).
const CATEGORY_ORDER = [
  "technique",
  "equipment",
  "vector",
  "animal_model",
  "cell_line",
  "protein_antibody",
  "software",
  "drug",
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  technique: "Techniques",
  equipment: "Equipment",
  vector: "Vectors",
  animal_model: "Animal Models",
  cell_line: "Cell Lines",
  protein_antibody: "Proteins / Antibodies",
  software: "Software",
  drug: "Drugs",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export default function ResearcherProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const router = useRouter();

  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [resources, setResources] = useState<LabResource[]>([]);
  const [related, setRelated] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Connect dialog state — null when closed.
  const [connect, setConnect] = useState<{
    resource: LabResource;
    loading: boolean;
    data: ContactPayload | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const res = await fetch(`/api/researchers/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = await res.json();

        setResearcher(data.profile);
        setWorks(data.works ?? []);
        setResources(data.resources ?? []);

        const myInterests = new Set(
          ((data.profile?.interests ?? []) as string[]).map((i) => i.toLowerCase())
        );
        const sorted = ((data.related ?? []) as Researcher[]).sort((a, b) => {
          const aScore = (a.interests ?? []).filter((i) =>
            myInterests.has(i.toLowerCase())
          ).length;
          const bScore = (b.interests ?? []).filter((i) =>
            myInterests.has(i.toLowerCase())
          ).length;
          return bScore - aScore;
        });
        setRelated(sorted.slice(0, 3));
        setLoading(false);
      } catch {
        setNotFound(true);
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  // Connect: logged-out → login redirect back to this profile; logged-in → reveal
  // this specific resource's contact via the auth-gated /contact route.
  async function openConnect(resource: LabResource) {
    if (!user) {
      router.push(`/login?callbackUrl=/researchers/${encodeURIComponent(slug)}`);
      return;
    }
    setConnect({ resource, loading: true, data: null, error: null });
    try {
      const res = await fetch(`/api/collaborate/resources/${resource.id}/contact`);
      if (!res.ok) throw new Error("Could not load contact info.");
      const data = (await res.json()) as ContactPayload;
      setConnect({ resource, loading: false, data, error: null });
    } catch {
      setConnect({ resource, loading: false, data: null, error: "Could not load contact info." });
    }
  }

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !researcher) {
    return (
      <div className="bg-background min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-gutter">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
            person_off
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
            Researcher not found
          </h2>
          <p className="text-on-surface-variant mb-6">
            This profile may be private or does not exist.
          </p>
          <Link href="/researchers">
            <button className="px-8 py-3 bg-primary text-on-primary rounded-full text-sm font-medium hover:bg-primary-container transition-all">
              Browse Researchers
            </button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const color = avatarColor(researcher.name);
  const titleLine = [researcher.affiliation, researcher.institution]
    .filter(Boolean)
    .join(" | ");
  const interests = researcher.interests ?? [];

  // Publications come from researcher_works type=paper (now ORCID-sourced). Tool/
  // dataset works are no longer rendered — resource categories replace them.
  const papers = works.filter((w) => w.type === "paper");

  // Group registered resources by category, preserving display order. Categories
  // with nothing registered are simply omitted (no placeholder sections).
  const resourcesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: resources.filter((r) => r.category === cat),
  })).filter((g) => g.items.length > 0);

  const nothingToShow = papers.length === 0 && resources.length === 0;

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-gutter py-8 md:py-10">
        {/* Profile header card */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            <div
              className={`w-28 h-28 md:w-36 md:h-36 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-bold text-4xl md:text-5xl shrink-0 border-4 border-primary-fixed`}
            >
              {getInitials(researcher.name)}
            </div>

            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-1">
                {researcher.name}
              </h1>
              {researcher.research_focus && (
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-1">
                  {researcher.research_focus}
                </p>
              )}
              {titleLine && (
                <div className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-on-surface-variant mb-4">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  {titleLine}
                </div>
              )}

              {interests.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-sm text-label-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main column */}
          <div className="lg:col-span-8 space-y-8">
            {/* About */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">info</span>
                About
              </h2>
              {researcher.bio ? (
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {researcher.bio}
                </p>
              ) : (
                <p className="text-on-surface-variant italic">No biography provided yet.</p>
              )}
            </section>

            {nothingToShow && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
                <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
                  inventory_2
                </span>
                <p className="text-on-surface-variant">No publications or shared resources yet.</p>
              </div>
            )}

            {/* Publications (ORCID-sourced) — same visual card style as before */}
            {papers.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">menu_book</span>
                  Publications
                </h2>
                <div className="space-y-4">
                  {papers.map((work) => (
                    <div
                      key={work.id}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)] hover:border-[#D1D5DB] transition-all group"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          {(work.journal || work.year) && (
                            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">
                              {[work.journal, work.year].filter(Boolean).join(" • ")}
                            </span>
                          )}
                          <h3 className="font-headline-md text-[20px] text-on-surface mt-1 group-hover:text-secondary transition-colors leading-snug">
                            {work.title}
                          </h3>
                          {work.description && (
                            <p className="font-body-md text-body-md text-on-surface-variant mt-2 line-clamp-2">
                              {work.description}
                            </p>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-outline-variant group-hover:text-secondary transition-colors shrink-0">
                          arrow_right_alt
                        </span>
                      </div>
                      {work.url && (
                        <a
                          href={work.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-4 text-secondary font-label-sm text-label-sm font-bold hover:underline"
                        >
                          View Paper
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Registered lab resources — one section per category the person has,
                each resource with its own gated Connect button. No placeholder
                sections for categories they haven't registered. */}
            {resourcesByCategory.map((group) => (
              <section key={group.category}>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">biotech</span>
                  {CATEGORY_LABEL[group.category] ?? group.category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.items.map((res) => {
                    const name = str(res.fields.name) || "Untitled";
                    const piLab = str(res.fields.pi_lab);
                    const protocol = str(res.fields.protocol_link);
                    return (
                      <div
                        key={res.id}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-all flex flex-col"
                      >
                        <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center mb-4">
                          <span className="material-symbols-outlined text-secondary text-[28px]">science</span>
                        </div>
                        <h3 className="font-headline-md text-[20px] text-on-surface mb-1">{name}</h3>
                        {piLab && (
                          <p className="text-on-surface-variant font-body-md text-body-md mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">groups</span>
                            {piLab}
                          </p>
                        )}
                        {protocol && (
                          <a
                            href={protocol}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mb-4 text-secondary text-sm font-medium hover:underline"
                          >
                            <span className="material-symbols-outlined text-[18px]">description</span>
                            Protocol / SOP
                          </a>
                        )}
                        <button
                          onClick={() => openConnect(res)}
                          className="mt-auto w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-colors active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[18px]">handshake</span>
                          Connect
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {(researcher.website_url || researcher.linkedin_url) && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-outline mb-4">
                  Professional Links
                </h3>
                <div className="space-y-4">
                  {researcher.website_url && (
                    <a
                      href={researcher.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-on-surface-variant hover:text-secondary transition-colors group"
                    >
                      <span className="material-symbols-outlined text-[22px]">language</span>
                      <span className="text-sm font-medium">Lab Website</span>
                      <span className="material-symbols-outlined text-[16px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        open_in_new
                      </span>
                    </a>
                  )}
                  {researcher.linkedin_url && (
                    <a
                      href={researcher.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-on-surface-variant hover:text-secondary transition-colors group"
                    >
                      <span className="material-symbols-outlined text-[22px]">link</span>
                      <span className="text-sm font-medium">LinkedIn Profile</span>
                      <span className="material-symbols-outlined text-[16px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        open_in_new
                      </span>
                    </a>
                  )}
                </div>
              </section>
            )}

            {related.length > 0 && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-outline mb-4">
                  Related Researchers
                </h3>
                <div className="space-y-4">
                  {related.map((r) => {
                    const rc = avatarColor(r.name);
                    return (
                      <Link key={r.id} href={`/researchers/${r.profile_slug}`}>
                        <div className="flex items-center gap-3 p-2 -m-2 hover:bg-surface-container-low rounded-lg transition-all cursor-pointer">
                          <div
                            className={`w-12 h-12 rounded-full ${rc.bg} ${rc.text} flex items-center justify-center font-bold text-sm shrink-0`}
                          >
                            {getInitials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-label-sm text-label-sm text-on-surface truncate">
                              {r.name}
                            </p>
                            <p className="text-xs text-on-surface-variant truncate">
                              {r.research_focus || r.affiliation || "Researcher"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>
      <Footer />

      {/* Connect dialog */}
      {connect && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConnect(null)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant w-full max-w-md p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline-md text-headline-md text-on-surface">Contact details</h2>
              <button
                onClick={() => setConnect(null)}
                aria-label="Close"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mb-4">
              <p className="font-headline-md text-[18px] text-on-surface">
                {str(connect.resource.fields.name) || "Resource"}
              </p>
              <p className="text-sm text-on-surface-variant">
                Shared by {connect.data?.owner_name || researcher.name}
              </p>
            </div>

            {connect.loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : connect.error ? (
              <p className="p-3 bg-error-container text-on-error-container rounded-lg text-sm">
                {connect.error}
              </p>
            ) : connect.data?.contact_info ? (
              <div>
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline mb-2">
                  How to reach them
                </p>
                <div className="p-4 bg-surface-container rounded-lg border border-outline-variant whitespace-pre-wrap break-words text-on-surface font-body-md text-body-md">
                  {connect.data.contact_info}
                </div>
                <p className="text-xs text-on-surface-variant mt-3">
                  Reach out directly using the details above — SDD Navigator doesn&apos;t relay messages.
                </p>
              </div>
            ) : (
              <p className="text-on-surface-variant italic">
                This owner hasn&apos;t provided contact details.
              </p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setConnect(null)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
