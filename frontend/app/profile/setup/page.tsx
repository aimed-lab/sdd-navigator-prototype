"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const INTEREST_OPTIONS = [
  "Antibody-Drug Conjugates",
  "GLP-1 Receptor Agonists",
  "ADMET Profiling",
  "Pharmacokinetics",
  "CRISPR/Cas9",
  "Medicinal Chemistry",
  "In Silico Modeling",
  "Toxicology",
  "Proteomics",
  "Genomics",
  "Bioinformatics",
  "Molecular Biology",
  "Drug Delivery Systems",
  "Clinical Trials",
  "Biomarkers",
  "AI/ML in Drug Discovery",
  "Oncology",
  "Structural Biology",
  "Target Identification",
  "Lead Optimization",
  "Precision Medicine",
];

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

const STEP_TITLES = ["Basic Info", "Research Interests", "Your Work", "Preview & Publish"];
const STEP_CAPTIONS = ["Basics", "Interests", "Work", "Visibility"];

const fieldCls =
  "w-full rounded-lg border border-outline-variant bg-surface-container p-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all";

export default function ProfileSetupPage() {
  const { user, displayName, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [bio, setBio] = useState("");
  const [researchFocus, setResearchFocus] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Step 2
  const [interests, setInterests] = useState<string[]>([]);

  // Step 3 — accumulated works
  const [works, setWorks] = useState<WorkItem[]>([]);

  // Paper mini-form
  const [showPaper, setShowPaper] = useState(false);
  const [paperTitle, setPaperTitle] = useState("");
  const [paperJournal, setPaperJournal] = useState("");
  const [paperYear, setPaperYear] = useState("");
  const [paperUrl, setPaperUrl] = useState("");

  // Tool mini-form
  const [showTool, setShowTool] = useState(false);
  const [toolTitle, setToolTitle] = useState("");
  const [toolDesc, setToolDesc] = useState("");
  const [toolUrl, setToolUrl] = useState("");

  // Dataset mini-form
  const [showDataset, setShowDataset] = useState(false);
  const [datasetTitle, setDatasetTitle] = useState("");
  const [datasetUrl, setDatasetUrl] = useState("");

  // Step 4
  const [isPublic, setIsPublic] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?callbackUrl=/profile/setup");
    }
  }, [user, loading, router]);

  // Pre-populate existing profile fields
  useEffect(() => {
    if (!user) return;

    supabase
      .from("users")
      .select("bio, research_focus, linkedin_url, website_url, interests, is_public")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.bio) setBio(data.bio);
        if (data.research_focus) setResearchFocus(data.research_focus);
        if (data.linkedin_url) setLinkedinUrl(data.linkedin_url);
        if (data.website_url) setWebsiteUrl(data.website_url);
        if (data.interests?.length) setInterests(data.interests);
        // is_public is NOT NULL in the DB, so this only falls back to the
        // current default (true) when the row itself has no value for it.
        setIsPublic(data.is_public ?? true);
      });

    // Pre-populate previously published works so editing/removing them on
    // re-publish actually reconciles against what's already saved, instead
    // of starting from an empty list and only ever appending.
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
  }, [user]);

  if (loading || !user) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const progress = (step / 4) * 100;

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  }

  function makeId() {
    return `${Date.now()}-${Math.random()}`;
  }

  function addPaper() {
    if (!paperTitle.trim()) return;
    setWorks((prev) => [
      ...prev,
      {
        clientId: makeId(),
        type: "paper",
        title: paperTitle,
        journal: paperJournal,
        year: paperYear,
        url: paperUrl,
        description: "",
      },
    ]);
    setPaperTitle("");
    setPaperJournal("");
    setPaperYear("");
    setPaperUrl("");
    setShowPaper(false);
  }

  function addTool() {
    if (!toolTitle.trim()) return;
    setWorks((prev) => [
      ...prev,
      {
        clientId: makeId(),
        type: "tool",
        title: toolTitle,
        journal: "",
        year: "",
        url: toolUrl,
        description: toolDesc,
      },
    ]);
    setToolTitle("");
    setToolDesc("");
    setToolUrl("");
    setShowTool(false);
  }

  function addDataset() {
    if (!datasetTitle.trim()) return;
    setWorks((prev) => [
      ...prev,
      {
        clientId: makeId(),
        type: "dataset",
        title: datasetTitle,
        journal: "",
        year: "",
        url: datasetUrl,
        description: "",
      },
    ]);
    setDatasetTitle("");
    setDatasetUrl("");
    setShowDataset(false);
  }

  function removeWork(clientId: string) {
    setWorks((prev) => prev.filter((w) => w.clientId !== clientId));
  }

  async function handlePublish() {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const name = displayName || user.email?.split("@")[0] || "researcher";
      const profileSlug = isPublic ? generateSlug(name, user.id) : null;

      const { error: updateErr } = await supabase
        .from("users")
        .update({
          bio: bio || null,
          research_focus: researchFocus || null,
          linkedin_url: linkedinUrl || null,
          website_url: websiteUrl || null,
          interests,
          is_public: isPublic,
          profile_slug: profileSlug,
        })
        .eq("id", user.id);

      if (updateErr) throw new Error(updateErr.message);

      // Reconcile researcher_works against the current `works` state instead
      // of blindly appending: delete this user's existing rows, then
      // reinsert the current set. This makes edits/removals take effect and
      // prevents duplicate rows from accumulating on repeat publishes.
      const { error: deleteErr } = await supabase
        .from("researcher_works")
        .delete()
        .eq("user_id", user.id);
      if (deleteErr) throw new Error(deleteErr.message);

      if (works.length > 0) {
        const rows = works.map((w) => ({
          user_id: user.id,
          type: w.type,
          title: w.title,
          journal: w.journal || null,
          year: w.year ? parseInt(w.year, 10) : null,
          url: w.url || null,
          description: w.description || null,
        }));
        const { error: worksErr } = await supabase
          .from("researcher_works")
          .insert(rows);
        if (worksErr) throw new Error(worksErr.message);
      }

      if (isPublic && profileSlug) {
        router.push(`/researchers/${profileSlug}`);
      } else {
        router.push("/knowledge-hub");
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
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      <main className="flex-grow flex flex-col items-center px-gutter py-xl">
        <div className="w-full max-w-[720px]">

          {/* Header */}
          <header className="mb-xl text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
              Complete your profile
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Help fellow researchers find and collaborate with you on the SDD Navigator.
            </p>
          </header>

          {/* Step indicator */}
          <nav className="mb-16 px-2">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-surface-container-highest -translate-y-1/2 z-0 rounded-full" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 rounded-full transition-all duration-500"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
              {STEP_CAPTIONS.map((caption, i) => {
                const stepNum = i + 1;
                const isDone = stepNum < step;
                const isActive = stepNum === step;
                return (
                  <div key={caption} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-label-sm text-label-sm transition-colors ${
                        isDone || isActive
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-highest text-on-surface-variant"
                      }`}
                    >
                      {isDone ? (
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-7 whitespace-nowrap font-label-sm text-label-sm ${
                        isDone || isActive ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {caption}
                    </span>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Main wizard card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-lg">
              <h2 className="font-headline-md text-headline-md text-primary mb-md">
                Step {step} of 4: {STEP_TITLES[step - 1]}
              </h2>

              {/* ── Step 1: Basic Info ───────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-md">
                  <div className="space-y-sm">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">
                      Professional Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className={`${fieldCls} min-h-[120px] resize-none`}
                      placeholder="Briefly describe your academic background and current research aims..."
                    />
                  </div>

                  <div className="space-y-sm">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">
                      Primary Research Focus
                    </label>
                    <input
                      type="text"
                      value={researchFocus}
                      onChange={(e) => setResearchFocus(e.target.value)}
                      className={fieldCls}
                      placeholder="e.g. Molecular Pharmacology, Neurobiology"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                    <div className="space-y-sm">
                      <label className="block font-label-sm text-label-sm text-on-surface-variant">
                        LinkedIn URL
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                          link
                        </span>
                        <input
                          type="url"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          className={`${fieldCls} pl-10`}
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>
                    </div>
                    <div className="space-y-sm">
                      <label className="block font-label-sm text-label-sm text-on-surface-variant">
                        Lab Website URL
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                          language
                        </span>
                        <input
                          type="url"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className={`${fieldCls} pl-10`}
                          placeholder="https://labname.edu"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Research Interests ───────────────────────── */}
              {step === 2 && (
                <div className="space-y-md">
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Select tags that best represent your expertise areas to help others find your
                    work.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((interest) => {
                      const selected = interests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`px-4 py-2 rounded-full border font-label-sm text-label-sm flex items-center gap-2 transition-colors ${
                            selected
                              ? "border-primary text-primary bg-primary/10"
                              : "border-outline-variant text-on-surface-variant hover:border-primary"
                          }`}
                        >
                          {interest}
                          {selected && (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 3: Your Work ────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-lg">

                  {/* Papers */}
                  <div className="space-y-sm">
                    <h3 className="font-headline-md text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">article</span> Papers
                    </h3>
                    {papers.map((w) => (
                      <WorkRow key={w.clientId} work={w} onRemove={removeWork} />
                    ))}
                    {showPaper ? (
                      <div className="p-md bg-surface-container rounded-lg border border-outline-variant space-y-sm">
                        <input
                          type="text"
                          value={paperTitle}
                          onChange={(e) => setPaperTitle(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface p-sm focus:border-primary outline-none"
                          placeholder="Paper Title"
                        />
                        <div className="grid grid-cols-2 gap-sm">
                          <input
                            type="text"
                            value={paperJournal}
                            onChange={(e) => setPaperJournal(e.target.value)}
                            className="w-full rounded-lg border border-outline-variant bg-surface p-sm focus:border-primary outline-none"
                            placeholder="Journal Name"
                          />
                          <input
                            type="number"
                            value={paperYear}
                            onChange={(e) => setPaperYear(e.target.value)}
                            className="w-full rounded-lg border border-outline-variant bg-surface p-sm focus:border-primary outline-none"
                            placeholder="Year"
                          />
                        </div>
                        <input
                          type="url"
                          value={paperUrl}
                          onChange={(e) => setPaperUrl(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface p-sm focus:border-primary outline-none"
                          placeholder="Publication URL"
                        />
                        <div className="flex gap-sm">
                          <button
                            type="button"
                            onClick={addPaper}
                            className="flex-1 bg-primary text-on-primary p-sm rounded-lg font-label-sm text-label-sm"
                          >
                            Save Paper
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPaper(false)}
                            className="px-md rounded-lg border border-outline-variant font-label-sm text-label-sm text-on-surface-variant"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPaper(true)}
                        className="w-full border-2 border-dashed border-outline-variant py-3 rounded-lg text-on-surface-variant font-label-sm text-label-sm flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined">add_circle</span> Add Paper
                      </button>
                    )}
                  </div>

                  {/* Tools */}
                  <div className="space-y-sm border-t border-outline-variant pt-md">
                    <h3 className="font-headline-md text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">build</span> Tools
                    </h3>
                    {tools.map((w) => (
                      <WorkRow key={w.clientId} work={w} onRemove={removeWork} />
                    ))}
                    {showTool ? (
                      <div className="p-md bg-surface-container rounded-lg border border-outline-variant space-y-sm">
                        <input
                          type="text"
                          value={toolTitle}
                          onChange={(e) => setToolTitle(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface p-sm focus:border-primary outline-none"
                          placeholder="Tool Name"
                        />
                        <textarea
                          value={toolDesc}
                          onChange={(e) => setToolDesc(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface p-sm focus:border-primary outline-none resize-none"
                          placeholder="Description"
                          rows={2}
                        />
                        <input
                          type="url"
                          value={toolUrl}
                          onChange={(e) => setToolUrl(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface p-sm focus:border-primary outline-none"
                          placeholder="Repository / Website URL"
                        />
                        <div className="flex gap-sm">
                          <button
                            type="button"
                            onClick={addTool}
                            className="flex-1 bg-primary text-on-primary p-sm rounded-lg font-label-sm text-label-sm"
                          >
                            Save Tool
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowTool(false)}
                            className="px-md rounded-lg border border-outline-variant font-label-sm text-label-sm text-on-surface-variant"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowTool(true)}
                        className="w-full border-2 border-dashed border-outline-variant py-3 rounded-lg text-on-surface-variant font-label-sm text-label-sm flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined">add_circle</span> Add Tool
                      </button>
                    )}
                  </div>

                  {/* Datasets */}
                  <div className="space-y-sm border-t border-outline-variant pt-md">
                    <h3 className="font-headline-md text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">database</span> Datasets
                    </h3>
                    {datasets.map((w) => (
                      <WorkRow key={w.clientId} work={w} onRemove={removeWork} />
                    ))}
                    {showDataset ? (
                      <div className="p-md bg-surface-container rounded-lg border border-outline-variant space-y-sm">
                        <input
                          type="text"
                          value={datasetTitle}
                          onChange={(e) => setDatasetTitle(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface p-sm focus:border-primary outline-none"
                          placeholder="Dataset Name"
                        />
                        <input
                          type="url"
                          value={datasetUrl}
                          onChange={(e) => setDatasetUrl(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface p-sm focus:border-primary outline-none"
                          placeholder="Repository Link"
                        />
                        <div className="flex gap-sm">
                          <button
                            type="button"
                            onClick={addDataset}
                            className="flex-1 bg-primary text-on-primary p-sm rounded-lg font-label-sm text-label-sm"
                          >
                            Save Dataset
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDataset(false)}
                            className="px-md rounded-lg border border-outline-variant font-label-sm text-label-sm text-on-surface-variant"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDataset(true)}
                        className="w-full border-2 border-dashed border-outline-variant py-3 rounded-lg text-on-surface-variant font-label-sm text-label-sm flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined">add_circle</span> Add Dataset
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 4: Preview & Publish ────────────────────────── */}
              {step === 4 && (
                <div className="space-y-lg">
                  {/* Profile preview card */}
                  <div className="bg-surface-container rounded-xl border border-outline-variant p-lg">
                    <div className="flex items-center gap-md mb-md">
                      <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-2xl shrink-0">
                        {getInitials(displayName || "?")}
                      </div>
                      <div>
                        <h2 className="font-headline-md text-headline-md text-primary">
                          {displayName}
                        </h2>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          {researchFocus || "Researcher"}
                        </p>
                      </div>
                    </div>
                    {bio && (
                      <p className="font-body-md text-body-md text-on-surface-variant italic mb-md line-clamp-3">
                        &ldquo;{bio}&rdquo;
                      </p>
                    )}
                    {interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {interests.slice(0, 5).map((i) => (
                          <span
                            key={i}
                            className="px-3 py-0.5 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-semibold uppercase tracking-wider"
                          >
                            {i}
                          </span>
                        ))}
                      </div>
                    )}
                    {works.length > 0 && (
                      <div className="flex gap-md mt-md pt-md border-t border-outline-variant text-sm text-on-surface-variant">
                        {papers.length > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">article</span>
                            {papers.length} paper{papers.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {tools.length > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">build</span>
                            {tools.length} tool{tools.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {datasets.length > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">database</span>
                            {datasets.length} dataset{datasets.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Public toggle */}
                  <div className="flex items-center justify-between p-md bg-surface-container-low rounded-xl">
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface">
                        Public Researcher Profile
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Allow other SDD Navigator members to find you.
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

                  {error && (
                    <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-sm">
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={saving}
                      className="w-full bg-primary text-on-primary py-md rounded-lg font-headline-md hover:bg-primary-container transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving && (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      {saving ? "Saving…" : isPublic ? "Publish Profile" : "Save Draft"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/knowledge-hub")}
                      className="text-center font-label-sm text-label-sm text-primary hover:underline"
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action footer (steps 1–3 only — step 4 has its own publish controls above) */}
            {step < 4 && (
              <div className="bg-surface-container border-t border-outline-variant px-lg py-md flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className={`px-4 py-2.5 rounded-lg font-label-sm text-label-sm text-on-surface-variant flex items-center gap-2 hover:bg-surface-container-highest transition-all ${
                    step === 1 ? "invisible" : ""
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
                </button>
                <div className="flex items-center gap-md">
                  <button
                    type="button"
                    onClick={() => router.push("/knowledge-hub")}
                    className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary px-2 py-2 transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-primary-container shadow-sm transition-all"
                  >
                    {step === 3 ? "Review" : "Next Step"}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile completion indicator */}
          <div className="mt-8 flex items-center gap-md justify-center md:justify-start">
            <div className="w-16 h-16 rounded-full border-4 border-surface-container-highest relative flex items-center justify-center shrink-0">
              <svg className="absolute inset-0 -rotate-90 w-16 h-16">
                <circle
                  className="text-primary"
                  cx="32"
                  cy="32"
                  r="28"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={176}
                  strokeDashoffset={176 - (176 * progress) / 100}
                />
              </svg>
              <span className="font-label-sm text-label-sm text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-primary">
                {step < 4
                  ? `Almost there${displayName ? `, ${displayName}` : ""}!`
                  : `All set${displayName ? `, ${displayName}` : ""}!`}
              </p>
              <p className="text-sm text-on-surface-variant">
                Completing your profile increases discovery by 3x.
              </p>
            </div>
          </div>

          <p className="mt-lg text-center font-label-sm text-label-sm text-on-surface-variant max-w-[400px] mx-auto">
            Need assistance? Visit the{" "}
            <a href="/knowledge-hub" className="text-primary hover:underline">
              Knowledge Hub
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function WorkRow({
  work,
  onRemove,
}: {
  work: WorkItem;
  onRemove: (id: string) => void;
}) {
  const subtitle =
    work.type === "paper"
      ? [work.journal, work.year].filter(Boolean).join(", ")
      : work.description;

  return (
    <div className="flex items-center justify-between p-md bg-surface border border-outline-variant rounded-lg">
      <div className="min-w-0 mr-2">
        <p className="font-label-sm text-label-sm text-on-surface truncate">{work.title}</p>
        {subtitle && (
          <p className="text-sm text-on-surface-variant truncate">{subtitle}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(work.clientId)}
        className="text-on-surface-variant hover:text-error transition-colors shrink-0"
        aria-label="Remove"
      >
        <span className="material-symbols-outlined">delete</span>
      </button>
    </div>
  );
}
