import type {
  TargetRoadmap,
  DiscoveryRoadmap,
  ValidationRoadmap,
  Provider,
} from "@/types/navigator";

type PDFDoc = {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  setFontSize: (n: number) => PDFDoc;
  setFont: (name: string, style: string) => PDFDoc;
  setTextColor: (r: number, g: number, b: number) => PDFDoc;
  setDrawColor: (r: number, g: number, b: number) => PDFDoc;
  text: (text: string | string[], x: number, y: number) => PDFDoc;
  line: (x1: number, y1: number, x2: number, y2: number) => PDFDoc;
  splitTextToSize: (text: string, width: number) => string[];
  addPage: () => PDFDoc;
  getNumberOfPages: () => number;
  setPage: (n: number) => PDFDoc;
  save: (filename: string) => void;
};

const MARGIN = 20;
const PAGE_BREAK_Y = 270;

async function createDoc() {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as unknown as PDFDoc;
  const pageW = doc.internal.pageSize.getWidth();
  const usableW = pageW - 2 * MARGIN;
  return { doc, pageW, usableW };
}

function addHeader(doc: PDFDoc): number {
  let y = MARGIN;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 82, 60);
  doc.text("SDD Navigator — UAB SPARC", MARGIN, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, MARGIN, y);
  y += 12;
  return y;
}

function addTitleAndSummary(doc: PDFDoc, usableW: number, y: number, title: string, summary: string): number {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 82, 60);
  const titleWrapped = doc.splitTextToSize(title, usableW);
  doc.text(titleWrapped, MARGIN, y);
  y += titleWrapped.length * 7 + 4;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const summaryWrapped = doc.splitTextToSize(summary, usableW);
  doc.text(summaryWrapped, MARGIN, y);
  y += summaryWrapped.length * 5 + 10;
  return y;
}

function ensureSpace(doc: PDFDoc, y: number, threshold = PAGE_BREAK_Y): number {
  if (y > threshold) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function addProviders(
  doc: PDFDoc,
  usableW: number,
  y: number,
  providers: Array<{ name: string; type?: string; website: string; free: boolean }>
): number {
  if (!providers || providers.length === 0) return y;
  y = ensureSpace(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("Providers:", MARGIN, y);
  y += 5;
  for (const p of providers) {
    y = ensureSpace(doc, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const tag = p.free ? " [FREE]" : "";
    const typeLabel = p.type ? ` (${p.type})` : "";
    const pLine = `  • ${p.name}${typeLabel}${tag} — ${p.website}`;
    const pWrapped = doc.splitTextToSize(pLine, usableW);
    doc.text(pWrapped, MARGIN, y);
    y += pWrapped.length * 5 + 1;
  }
  return y + 4;
}

function addToolsLine(doc: PDFDoc, usableW: number, y: number, tools: string[]): number {
  if (!tools || tools.length === 0) return y;
  y = ensureSpace(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("Tools: ", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const toolsWrapped = doc.splitTextToSize(tools.join(", "), usableW - 16);
  doc.text(toolsWrapped, MARGIN + 16, y);
  return y + toolsWrapped.length * 5 + 3;
}

function addListLine(doc: PDFDoc, usableW: number, y: number, label: string, items: string[]): number {
  if (!items || items.length === 0) return y;
  y = ensureSpace(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`${label}: `, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const wrapped = doc.splitTextToSize(items.join(", "), usableW - 28);
  doc.text(wrapped, MARGIN + 28, y);
  return y + wrapped.length * 5 + 3;
}

function addFooter(doc: PDFDoc) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("sdd-navigator-six.vercel.app", MARGIN, doc.internal.pageSize.getHeight() - 10);
  }
}

export async function downloadTargetRoadmapPDF(roadmap: TargetRoadmap) {
  const { doc, usableW } = await createDoc();
  let y = addHeader(doc);
  y = addTitleAndSummary(doc, usableW, y, roadmap.title, roadmap.summary);

  for (const step of roadmap.steps) {
    y = ensureSpace(doc, y);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 82, 60);
    doc.text(`${step.id.toUpperCase()}: ${step.name}`, MARGIN, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const descWrapped = doc.splitTextToSize(step.description, usableW);
    doc.text(descWrapped, MARGIN, y);
    y += descWrapped.length * 5 + 3;

    y = addListLine(doc, usableW, y, "Scoring Criteria", step.scoring_criteria);
    y = addToolsLine(doc, usableW, y, step.tools);
    y = addProviders(doc, usableW, y, step.providers);
    y += 3;
  }

  addFooter(doc);
  doc.save("sdd-navigator-target-roadmap.pdf");
}

export async function downloadDiscoveryRoadmapPDF(roadmap: DiscoveryRoadmap) {
  const { doc, usableW } = await createDoc();
  let y = addHeader(doc);
  y = addTitleAndSummary(doc, usableW, y, roadmap.title, roadmap.summary);

  y = addListLine(doc, usableW, y, "Entry Points", roadmap.entry_points);
  y += 4;

  for (const iteration of roadmap.iterations) {
    y = ensureSpace(doc, y);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 82, 60);
    doc.text(iteration.name, MARGIN, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const descWrapped = doc.splitTextToSize(iteration.description, usableW);
    doc.text(descWrapped, MARGIN, y);
    y += descWrapped.length * 5 + 3;

    y = addToolsLine(doc, usableW, y, (iteration.tools_and_software ?? []).map((t) => t.name));
    y = addProviders(doc, usableW, y, iteration.cro_partners ?? []);
    y += 3;
  }

  y = ensureSpace(doc, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 82, 60);
  doc.text("Exit Point: Synthesis Ready Candidate", MARGIN, y);
  y += 6;

  addFooter(doc);
  doc.save("sdd-navigator-discovery-roadmap.pdf");
}

export async function downloadValidationRoadmapPDF(roadmap: ValidationRoadmap) {
  const { doc, usableW } = await createDoc();
  let y = addHeader(doc);
  y = addTitleAndSummary(doc, usableW, y, roadmap.title, roadmap.summary);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Current Context Level: ${roadmap.current_level} / 10`, MARGIN, y);
  y += 10;

  for (const level of roadmap.context_levels) {
    y = ensureSpace(doc, y);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(level.is_current ? 180 : 0, level.is_current ? 120 : 82, level.is_current ? 0 : 60);
    const marker = level.is_current ? "  ← CURRENT" : "";
    doc.text(`Level ${level.level}: ${level.name}${marker}`, MARGIN, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const descWrapped = doc.splitTextToSize(level.description, usableW);
    doc.text(descWrapped, MARGIN, y);
    y += descWrapped.length * 5 + 3;

    y = ensureSpace(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Cost: ${level.cost_range}   Timeline: ${level.timeline}`, MARGIN, y);
    y += 5;

    y = addListLine(doc, usableW, y, "Experiments", level.experiments);
    y = addToolsLine(doc, usableW, y, level.tools);
    y = addProviders(doc, usableW, y, level.providers);
    y += 3;
  }

  addFooter(doc);
  doc.save("sdd-navigator-validation-roadmap.pdf");
}
