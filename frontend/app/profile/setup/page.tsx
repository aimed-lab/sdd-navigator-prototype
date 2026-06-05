"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
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
      .select("bio, research_focus, linkedin_url, website_url, interests")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.bio) setBio(data.bio);
        if (data.research_focus) setResearchFocus(data.research_focus);
        if (data.linkedin_url) setLinkedinUrl(data.linkedin_url);
        if (data.website_url) setWebsiteUrl(data.website_url);
        if (data.interests?.length) setInterests(data.interests);
      });
  }, [user]);

  if (loading || !user) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
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
    <div className="bg-background text-on-surface font-body-md min-h-screen">
      <Navbar />
      <main className="max-w-[1280px] mx-auto px-gutter py-lg flex flex-col items-center">
        <div className="w-full max-w-[720px] bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">

          {/* Progress indicator */}
          <div className="px-lg pt-lg pb-md">
            <div className="flex justify-between items-end mb-sm">
              <h1 className="font-headline-md text-headline-md text-primary">
                {STEP_TITLES[step - 1]}
              </h1>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Step {step} of 4
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="px-lg pb-lg">

            {/* ── Step 1: Basic Info ───────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-md">
                <div className="space-y-sm">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">
                    Biography
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface p-md min-h-[120px] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors resize-none"
                    placeholder="Briefly describe your academic background and research focus..."
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
                    className="w-full rounded-lg border border-outline-variant bg-surface p-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                    placeholder="e.g. ADC Drug Discovery, Molecular Modeling…"
                  />
                </div>

                <div className="grid grid-cols-2 gap-sm">
                  <div className="space-y-sm">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface p-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                      placeholder="linkedin.com/in/…"
                    />
                  </div>
                  <div className="space-y-sm">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant">
                      Lab Website
                    </label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface p-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                      placeholder="uab.edu/lab/…"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Research Interests ───────────────────────── */}
            {step === 2 && (
              <div className="space-y-md">
                <p className="font-body-md text-on-surface-variant">
                  Select keywords that best represent your research expertise to help others find
                  your work.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-sm">
                  {INTEREST_OPTIONS.map((interest) => {
                    const selected = interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`relative flex items-center p-md rounded-lg border cursor-pointer transition-colors text-left ${
                          selected
                            ? "border-primary bg-secondary-container text-on-secondary-container"
                            : "border-outline-variant bg-surface text-on-surface hover:bg-secondary-container/30"
                        }`}
                      >
                        <span className="font-label-sm text-label-sm pr-5">{interest}</span>
                        {selected && (
                          <span className="material-symbols-outlined text-primary text-[14px] absolute right-2 top-1/2 -translate-y-1/2">
                            check_circle
                          </span>
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
                  <div className="flex justify-between items-center">
                    <h3 className="font-headline-md text-primary flex items-center gap-xs">
                      <span className="material-symbols-outlined">article</span> Papers
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPaper((v) => !v)}
                      className="flex items-center gap-xs text-primary font-label-sm text-label-sm hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Add Paper
                    </button>
                  </div>
                  {showPaper && (
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
                      <button
                        type="button"
                        onClick={addPaper}
                        className="w-full bg-primary text-on-primary p-sm rounded-lg font-label-sm"
                      >
                        Save Paper
                      </button>
                    </div>
                  )}
                  {papers.map((w) => (
                    <WorkRow key={w.clientId} work={w} onRemove={removeWork} />
                  ))}
                </div>

                {/* Tools */}
                <div className="space-y-sm border-t border-outline-variant pt-md">
                  <div className="flex justify-between items-center">
                    <h3 className="font-headline-md text-primary flex items-center gap-xs">
                      <span className="material-symbols-outlined">build</span> Tools
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowTool((v) => !v)}
                      className="flex items-center gap-xs text-primary font-label-sm text-label-sm hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Add Tool
                    </button>
                  </div>
                  {showTool && (
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
                      <button
                        type="button"
                        onClick={addTool}
                        className="w-full bg-primary text-on-primary p-sm rounded-lg font-label-sm"
                      >
                        Save Tool
                      </button>
                    </div>
                  )}
                  {tools.map((w) => (
                    <WorkRow key={w.clientId} work={w} onRemove={removeWork} />
                  ))}
                </div>

                {/* Datasets */}
                <div className="space-y-sm border-t border-outline-variant pt-md">
                  <div className="flex justify-between items-center">
                    <h3 className="font-headline-md text-primary flex items-center gap-xs">
                      <span className="material-symbols-outlined">database</span> Datasets
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowDataset((v) => !v)}
                      className="flex items-center gap-xs text-primary font-label-sm text-label-sm hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Add Dataset
                    </button>
                  </div>
                  {showDataset && (
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
                      <button
                        type="button"
                        onClick={addDataset}
                        className="w-full bg-primary text-on-primary p-sm rounded-lg font-label-sm"
                      >
                        Save Dataset
                      </button>
                    </div>
                  )}
                  {datasets.map((w) => (
                    <WorkRow key={w.clientId} work={w} onRemove={removeWork} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 4: Preview & Publish ────────────────────────── */}
            {step === 4 && (
              <div className="space-y-lg">
                {/* Profile preview card */}
                <div className="bg-surface rounded-xl border border-outline-variant p-lg shadow-sm">
                  <div className="flex items-center gap-md mb-md">
                    <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-2xl shrink-0">
                      {getInitials(displayName || "?")}
                    </div>
                    <div>
                      <h2 className="font-headline-md text-primary">{displayName}</h2>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {researchFocus || "Researcher"}
                      </p>
                    </div>
                  </div>
                  {bio && (
                    <p className="font-body-md text-on-surface-variant italic mb-md line-clamp-3">
                      &ldquo;{bio}&rdquo;
                    </p>
                  )}
                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-xs">
                      {interests.slice(0, 5).map((i) => (
                        <span
                          key={i}
                          className="px-sm py-[2px] bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-semibold uppercase tracking-wider"
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
                <div className="flex items-center justify-between p-md bg-surface-container-low rounded-lg">
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface">
                      Make Profile Public
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
                    className="w-full bg-primary text-on-primary py-md rounded-lg font-headline-md hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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

            {/* Footer navigation (steps 1–3) */}
            {step < 4 && (
              <div className="flex justify-between items-center mt-lg pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className={`font-label-sm text-label-sm font-medium text-on-surface-variant hover:text-primary transition-all flex items-center gap-xs ${
                    step === 1 ? "invisible" : ""
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="bg-primary text-on-primary px-lg py-md rounded-full font-label-sm text-label-sm hover:opacity-90 transition-all flex items-center gap-xs"
                >
                  Continue
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-lg text-center font-label-sm text-label-sm text-on-surface-variant max-w-[400px]">
          Need assistance? Visit the{" "}
          <a href="/knowledge-hub" className="text-primary hover:underline">
            Knowledge Hub
          </a>
          .
        </p>
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
  return (
    <div className="flex items-center justify-between p-sm bg-surface-container-low rounded-lg border border-outline-variant/50">
      <span className="text-sm text-on-surface truncate mr-2">{work.title}</span>
      <button
        type="button"
        onClick={() => onRemove(work.clientId)}
        className="text-on-surface-variant hover:text-error transition-colors shrink-0"
        aria-label="Remove"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
  );
}
