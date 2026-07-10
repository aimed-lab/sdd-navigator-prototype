import type { ProposalDocument, ProposalRecap } from "@/types/proposal";

type PDFDoc = {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  setFontSize: (n: number) => PDFDoc;
  setFont: (name: string, style: string) => PDFDoc;
  setTextColor: (r: number, g: number, b: number) => PDFDoc;
  setDrawColor: (r: number, g: number, b: number) => PDFDoc;
  text: (text: string | string[], x: number, y: number) => PDFDoc;
  textWithLink: (text: string, x: number, y: number, options: { url: string }) => number;
  line: (x1: number, y1: number, x2: number, y2: number) => PDFDoc;
  splitTextToSize: (text: string, width: number) => string[];
  addPage: () => PDFDoc;
  getNumberOfPages: () => number;
  setPage: (n: number) => PDFDoc;
  save: (filename: string) => void;
};

const MARGIN = 20;
// Space kept clear at the bottom of every page for the footer, so content never
// runs into it. Footer baseline sits at pageHeight - FOOTER_BASELINE_OFFSET;
// content is page-broken before it can cross (pageHeight - FOOTER_RESERVE).
const FOOTER_BASELINE_OFFSET = 10;
const FOOTER_RESERVE = 16;
const LINE_H = 5; // default wrapped-line height at 9-10pt body text

function contentBottom(doc: PDFDoc): number {
  return doc.internal.pageSize.getHeight() - FOOTER_RESERVE;
}

// A11y link colour (blue) for clickable text.
const LINK_RGB: [number, number, number] = [17, 85, 204];

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

// Page-break BEFORE drawing a block. `needed` is the block's height (mm); if it
// wouldn't fit above the reserved footer band, start a new page. Height-aware so
// a tall multi-line block moves as a unit instead of overrunning the footer.
function ensureSpace(doc: PDFDoc, y: number, needed = 0): number {
  if (y + needed > contentBottom(doc)) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function addListLine(doc: PDFDoc, usableW: number, y: number, label: string, items: string[]): number {
  if (!items || items.length === 0) return y;
  const wrapped = doc.splitTextToSize(items.join(", "), usableW - 28);
  y = ensureSpace(doc, y, wrapped.length * LINE_H);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`${label}: `, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(wrapped, MARGIN + 28, y);
  return y + wrapped.length * LINE_H + 3;
}

// Footer sits at a FIXED bottom-margin position on every page and is a clickable
// link to the site. Content is reserved away from this band by ensureSpace.
function addFooter(doc: PDFDoc) {
  const url = "https://sdd-navigator-six.vercel.app";
  const label = "sdd-navigator-six.vercel.app";
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...LINK_RGB);
    doc.textWithLink(label, MARGIN, doc.internal.pageSize.getHeight() - FOOTER_BASELINE_OFFSET, { url });
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
  const wrapped = doc.splitTextToSize(value.trim(), usableW);
  // Keep the label + its wrapped value together on one page.
  y = ensureSpace(doc, y, 5 + wrapped.length * LINE_H);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 82, 60);
  doc.text(`${label.toUpperCase()}`, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(wrapped, MARGIN, y);
  return y + wrapped.length * LINE_H + 4;
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
      y = ensureSpace(doc, y, goalWrapped.length * LINE_H);
      doc.text(goalWrapped, MARGIN, y);
      y += goalWrapped.length * LINE_H + 3;
    }

    // Expected outcomes / deliverables.
    if (phase.outcomes && phase.outcomes.length > 0) {
      y = ensureSpace(doc, y, 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 82, 60);
      doc.text("Expected Outcomes:", MARGIN, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      for (const outcome of phase.outcomes) {
        const wrapped = doc.splitTextToSize(`  • ${outcome}`, usableW);
        y = ensureSpace(doc, y, wrapped.length * LINE_H);
        doc.text(wrapped, MARGIN, y);
        y += wrapped.length * LINE_H;
      }
      y += 3;
    }

    // Verified providers.
    y = ensureSpace(doc, y, 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("Verified Providers:", MARGIN, y);
    y += 5;

    if (phase.providers.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      const note = doc.splitTextToSize(
        "  No verified SPARC providers for this phase yet — this phase would draw on external providers or the researcher's own capabilities. The relevant research below still applies.",
        usableW,
      );
      y = ensureSpace(doc, y, note.length * LINE_H + 2);
      doc.text(note, MARGIN, y);
      y += note.length * LINE_H + 2;
    } else {
      for (const p of phase.providers) {
        y = ensureSpace(doc, y, 5);
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
          y = ensureSpace(doc, y, sp.length * LINE_H);
          doc.text(sp, MARGIN, y);
          y += sp.length * LINE_H;
        }
        if (p.how) {
          const how = doc.splitTextToSize(`     ${p.how}`, usableW - 4);
          y = ensureSpace(doc, y, how.length * LINE_H);
          doc.setTextColor(60, 60, 60);
          doc.text(how, MARGIN, y);
          y += how.length * LINE_H;
        }
        if (p.capabilities.length > 0) {
          y = addListLine(doc, usableW, y, "     Capabilities", p.capabilities);
        }
        if (p.tools.length > 0) {
          y = addListLine(doc, usableW, y, "     Tools", p.tools);
        }
        // Clickable contact link (only when a real URL exists).
        if (p.contact && p.contact.trim()) {
          const url = /^https?:\/\//i.test(p.contact) ? p.contact : `https://${p.contact}`;
          y = ensureSpace(doc, y, LINE_H);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...LINK_RGB);
          doc.textWithLink(`     Connect: ${p.contact}`, MARGIN, y, { url });
          y += LINE_H;
        }
        y += 2;
      }
    }

    // Relevant research — clickable titles/entries linking to the source URL.
    if (phase.papers.length > 0) {
      y = ensureSpace(doc, y, 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text("Relevant Research:", MARGIN, y);
      y += 5;
      for (const paper of phase.papers) {
        // Honest type labels — grants are broad Grants.gov funding opportunities.
        const typeLabel =
          paper.type === "trial" ? "Trial" : paper.type === "grant" ? "Funding Opportunity" : "Paper";
        const line = `  • [${typeLabel}] ${paper.title} — ${paper.source}${paper.date ? `, ${paper.date}` : ""}`;
        const wrapped = doc.splitTextToSize(line, usableW);
        y = ensureSpace(doc, y, wrapped.length * LINE_H + 1);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const url = paper.url?.trim();
        if (url) {
          // textWithLink measures each line, so the clickable region matches the
          // drawn text exactly. Link colour signals clickability.
          doc.setTextColor(...LINK_RGB);
          let ly = y;
          for (const wl of wrapped) {
            doc.textWithLink(wl, MARGIN, ly, { url });
            ly += LINE_H;
          }
        } else {
          doc.setTextColor(60, 60, 60);
          doc.text(wrapped, MARGIN, y);
        }
        y += wrapped.length * LINE_H + 1;
      }
    }

    y += 5;
  });

  addFooter(doc);
  doc.save("sdd-navigator-proposal.pdf");
}
