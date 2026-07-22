"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Shared create/edit researcher-profile form. One flat scrolling form. Opened
// from BOTH the Researchers header and Settings; single source of truth.
//
// KEEP (unchanged plumbing): Basics, About, Research Areas, Online Presence,
// Visibility save through the existing PUT /api/profile flow (users.update +
// researcher_works delete-and-reinsert).
//
// CHANGED:
//   • Publications are now ORCID-imported (pub.orcid.org public API, no key) into
//     editable rows, replacing the old manual Publications/Tools/Datasets add-a-
//     row UI. They still persist as researcher_works rows of type 'paper' via the
//     same PUT flow, so the public profile renders them exactly as before.
//   • A new Lab Resources section (the Collaborate feature): 8 category toggles;
//     only Technique has real fields in v1 (the other 7 say "coming soon"). On
//     save, each checked category WITH data is POSTed to /api/collaborate/resources
//     as its own lab_resources row (owner from session). This is additive to — and
//     independent of — the PUT /api/profile save.
// ─────────────────────────────────────────────────────────────────────────────

// A publication row (ORCID-imported or preloaded from researcher_works type=paper).
type PublicationItem = {
  clientId: string;
  title: string;
  journal: string;
  year: string;
  url: string;
};

// A researcher_works row as returned by GET /api/profile.
type WorkRow = {
  id: string;
  type: "paper" | "tool" | "dataset";
  title: string;
  journal: string | null;
  year: number | null;
  url: string | null;
  description: string | null;
};

// The caller's own lab_resources, as returned by GET /api/profile (for prefill).
type OwnResourceRow = {
  id: string;
  category: string;
  fields: Record<string, unknown>;
  contact_info: string | null;
};

// The 8 lab-resource categories. Only 'technique' is live in v1; the rest render
// as toggles that say "coming soon" when checked (no fake fields).
const LAB_CATEGORIES: { value: string; label: string; live: boolean }[] = [
  { value: "technique", label: "Technique", live: true },
  { value: "equipment", label: "Equipment", live: false },
  { value: "vector", label: "Vector", live: false },
  { value: "animal_model", label: "Animal Model", live: false },
  { value: "cell_line", label: "Cell Line", live: false },
  { value: "protein_antibody", label: "Protein/Antibody", live: false },
  { value: "software", label: "Software", live: false },
  { value: "drug", label: "Drug", live: false },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function generateSlug(name: string, uid: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${uid.slice(0, 6)}`;
}

function makeId() {
  return `${Date.now()}-${Math.random()}`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// Shared field styles
const inputCls =
  "w-full bg-surface border border-outline-variant rounded-[10px] px-4 py-2.5 font-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors";
const rowInputCls =
  "w-full bg-surface-container-low border border-transparent rounded-lg px-3 py-2 font-label-md text-label-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors";
const labelCls = "block font-label-sm text-label-sm text-on-surface-variant mb-1.5 ml-1";
const sectionCls =
  "bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline-variant";
const sectionTitleCls =
  "font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant";
const addBtnCls =
  "flex items-center gap-2 text-primary font-label-md text-label-md hover:opacity-70 transition-opacity";

export default function ProfileSetupPage() {
  const { user, displayName, loading } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basics
  const [name, setName] = useState("");
  const [titleRole, setTitleRole] = useState("");
  const [affiliation, setAffiliation] = useState("");

  // About
  const [bio, setBio] = useState("");
  const [researchFocus, setResearchFocus] = useState("");

  // Research Areas
  const [interests, setInterests] = useState<string[]>([]);
  const [newArea, setNewArea] = useState("");

  // ORCID import + resulting editable publications (replaces manual works UI)
  const [orcidId, setOrcidId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [publications, setPublications] = useState<PublicationItem[]>([]);

  // Online presence
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scholarUrl, setScholarUrl] = useState("");
  const [orcidUrl, setOrcidUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  // Lab Resources (Collaborate)
  const [checkedCats, setCheckedCats] = useState<Set<string>>(new Set());
  const [techName, setTechName] = useState("");
  const [techPiLab, setTechPiLab] = useState("");
  const [techProtocol, setTechProtocol] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  // Signature of an already-registered technique row, so a re-save of unchanged
  // data doesn't POST a duplicate. Null when none is registered yet.
  const [savedTechSig, setSavedTechSig] = useState<string | null>(null);

  // Visibility
  const [isPublic, setIsPublic] = useState(true);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);

  // Baseline of the values AUTO-LOADED on mount (displayName default, or the row
  // read from /api/profile). ORCID import may overwrite a field that still equals
  // its baseline — that's an auto-default, NOT something the researcher manually
  // typed — but must never clobber a value the user edited this session. Set once
  // the preload resolves; a ref so it never triggers a re-render.
  const autoLoaded = useRef<{ name: string; bio: string; interests: string[]; linkedin: string }>({
    name: "",
    bio: "",
    interests: [],
    linkedin: "",
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?callbackUrl=/profile/setup");
    }
  }, [user, loading, router]);

  // Pre-populate existing profile fields + publications + lab resources.
  useEffect(() => {
    if (!user) return;

    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : { profile: null, works: [], resources: [] }))
      .then(
        (body: {
          profile: Record<string, string | string[] | boolean | null> | null;
          works: WorkRow[];
          resources: OwnResourceRow[];
        }) => {
          const data = body.profile;
          // Effective auto-loaded values (used both to seed the fields and to
          // record the import baseline).
          const effName = data ? ((data.name as string) || displayName || "") : displayName || "";
          const effBio = (data?.bio as string) || "";
          const effInterests = (data?.interests as string[] | null)?.length
            ? (data!.interests as string[])
            : [];
          const effLinkedin = (data?.linkedin_url as string) || "";

          if (!data) {
            setName(effName);
          } else {
            setName(effName);
            if (data.title) setTitleRole(data.title as string);
            if (data.affiliation) setAffiliation(data.affiliation as string);
            if (data.bio) setBio(effBio);
            if (data.research_focus) setResearchFocus(data.research_focus as string);
            if (data.linkedin_url) setLinkedinUrl(effLinkedin);
            if (data.website_url) setWebsiteUrl(data.website_url as string);
            if (data.scholar_url) setScholarUrl(data.scholar_url as string);
            if (data.orcid_url) setOrcidUrl(data.orcid_url as string);
            if (data.github_url) setGithubUrl(data.github_url as string);
            if (effInterests.length) setInterests(effInterests);
            setIsPublic((data.is_public as boolean) ?? true);
            setProfileSlug((data.profile_slug as string) ?? null);
          }

          // Record what was auto-loaded, so ORCID import can distinguish an
          // untouched auto-default from a manual edit.
          autoLoaded.current = {
            name: effName,
            bio: effBio,
            interests: effInterests,
            linkedin: effLinkedin,
          };

          // Existing publications (researcher_works type=paper) → editable rows.
          // Tool/dataset works are intentionally NOT loaded; those manual
          // categories are gone (anything tool/dataset-like now lives under Lab
          // Resources). Re-saving reconciles works to publications only.
          const papers = (body.works ?? []).filter((w) => w.type === "paper");
          if (papers.length > 0) {
            setPublications(
              papers.map((w) => ({
                clientId: w.id,
                title: w.title,
                journal: w.journal ?? "",
                year: w.year != null ? String(w.year) : "",
                url: w.url ?? "",
              })),
            );
          }

          // Prefill the Technique toggle + fields from an already-registered row.
          const tech = (body.resources ?? []).find((r) => r.category === "technique");
          if (tech) {
            setCheckedCats((prev) => new Set(prev).add("technique"));
            const n = str(tech.fields.name);
            const pi = str(tech.fields.pi_lab);
            const proto = str(tech.fields.protocol_link);
            const contact = tech.contact_info ?? "";
            setTechName(n);
            setTechPiLab(pi);
            setTechProtocol(proto);
            setContactInfo(contact);
            setSavedTechSig(techSignature(n, pi, proto, contact));
          }
        },
      )
      .catch(() => {
        setName(displayName || "");
        autoLoaded.current = { name: displayName || "", bio: "", interests: [], linkedin: "" };
      });
  }, [user, displayName]);

  if (loading || !user) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Research areas ──────────────────────────────────────────────────────────
  function addArea() {
    const v = newArea.trim();
    if (!v || interests.includes(v)) {
      setNewArea("");
      return;
    }
    setInterests((prev) => [...prev, v]);
    setNewArea("");
  }

  function removeArea(area: string) {
    setInterests((prev) => prev.filter((i) => i !== area));
  }

  // ── ORCID import ────────────────────────────────────────────────────────────
  async function importFromOrcid() {
    setImportError(null);
    setImportMsg(null);
    if (!orcidId.trim()) {
      setImportError("Paste your ORCID iD first, e.g. 0000-0002-1825-0097.");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch(`/api/orcid/works?id=${encodeURIComponent(orcidId.trim())}`);
      const body = (await res.json().catch(() => ({}))) as {
        works?: { title: string; year: number | null; url: string | null }[];
        orcid?: string;
        person?: {
          name: string | null;
          bio: string | null;
          keywords: string[];
          linkedin: string | null;
        };
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || "Could not import from ORCID.");

      const imported = (body.works ?? []).map((w) => ({
        clientId: makeId(),
        title: w.title,
        journal: "",
        year: w.year != null ? String(w.year) : "",
        url: w.url ?? "",
      }));

      // Import REPLACES the publications list (paste-ORCID-and-see-results). The
      // list stays fully editable afterwards. The server already caps this at the
      // 5 most recent.
      setPublications(imported);
      if (body.orcid && !orcidUrl.trim()) {
        setOrcidUrl(`https://orcid.org/${body.orcid}`);
      }

      // Pre-fill person-level fields NON-DESTRUCTIVELY. A field is fillable when it
      // is blank OR still equals its auto-loaded baseline (an auto-default like the
      // account displayName, or a previously-saved value the user hasn't touched
      // this session) — but never when the user manually edited it. This is the
      // fix for the earlier bug: `name` was pre-seeded with displayName, so a plain
      // `!name.trim()` check always blocked the ORCID name. Keywords are a list, so
      // they map to Research Areas (interests), not the single-line research_focus.
      const person = body.person;
      const base = autoLoaded.current;
      const fillable = (cur: string, baseVal: string) => !cur.trim() || cur === baseVal;
      const filled: string[] = [];
      if (person?.name && fillable(name, base.name)) {
        setName(person.name);
        filled.push("name");
      }
      if (person?.bio && fillable(bio, base.bio)) {
        setBio(person.bio);
        filled.push("bio");
      }
      if (
        person?.keywords?.length &&
        (interests.length === 0 || JSON.stringify(interests) === JSON.stringify(base.interests))
      ) {
        setInterests(person.keywords);
        filled.push("research areas");
      }
      if (person?.linkedin && fillable(linkedinUrl, base.linkedin)) {
        setLinkedinUrl(person.linkedin);
        filled.push("LinkedIn");
      }

      const pubMsg =
        imported.length > 0
          ? `Imported ${imported.length} recent publication${imported.length !== 1 ? "s" : ""} (most recent first).`
          : "That ORCID record has no public works to import.";
      const fieldMsg = filled.length > 0 ? ` Also pre-filled: ${filled.join(", ")}.` : "";
      setImportMsg(`${pubMsg}${fieldMsg} Edit or remove anything below.`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Could not import from ORCID.");
    } finally {
      setImporting(false);
    }
  }

  function updatePublication(clientId: string, patch: Partial<PublicationItem>) {
    setPublications((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, ...patch } : p)));
  }

  function removePublication(clientId: string) {
    setPublications((prev) => prev.filter((p) => p.clientId !== clientId));
  }

  // ── Lab Resources toggles ───────────────────────────────────────────────────
  function toggleCategory(value: string) {
    setCheckedCats((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function save(makePublic: boolean) {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      // If Technique is checked, both name and PI/lab are REQUIRED. Without this
      // guard the technique block below silently no-ops on blank fields — the
      // profile saves, the page redirects, and the user believes they registered
      // a technique that was never persisted (this is why lab_resources can end up
      // empty). Fail loudly so a registration is never silently lost.
      if (checkedCats.has("technique") && (!techName.trim() || !techPiLab.trim())) {
        setError(
          "To register a Technique, add both a technique name and a PI / lab name — or uncheck Technique under Lab Resources.",
        );
        setSaving(false);
        return;
      }

      const effectiveName = name.trim() || displayName || user.email?.split("@")[0] || "researcher";

      let slug = profileSlug;
      if (makePublic && !slug) {
        slug = generateSlug(effectiveName, user.id);
      }

      // Publications → researcher_works rows (type 'paper'). Blank-title rows drop.
      const rows = publications
        .filter((p) => p.title.trim())
        .map((p) => ({
          type: "paper",
          title: p.title.trim(),
          journal: p.journal.trim() || null,
          year: p.year ? parseInt(p.year, 10) : null,
          url: p.url.trim() || null,
          description: null,
        }));

      // 1) Existing profile + works save (unchanged PUT flow).
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            name: effectiveName,
            title: titleRole || null,
            affiliation: affiliation || null,
            bio: bio || null,
            research_focus: researchFocus || null,
            linkedin_url: linkedinUrl || null,
            website_url: websiteUrl || null,
            scholar_url: scholarUrl || null,
            orcid_url: orcidUrl || null,
            github_url: githubUrl || null,
            interests,
            is_public: makePublic,
            profile_slug: slug,
          },
          works: rows,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to save profile. Please try again.");
      }

      // 2) Lab Resources: POST each checked category that has real data. v1 has
      // real fields only for Technique. A row is created only when the data is new
      // or changed vs an already-registered technique (so re-saving an unchanged
      // profile never duplicates it).
      if (checkedCats.has("technique") && techName.trim() && techPiLab.trim()) {
        const sig = techSignature(techName, techPiLab, techProtocol, contactInfo);
        if (sig !== savedTechSig) {
          const rRes = await fetch("/api/collaborate/resources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: "technique",
              fields: {
                name: techName.trim(),
                pi_lab: techPiLab.trim(),
                protocol_link: techProtocol.trim() || null,
              },
              contact_info: contactInfo.trim() || null,
            }),
          });
          if (!rRes.ok) {
            const body = (await rRes.json().catch(() => ({}))) as { error?: string };
            throw new Error(
              body.error || "Your profile saved, but the technique could not be registered.",
            );
          }
          setSavedTechSig(sig);
        }
      }

      setIsPublic(makePublic);
      setProfileSlug(slug);

      if (makePublic && slug) {
        router.push(`/researchers/${slug}`);
      } else {
        router.push("/researchers");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
      setSaving(false);
    }
  }

  const anyCategoryChecked = checkedCats.size > 0;

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <Nav />
      <main className="flex-grow px-margin-mobile md:px-margin-desktop py-xl">
        <div className="max-w-[760px] mx-auto">

          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-primary mb-2">
                Edit your researcher profile
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                This information appears on your public profile in the Researchers directory.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {profileSlug && (
                <Link
                  href={`/researchers/${profileSlug}`}
                  className="font-label-md text-label-md text-primary hover:underline underline-offset-4"
                >
                  View public profile
                </Link>
              )}
              <button
                type="button"
                onClick={() => save(isPublic)}
                disabled={saving}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </header>

          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>

            {/* ── ORCID import ───────────────────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-2`}>Import from ORCID</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                Paste your ORCID iD to pull your 5 most recent publications, plus your name, bio,
                research areas, and LinkedIn from your public record — no login or key needed.
                Blank fields are filled in for you (anything you&apos;ve already typed is kept);
                edit or remove anything afterward.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={orcidId}
                  onChange={(e) => setOrcidId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      importFromOrcid();
                    }
                  }}
                  className={inputCls}
                  placeholder="e.g. 0000-0002-1825-0097"
                />
                <button
                  type="button"
                  onClick={importFromOrcid}
                  disabled={importing}
                  className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
                >
                  {importing && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {importing ? "Importing…" : "Import"}
                </button>
              </div>
              {importMsg && (
                <p className="mt-3 text-sm text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {importMsg}
                </p>
              )}
              {importError && (
                <p className="mt-3 text-sm text-error flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {importError}
                </p>
              )}
            </section>

            {/* ── Basics ─────────────────────────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-6`}>Basics</h2>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-28 h-28 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-3xl shrink-0">
                  {getInitials(name || displayName || "?")}
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <label className={labelCls}>Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Dr. Sarah Chen"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Title / Role</label>
                      <input
                        type="text"
                        value={titleRole}
                        onChange={(e) => setTitleRole(e.target.value)}
                        className={inputCls}
                        placeholder="e.g. Senior Computational Biologist"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Institution</label>
                      <input
                        type="text"
                        value={affiliation}
                        onChange={(e) => setAffiliation(e.target.value)}
                        className={inputCls}
                        placeholder="e.g. University of Alabama at Birmingham"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── About ──────────────────────────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-4`}>About</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Short bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className={`${inputCls} resize-none`}
                    placeholder="Briefly describe your research focus and scientific background..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Primary research focus</label>
                  <input
                    type="text"
                    value={researchFocus}
                    onChange={(e) => setResearchFocus(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Molecular Pharmacology, Neurobiology"
                  />
                </div>
              </div>
            </section>

            {/* ── Research Areas ─────────────────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-4`}>Research Areas</h2>
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {interests.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1.5 bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full font-label-md text-label-md border border-primary-fixed-dim"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeArea(area)}
                        className="flex items-center hover:text-error transition-colors"
                        aria-label={`Remove ${area}`}
                      >
                        <span className="material-symbols-outlined !text-lg">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addArea();
                    }
                  }}
                  className={`${inputCls} max-w-xs`}
                  placeholder="e.g. Medicinal Chemistry"
                />
                <button type="button" onClick={addArea} className={addBtnCls}>
                  <span className="material-symbols-outlined">add_circle</span> Add area
                </button>
              </div>
            </section>

            {/* ── Publications (ORCID-sourced, editable) ─────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-2`}>Publications</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                Imported from ORCID above. Edit titles/years/links or remove entries you don&apos;t
                want on your public profile.
              </p>
              {publications.length > 0 ? (
                <div className="space-y-4">
                  {publications.map((p) => (
                    <div
                      key={p.clientId}
                      className="grid grid-cols-12 gap-3 items-end p-4 bg-surface rounded-lg border border-outline-variant/60"
                    >
                      <div className="col-span-12 md:col-span-5">
                        <label className={labelCls}>Title</label>
                        <input
                          type="text"
                          value={p.title}
                          onChange={(e) => updatePublication(p.clientId, { title: e.target.value })}
                          className={rowInputCls}
                          placeholder="Paper title"
                        />
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <label className={labelCls}>Journal</label>
                        <input
                          type="text"
                          value={p.journal}
                          onChange={(e) => updatePublication(p.clientId, { journal: e.target.value })}
                          className={rowInputCls}
                          placeholder="e.g. Nature"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <label className={labelCls}>Year</label>
                        <input
                          type="number"
                          value={p.year}
                          onChange={(e) => updatePublication(p.clientId, { year: e.target.value })}
                          className={rowInputCls}
                          placeholder="2024"
                        />
                      </div>
                      <div className="col-span-11 md:col-span-1">
                        <label className={labelCls}>URL</label>
                        <input
                          type="url"
                          value={p.url}
                          onChange={(e) => updatePublication(p.clientId, { url: e.target.value })}
                          className={rowInputCls}
                          placeholder="doi.org/…"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center pb-1.5">
                        <button
                          type="button"
                          onClick={() => removePublication(p.clientId)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          aria-label="Remove publication"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-on-surface-variant italic text-sm">
                  No publications yet — import your ORCID record above to populate this list.
                </p>
              )}
            </section>

            {/* ── Lab Resources (Collaborate) ────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-2`}>Lab Resources</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                Offer resources your lab can share for collaboration. Check the categories that
                apply — you likely only have one or two. Only <span className="font-bold">Technique</span>{" "}
                is live in v1; the rest are coming soon.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {LAB_CATEGORIES.map((c) => {
                  const checked = checkedCats.has(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleCategory(c.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${
                        checked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-outline-variant bg-surface text-on-surface hover:border-primary/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {checked ? "check_box" : "check_box_outline_blank"}
                      </span>
                      <span className="min-w-0 truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Technique — the only category with real fields in v1 */}
              {checkedCats.has("technique") && (
                <div className="p-4 bg-surface rounded-lg border border-outline-variant/60 mb-4 space-y-4">
                  <p className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">biotech</span>
                    Technique details
                  </p>
                  <div>
                    <label className={labelCls}>Technique name</label>
                    <input
                      type="text"
                      value={techName}
                      onChange={(e) => setTechName(e.target.value)}
                      className={rowInputCls}
                      placeholder="e.g. Patient-derived organoid culture"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>PI / lab name</label>
                      <input
                        type="text"
                        value={techPiLab}
                        onChange={(e) => setTechPiLab(e.target.value)}
                        className={rowInputCls}
                        placeholder="e.g. Nakano Lab, UAB Neuro-oncology"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Protocol / SOP link (optional)</label>
                      <input
                        type="url"
                        value={techProtocol}
                        onChange={(e) => setTechProtocol(e.target.value)}
                        className={rowInputCls}
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Other 7 categories — honest "coming soon", no fake fields */}
              {LAB_CATEGORIES.filter((c) => !c.live && checkedCats.has(c.value)).map((c) => (
                <div
                  key={c.value}
                  className="p-4 bg-surface-container rounded-lg border border-outline-variant/60 mb-4 flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-on-surface-variant">
                    hourglass_empty
                  </span>
                  <p className="text-sm text-on-surface-variant">
                    <span className="font-bold text-on-surface">{c.label}</span> registration is
                    coming soon — this category doesn&apos;t have fields yet, so nothing will be saved
                    for it.
                  </p>
                </div>
              ))}

              {/* Shared contact — used across whichever categories are checked */}
              {anyCategoryChecked && (
                <div className="pt-2">
                  <label className={labelCls}>How should people reach you about this?</label>
                  <textarea
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none`}
                    placeholder="e.g. Email jdoe@uab.edu, or ping the lab Slack #neuro-onc"
                  />
                  <p className="text-xs text-on-surface-variant mt-1.5 ml-1">
                    Shown to signed-in members who click Connect on your resource. This is{" "}
                    <span className="font-bold">not</span> auto-filled from your account email —
                    enter exactly what you want people to use.
                  </p>
                </div>
              )}
            </section>

            {/* ── Online Presence ────────────────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-6`}>Online Presence</h2>
              <div className="space-y-4">
                <LinkField
                  icon="language"
                  placeholder="Personal / lab website URL"
                  value={websiteUrl}
                  onChange={setWebsiteUrl}
                />
                <LinkField
                  icon="share"
                  placeholder="LinkedIn profile URL"
                  value={linkedinUrl}
                  onChange={setLinkedinUrl}
                />
                <LinkField
                  icon="school"
                  placeholder="Google Scholar URL"
                  value={scholarUrl}
                  onChange={setScholarUrl}
                />
                <LinkField
                  icon="id_card"
                  placeholder="ORCID iD URL"
                  value={orcidUrl}
                  onChange={setOrcidUrl}
                />
                <LinkField
                  icon="code"
                  placeholder="GitHub profile URL"
                  value={githubUrl}
                  onChange={setGithubUrl}
                />
              </div>
            </section>

            {/* ── Visibility ─────────────────────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-4`}>Visibility</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label-md text-label-md text-on-surface">
                    Public researcher profile
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Allow other SDD Navigator members to find you in the Researchers directory.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
              </div>
            </section>

            {error && (
              <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* ── Bottom actions ─────────────────────────────────────────── */}
            <div className="pt-6 border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-6">
              <button
                type="button"
                onClick={() => save(false)}
                disabled={saving}
                className="text-error font-label-md text-label-md flex items-center gap-2 px-4 py-2 rounded-lg border border-transparent hover:border-error hover:bg-error-container/20 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined">person_off</span> Remove from directory
              </button>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 md:flex-none text-on-surface-variant font-label-md text-label-md px-6 py-2.5 rounded-xl hover:bg-surface-container-high transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => save(isPublic)}
                  disabled={saving}
                  className="flex-1 md:flex-none bg-primary text-on-primary font-label-md text-label-md px-10 py-2.5 rounded-xl hover:bg-primary-container transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Stable signature of a technique's data, for dedup on re-save.
function techSignature(name: string, piLab: string, protocol: string, contact: string): string {
  return [name.trim(), piLab.trim(), protocol.trim(), contact.trim()].join("||");
}

function LinkField({
  icon,
  placeholder,
  value,
  onChange,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center border border-outline-variant text-on-surface-variant shrink-0">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-surface border border-outline-variant rounded-[10px] px-4 py-2 font-label-md text-label-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
        placeholder={placeholder}
      />
    </div>
  );
}
