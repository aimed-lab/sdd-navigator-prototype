"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Single shared create/edit researcher-profile form (design:
// /design/researcher-profile-editor.html). One flat scrolling form — NOT a
// wizard. Opened from BOTH the Researchers header and Settings; single source
// of truth. Data plumbing is intentionally FROZEN: preload existing `users` +
// `researcher_works` on mount, and save = update `users` + delete-and-reinsert
// `researcher_works`. Only the UI layer + the new fields changed.
//
// PENDING COLUMNS: Title/Role, Google Scholar, ORCID, and GitHub have no
// columns on `users` yet. Their inputs are wired below but deliberately kept
// OUT of the preload select and the update payload — selecting/writing a
// missing column makes PostgREST fail the whole request and would break save.
// Once the SQL in the handoff notes is applied, enable them at the two spots
// marked `TODO(after SQL)`.
// ─────────────────────────────────────────────────────────────────────────────

type WorkItem = {
  clientId: string;
  type: "paper" | "tool" | "dataset";
  title: string;
  journal: string;
  year: string;
  url: string;
  description: string;
};

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

  // Basics (name + affiliation persist; titleRole is PENDING a column)
  const [name, setName] = useState("");
  const [titleRole, setTitleRole] = useState(""); // PENDING column — not persisted yet
  const [affiliation, setAffiliation] = useState("");

  // About
  const [bio, setBio] = useState("");
  const [researchFocus, setResearchFocus] = useState("");

  // Research Areas
  const [interests, setInterests] = useState<string[]>([]);
  const [newArea, setNewArea] = useState("");

  // Work (papers / tools / datasets) — editable repeatable rows
  const [works, setWorks] = useState<WorkItem[]>([]);

  // Online presence (linkedin + website persist; scholar/orcid/github PENDING columns)
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [scholarUrl, setScholarUrl] = useState(""); // PENDING column
  const [orcidUrl, setOrcidUrl] = useState(""); // PENDING column
  const [githubUrl, setGithubUrl] = useState(""); // PENDING column

  // Visibility
  const [isPublic, setIsPublic] = useState(true);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?callbackUrl=/profile/setup");
    }
  }, [user, loading, router]);

  // Pre-populate existing profile fields (create AND edit share this form).
  useEffect(() => {
    if (!user) return;

    // NOTE: pending columns (title, scholar_url, orcid_url, github_url) are
    // intentionally excluded — selecting a missing column fails the request.
    // TODO(after SQL): add `, title, scholar_url, orcid_url, github_url` here.
    supabase
      .from("users")
      .select("name, affiliation, bio, research_focus, linkedin_url, website_url, interests, is_public, profile_slug")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setName(displayName || "");
          return;
        }
        setName(data.name || displayName || "");
        if (data.affiliation) setAffiliation(data.affiliation);
        if (data.bio) setBio(data.bio);
        if (data.research_focus) setResearchFocus(data.research_focus);
        if (data.linkedin_url) setLinkedinUrl(data.linkedin_url);
        if (data.website_url) setWebsiteUrl(data.website_url);
        if (data.interests?.length) setInterests(data.interests);
        // is_public is NOT NULL in the DB, so this only falls back to the
        // current default (true) when the row itself has no value for it.
        setIsPublic(data.is_public ?? true);
        setProfileSlug(data.profile_slug ?? null);
        // TODO(after SQL): setTitleRole(data.title ?? ""); setScholarUrl(...);
        // setOrcidUrl(...); setGithubUrl(...);
      });

    // Pre-populate previously published works so editing/removing them on
    // re-save actually reconciles against what's already saved, instead of
    // starting from an empty list and only ever appending.
    supabase
      .from("researcher_works")
      .select("id, type, title, journal, year, url, description")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setWorks(
          data.map((w) => ({
            clientId: w.id,
            type: w.type,
            title: w.title,
            journal: w.journal ?? "",
            year: w.year != null ? String(w.year) : "",
            url: w.url ?? "",
            description: w.description ?? "",
          }))
        );
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

  // ── Repeatable work rows ────────────────────────────────────────────────────
  function addWork(type: WorkItem["type"]) {
    setWorks((prev) => [
      ...prev,
      { clientId: makeId(), type, title: "", journal: "", year: "", url: "", description: "" },
    ]);
  }

  function updateWork(clientId: string, patch: Partial<WorkItem>) {
    setWorks((prev) => prev.map((w) => (w.clientId === clientId ? { ...w, ...patch } : w)));
  }

  function removeWork(clientId: string) {
    setWorks((prev) => prev.filter((w) => w.clientId !== clientId));
  }

  // ── Save (frozen plumbing: update users + delete-and-reinsert works) ────────
  async function save(makePublic: boolean) {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const effectiveName = name.trim() || displayName || user.email?.split("@")[0] || "researcher";

      // Slug preservation: keep an existing slug verbatim so editing the name
      // never breaks a live profile URL. Only mint a slug on first publish
      // when none exists yet.
      let slug = profileSlug;
      if (makePublic && !slug) {
        slug = generateSlug(effectiveName, user.id);
      }

      const { error: updateErr } = await supabase
        .from("users")
        .update({
          name: effectiveName,
          affiliation: affiliation || null,
          bio: bio || null,
          research_focus: researchFocus || null,
          linkedin_url: linkedinUrl || null,
          website_url: websiteUrl || null,
          interests,
          is_public: makePublic,
          profile_slug: slug,
          // TODO(after SQL): title: titleRole || null, scholar_url: scholarUrl || null,
          // orcid_url: orcidUrl || null, github_url: githubUrl || null,
        })
        .eq("id", user.id);

      if (updateErr) throw new Error(updateErr.message);

      setIsPublic(makePublic);
      setProfileSlug(slug);

      // Reconcile researcher_works against the current `works` state: delete
      // this user's existing rows, then reinsert the current set. Blank rows
      // (no title) are dropped so empty repeatable rows never persist.
      const savableWorks = works.filter((w) => w.title.trim());

      const { error: deleteErr } = await supabase
        .from("researcher_works")
        .delete()
        .eq("user_id", user.id);
      if (deleteErr) throw new Error(deleteErr.message);

      if (savableWorks.length > 0) {
        const rows = savableWorks.map((w) => ({
          user_id: user.id,
          type: w.type,
          title: w.title,
          journal: w.journal || null,
          year: w.year ? parseInt(w.year, 10) : null,
          url: w.url || null,
          description: w.description || null,
        }));
        const { error: worksErr } = await supabase.from("researcher_works").insert(rows);
        if (worksErr) throw new Error(worksErr.message);
      }

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

  const papers = works.filter((w) => w.type === "paper");
  const tools = works.filter((w) => w.type === "tool");
  const datasets = works.filter((w) => w.type === "dataset");

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
                      <label className={labelCls}>Affiliation</label>
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

            {/* ── Publications ───────────────────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-6`}>Publications</h2>
              {papers.length > 0 && (
                <div className="space-y-4 mb-6">
                  {papers.map((w) => (
                    <div
                      key={w.clientId}
                      className="grid grid-cols-12 gap-3 items-end p-4 bg-surface rounded-lg border border-outline-variant/60"
                    >
                      <div className="col-span-12 md:col-span-5">
                        <label className={labelCls}>Title</label>
                        <input
                          type="text"
                          value={w.title}
                          onChange={(e) => updateWork(w.clientId, { title: e.target.value })}
                          className={rowInputCls}
                          placeholder="Paper title"
                        />
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <label className={labelCls}>Journal</label>
                        <input
                          type="text"
                          value={w.journal}
                          onChange={(e) => updateWork(w.clientId, { journal: e.target.value })}
                          className={rowInputCls}
                          placeholder="e.g. Nature"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <label className={labelCls}>Year</label>
                        <input
                          type="number"
                          value={w.year}
                          onChange={(e) => updateWork(w.clientId, { year: e.target.value })}
                          className={rowInputCls}
                          placeholder="2024"
                        />
                      </div>
                      <div className="col-span-11 md:col-span-1">
                        <label className={labelCls}>URL</label>
                        <input
                          type="url"
                          value={w.url}
                          onChange={(e) => updateWork(w.clientId, { url: e.target.value })}
                          className={rowInputCls}
                          placeholder="doi.org/…"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center pb-1.5">
                        <button
                          type="button"
                          onClick={() => removeWork(w.clientId)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          aria-label="Remove publication"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => addWork("paper")} className={addBtnCls}>
                <span className="material-symbols-outlined">add_circle</span> Add publication
              </button>
            </section>

            {/* ── Tools & Software ───────────────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-6`}>Tools &amp; Software</h2>
              {tools.length > 0 && (
                <div className="space-y-4 mb-6">
                  {tools.map((w) => (
                    <div
                      key={w.clientId}
                      className="grid grid-cols-12 gap-3 items-end p-4 bg-surface rounded-lg border border-outline-variant/60"
                    >
                      <div className="col-span-12 md:col-span-3">
                        <label className={labelCls}>Tool name</label>
                        <input
                          type="text"
                          value={w.title}
                          onChange={(e) => updateWork(w.clientId, { title: e.target.value })}
                          className={rowInputCls}
                          placeholder="e.g. PyRigid-ML"
                        />
                      </div>
                      <div className="col-span-12 md:col-span-5">
                        <label className={labelCls}>Short description</label>
                        <input
                          type="text"
                          value={w.description}
                          onChange={(e) => updateWork(w.clientId, { description: e.target.value })}
                          className={rowInputCls}
                          placeholder="What it does"
                        />
                      </div>
                      <div className="col-span-11 md:col-span-3">
                        <label className={labelCls}>URL</label>
                        <input
                          type="url"
                          value={w.url}
                          onChange={(e) => updateWork(w.clientId, { url: e.target.value })}
                          className={rowInputCls}
                          placeholder="github.com/…"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center pb-1.5">
                        <button
                          type="button"
                          onClick={() => removeWork(w.clientId)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          aria-label="Remove tool"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => addWork("tool")} className={addBtnCls}>
                <span className="material-symbols-outlined">add_circle</span> Add tool
              </button>
            </section>

            {/* ── Datasets ───────────────────────────────────────────────── */}
            <section className={sectionCls}>
              <h2 className={`${sectionTitleCls} mb-6`}>Datasets</h2>
              {datasets.length > 0 && (
                <div className="space-y-4 mb-6">
                  {datasets.map((w) => (
                    <div
                      key={w.clientId}
                      className="grid grid-cols-12 gap-3 items-end p-4 bg-surface rounded-lg border border-outline-variant/60"
                    >
                      <div className="col-span-12 md:col-span-6">
                        <label className={labelCls}>Dataset name</label>
                        <input
                          type="text"
                          value={w.title}
                          onChange={(e) => updateWork(w.clientId, { title: e.target.value })}
                          className={rowInputCls}
                          placeholder="e.g. UAB Compound Screening Set"
                        />
                      </div>
                      <div className="col-span-11 md:col-span-5">
                        <label className={labelCls}>URL</label>
                        <input
                          type="url"
                          value={w.url}
                          onChange={(e) => updateWork(w.clientId, { url: e.target.value })}
                          className={rowInputCls}
                          placeholder="Repository link"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center pb-1.5">
                        <button
                          type="button"
                          onClick={() => removeWork(w.clientId)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          aria-label="Remove dataset"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => addWork("dataset")} className={addBtnCls}>
                <span className="material-symbols-outlined">add_circle</span> Add dataset
              </button>
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
              <p className="mt-3 text-[11px] text-on-surface-variant">
                Google Scholar, ORCID, and GitHub are not saved yet — they persist once the new
                columns are added to the database.
              </p>
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
