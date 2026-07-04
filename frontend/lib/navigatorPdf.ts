import type { ProposalDocument, ProposalRecap } from "@/types/proposal";

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

// ── Unified proposal document ─────────────────────────────────────────────────
// One exporter for the new ProposalDocument shape. Unlike the 3 roadmap
// exporters above, this leads with the researcher's OWN inputs (the recap /
// "Your project" block) so the downloaded PDF is a self-contained record of both
// what they asked for and what was generated.

// Print one "LABEL: value" pair with the value wrapped under/after the label.
function addRecapField(doc: PDFDoc, usableW: number, y: number, label: string, value: string): number {
  if (!value || !value.trim()) return y;
  y = ensureSpace(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 82, 60);
  doc.text(`${label.toUpperCase()}`, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const wrapped = doc.splitTextToSize(value.trim(), usableW);
  doc.text(wrapped, MARGIN, y);
  return y + wrapped.length * 5 + 4;
}

function addProposalRecap(doc: PDFDoc, usableW: number, y: number, recap: ProposalRecap): number {
  y = ensureSpace(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 82, 60);
  doc.text("Your Project", MARGIN, y);
  y += 7;

  y = addRecapField(doc, usableW, y, "Title", recap.title);
  y = addRecapField(doc, usableW, y, "Therapeutic Target / Assets", recap.therapeutic_target);
  y = addRecapField(doc, usableW, y, "Scientific Rationale", recap.scientific_rationale);
  y = addRecapField(doc, usableW, y, "Support Needed", recap.sparc_support_needed);
  y = addRecapField(doc, usableW, y, "Validation Plan", recap.validation_plan);
  y = addRecapField(doc, usableW, y, "Expected Impact", recap.expected_impact);
  y = addRecapField(doc, usableW, y, "Project Readiness", recap.project_readiness);
  y = addListLine(doc, usableW, y, "Support Requested", recap.support_chips);
  return y + 4;
}

export async function downloadProposalPDF(document: ProposalDocument) {
  const { doc, usableW } = await createDoc();
  let y = addHeader(doc);
  y = addTitleAndSummary(doc, usableW, y, document.title, document.summary);

  // Inputs first — the recap / "Your project" block.
  y = addProposalRecap(doc, usableW, y, document.recap);

  // Divider before the generated phases.
  y = ensureSpace(doc, y);
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, MARGIN + usableW, y);
  y += 8;

  document.phases.forEach((phase, i) => {
    y = ensureSpace(doc, y);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 82, 60);
    doc.text(`Phase ${i + 1} — ${phase.title}`, MARGIN, y);
    y += 6;

    if (phase.estimated_duration) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(`Estimated duration: ${phase.estimated_duration}`, MARGIN, y);
      y += 5;
    }

    if (phase.goal) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      const goalWrapped = doc.splitTextToSize(`Goal: ${phase.goal}`, usableW);
      doc.text(goalWrapped, MARGIN, y);
      y += goalWrapped.length * 5 + 3;
    }

    // Verified providers.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    y = ensureSpace(doc, y);
    doc.text("Verified Providers:", MARGIN, y);
    y += 5;

    if (phase.providers.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(110, 110, 110);
      doc.text("  No verified providers for this phase yet.", MARGIN, y);
      y += 6;
    } else {
      for (const p of phase.providers) {
        y = ensureSpace(doc, y);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        const cost = p.cost_symbol ?? (p.is_free ? "Free" : "—");
        const timeline = p.estimated_timeline ?? "—";
        doc.text(`  • ${p.name} [Verified]  ${cost} · ${timeline}`, MARGIN, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        if (p.speciality) {
          const sp = doc.splitTextToSize(`     ${p.speciality}`, usableW - 4);
          doc.text(sp, MARGIN, y);
          y += sp.length * 5;
        }
        if (p.how) {
          const how = doc.splitTextToSize(`     ${p.how}`, usableW - 4);
          doc.text(how, MARGIN, y);
          y += how.length * 5;
        }
        if (p.capabilities.length > 0) {
          y = addListLine(doc, usableW, y, "     Capabilities", p.capabilities);
        }
        if (p.tools.length > 0) {
          y = addListLine(doc, usableW, y, "     Tools", p.tools);
        }
        y += 2;
      }
    }

    // Relevant research.
    if (phase.papers.length > 0) {
      y = ensureSpace(doc, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("Relevant Research:", MARGIN, y);
      y += 5;
      for (const paper of phase.papers) {
        y = ensureSpace(doc, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        // Honest type labels — grants are broad Grants.gov funding opportunities.
        const typeLabel =
          paper.type === "trial" ? "Trial" : paper.type === "grant" ? "Funding Opportunity" : "Paper";
        const line = `  • [${typeLabel}] ${paper.title} — ${paper.source}${paper.date ? `, ${paper.date}` : ""}`;
        const wrapped = doc.splitTextToSize(line, usableW);
        doc.text(wrapped, MARGIN, y);
        y += wrapped.length * 5 + 1;
      }
    }

    y += 5;
  });

  addFooter(doc);
  doc.save("sdd-navigator-proposal.pdf");
}
