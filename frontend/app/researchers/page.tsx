"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type ResearcherCard = {
  id: string;
  name: string;
  affiliation: string | null;
  institution: string | null;
  bio: string | null;
  research_focus: string | null;
  interests: string[] | null;
  is_public: boolean;
  profile_slug: string | null;
};

// A public lab_resources row (no contact_info — that's revealed via the auth-gated
// /contact route, per resource, on Connect).
type LabResource = {
  id: string;
  owner_id: string;
  category: string;
  fields: Record<string, unknown>;
};

type ContactPayload = { contact_info: string | null; owner_name: string | null };

const RESEARCHER_AVATAR_COLORS = [
  { bg: "bg-primary-container", text: "text-on-primary-container" },
  { bg: "bg-secondary-container", text: "text-on-secondary-container" },
  { bg: "bg-tertiary-container", text: "text-on-tertiary-container" },
  { bg: "bg-surface-container-high", text: "text-on-surface-variant" },
];

// Lab-resource category chips. Only 'technique' is live/functional in v1; the
// other 7 render disabled ("coming soon").
const CATEGORY_CHIPS: { value: string; label: string; live: boolean }[] = [
  { value: "technique", label: "Technique", live: true },
  { value: "equipment", label: "Equipment", live: false },
  { value: "vector", label: "Vector", live: false },
  { value: "animal_model", label: "Animal Model", live: false },
  { value: "cell_line", label: "Cell Line", live: false },
  { value: "protein_antibody", label: "Protein/Antibody", live: false },
  { value: "software", label: "Software", live: false },
  { value: "drug", label: "Drug", live: false },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_CHIPS.map((c) => [c.value, c.label]),
);

function researcherInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function researcherAvatarColor(name: string) {
  return RESEARCHER_AVATAR_COLORS[name.charCodeAt(0) % RESEARCHER_AVATAR_COLORS.length];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ── "Be one of the first" invitation card ─────────────────────────────────────

function InvitationCard() {
  return (
    <Link href="/profile/setup" className="h-full">
      <div className="bg-surface-container-highest/30 border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[320px] h-full hover:bg-surface-container transition-colors">
        <div className="w-16 h-16 rounded-full bg-surface-container-lowest border border-outline-variant flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-primary text-[32px]">person_add</span>
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Be one of the first</h3>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6">
          Create your researcher profile and help build the network for the future of AI drug discovery.
        </p>
        <span className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
          Get Started
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </span>
      </div>
    </Link>
  );
}

// ── Featured Researchers (honest placeholder — no admin/curation yet) ──────────

function FeaturedResearchers() {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          star
        </span>
        <h2 className="font-headline-md text-headline-md text-on-surface">Featured Researchers</h2>
      </div>
      <div className="bg-surface-container-highest/30 border-2 border-dashed border-outline-variant rounded-xl p-10 flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">workspace_premium</span>
        <p className="font-body-lg text-body-lg text-on-surface mb-1">Coming soon</p>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
          Curated highlights of standout researchers will appear here once curation is available.
          This space is reserved and not yet active.
        </p>
      </div>
    </section>
  );
}

// ── Directory ─────────────────────────────────────────────────────────────────

const AFFILIATION_FILTERS = ["All", "Academic", "Industry", "Student"] as const;
type AffiliationFilter = (typeof AFFILIATION_FILTERS)[number];

function ResearchersTab({ user }: { user: unknown }) {
  const router = useRouter();

  const [researchers, setResearchers] = useState<ResearcherCard[]>([]);
  const [resourcesByOwner, setResourcesByOwner] = useState<Map<string, LabResource[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [affFilter, setAffFilter] = useState<AffiliationFilter>("All");
  // Lab-resource category filter: "all" or a live category ("technique").
  const [catFilter, setCatFilter] = useState<string>("all");

  // Connect dialog state — null when closed.
  const [connect, setConnect] = useState<{
    resource: LabResource;
    loading: boolean;
    data: ContactPayload | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/researchers");
        const data = await res.json();

        setResearchers(data.researchers ?? []);

        const byOwner = new Map<string, LabResource[]>();
        for (const r of (data.resources ?? []) as LabResource[]) {
          if (!byOwner.has(r.owner_id)) byOwner.set(r.owner_id, []);
          byOwner.get(r.owner_id)!.push(r);
        }
        setResourcesByOwner(byOwner);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selfId = (user as { id?: string } | null)?.id;
  const hasOwnProfile = Boolean(selfId) && researchers.some((r) => r.id === selfId);

  // Resources to show on a card, honoring the active category filter.
  function cardResources(ownerId: string): LabResource[] {
    const all = resourcesByOwner.get(ownerId) ?? [];
    if (catFilter === "all") return all;
    return all.filter((r) => r.category === catFilter);
  }

  const filtered = researchers.filter((r) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.institution ?? "").toLowerCase().includes(q) ||
      (r.research_focus ?? "").toLowerCase().includes(q) ||
      (r.interests ?? []).some((i) => i.toLowerCase().includes(q));

    const matchAff =
      affFilter === "All" ||
      (r.affiliation ?? "").toLowerCase().includes(affFilter.toLowerCase());

    // Category filter: when a category is active, only show researchers who have
    // at least one resource in it.
    const matchCat = catFilter === "all" || cardResources(r.id).length > 0;

    return matchSearch && matchAff && matchCat;
  });

  const filtersActive = Boolean(search) || affFilter !== "All" || catFilter !== "all";

  // Connect: logged-out → login redirect; logged-in → fetch + reveal contact.
  async function openConnect(resource: LabResource) {
    if (!user) {
      router.push("/login?callbackUrl=/researchers");
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

  return (
    <>
      {/* Search & filters */}
      <section className="mb-8 space-y-6">
        <div className="relative max-w-2xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, research area, affiliation…"
            className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline font-body-md text-body-md"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mr-2">
            Filters:
          </span>
          {AFFILIATION_FILTERS.map((f) => {
            const active = affFilter === f;
            return (
              <button
                key={f}
                onClick={() => setAffFilter(active && f !== "All" ? "All" : f)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 transition-colors ${
                  active
                    ? "bg-secondary text-on-secondary shadow-sm"
                    : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary"
                }`}
              >
                {f}
                {active && f !== "All" && (
                  <span className="material-symbols-outlined text-[16px]">close</span>
                )}
              </button>
            );
          })}
          {filtersActive && (
            <button
              onClick={() => { setSearch(""); setAffFilter("All"); setCatFilter("all"); }}
              className="ml-auto text-primary text-sm font-medium hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Lab-resource category chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mr-2">
            Resources:
          </span>
          <button
            onClick={() => setCatFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              catFilter === "all"
                ? "bg-secondary text-on-secondary shadow-sm"
                : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary"
            }`}
          >
            All
          </button>
          {CATEGORY_CHIPS.map((c) =>
            c.live ? (
              <button
                key={c.value}
                onClick={() => setCatFilter(catFilter === c.value ? "all" : c.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 transition-colors ${
                  catFilter === c.value
                    ? "bg-secondary text-on-secondary shadow-sm"
                    : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary"
                }`}
              >
                {c.label}
                {catFilter === c.value && (
                  <span className="material-symbols-outlined text-[16px]">close</span>
                )}
              </button>
            ) : (
              <button
                key={c.value}
                type="button"
                disabled
                title="Coming soon"
                className="px-4 py-2 rounded-full text-sm font-medium border border-outline-variant bg-surface-container-lowest text-on-surface-variant opacity-50 cursor-default flex items-center gap-1"
              >
                {c.label}
                <span className="material-symbols-outlined text-[15px]">hourglass_empty</span>
              </button>
            ),
          )}
        </div>
      </section>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 h-[280px] animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        researchers.length === 0 ? (
          <div className="max-w-md mx-auto">
            <InvitationCard />
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
              person_search
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
              No researchers found
            </h3>
            <p className="text-on-surface-variant mb-6">Try adjusting your search or filters.</p>
            <button
              onClick={() => { setSearch(""); setAffFilter("All"); setCatFilter("all"); }}
              className="px-8 py-3 bg-primary text-on-primary rounded-full text-sm font-medium shadow-sm hover:opacity-90 transition-all active:scale-95"
            >
              Clear filters
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((r) => {
            const color = researcherAvatarColor(r.name);
            const interests = r.interests ?? [];
            const resources = cardResources(r.id);
            const isSelf = selfId && r.id === selfId;
            return (
              <article
                key={r.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)] transition-all group flex flex-col"
              >
                {/* Header — links to the profile */}
                <Link href={`/researchers/${r.profile_slug}`} className="flex gap-4 mb-4">
                  <div
                    className={`w-20 h-20 rounded-xl ${color.bg} ${color.text} flex items-center justify-center font-bold font-headline-md text-headline-md flex-shrink-0 border border-outline-variant`}
                  >
                    {researcherInitials(r.name)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                      {r.name}
                    </h3>
                    {r.research_focus && (
                      <p className="text-sm font-semibold text-primary mb-1 line-clamp-1" title={r.research_focus}>
                        {r.research_focus}
                      </p>
                    )}
                    <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">account_balance</span>
                      <span className="line-clamp-1">
                        {r.institution || r.affiliation || "Independent Researcher"}
                      </span>
                    </p>
                  </div>
                </Link>

                {/* Interest tags */}
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {interests.slice(0, 3).map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bio */}
                {r.bio && (
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4 flex-grow line-clamp-3">
                    {r.bio}
                  </p>
                )}

                {/* Registered lab resources — each with its own Connect button.
                    Omitted entirely when the researcher has none (no empty state). */}
                {resources.length > 0 && (
                  <div className="border-t border-outline-variant/60 pt-4 mb-4 space-y-2">
                    <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                      Lab Resources
                    </p>
                    {resources.map((res) => (
                      <div
                        key={res.id}
                        className="flex items-center justify-between gap-3 bg-surface rounded-lg border border-outline-variant/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-secondary-container bg-secondary-container rounded-full px-2 py-0.5 mb-0.5">
                            {CATEGORY_LABEL[res.category] ?? res.category}
                          </span>
                          <p className="font-label-md text-label-md text-on-surface truncate">
                            {str(res.fields.name) || "Untitled"}
                          </p>
                        </div>
                        <button
                          onClick={() => openConnect(res)}
                          className="shrink-0 flex items-center gap-1 bg-primary text-on-primary px-4 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-colors active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">handshake</span>
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Own card → Edit profile */}
                {isSelf && (
                  <div className="mt-auto">
                    <Link href="/profile/setup" className="block">
                      <button className="w-full flex items-center justify-center gap-2 border border-primary/40 text-primary px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors active:scale-95">
                        <span className="material-symbols-outlined text-[18px]">edit_square</span>
                        Edit profile
                      </button>
                    </Link>
                  </div>
                )}
              </article>
            );
          })}

          {!hasOwnProfile && <InvitationCard />}
        </div>
      )}

      {/* Connect dialog */}
      {connect && (
        <ContactModal connect={connect} onClose={() => setConnect(null)} />
      )}
    </>
  );
}

// ── Contact-reveal dialog ──────────────────────────────────────────────────────

function ContactModal({
  connect,
  onClose,
}: {
  connect: {
    resource: LabResource;
    loading: boolean;
    data: ContactPayload | null;
    error: string | null;
  };
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl border border-outline-variant w-full max-w-md p-6 md:p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-md text-headline-md text-on-surface">Contact details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-4">
          <p className="font-headline-md text-[18px] text-on-surface">
            {str(connect.resource.fields.name) || CATEGORY_LABEL[connect.resource.category] || "Resource"}
          </p>
          {connect.data?.owner_name && (
            <p className="text-sm text-on-surface-variant">Shared by {connect.data.owner_name}</p>
          )}
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
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Route ─────────────────────────────────────────────────────────────────────

export default function ResearchersPage() {
  const { user } = useAuth();

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-gutter py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-[32px] leading-[40px] font-semibold text-on-surface mb-2">Researchers</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Find collaborators and lab resources across UAB, SPARC, and beyond
            </p>
          </div>
          <Link href={user ? "/profile/setup" : "/register"} className="shrink-0">
            <button className="bg-primary text-on-primary px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-all active:scale-95 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                {user ? "edit_square" : "person_add"}
              </span>
              {user ? "Edit your profile" : "Create your profile"}
            </button>
          </Link>
        </div>

        {/* Featured Researchers — reserved space, honestly marked not-yet-active */}
        <FeaturedResearchers />

        <ResearchersTab user={user} />
      </main>

      <Footer />
    </div>
  );
}
