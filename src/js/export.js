/* ============================================================
   export.js — PDF Export using jsPDF + autoTable
   • Dynamically loads libraries on first use (lazy)
   • Supports Arabic text via Amiri font
   • Transposed layout: Days = rows, Times = columns
   ============================================================ */

/**
 * Inject a <script> tag and return a Promise that resolves on load.
 * Skips injection if the script is already present.
 */
function _loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Load jsPDF (base) + autoTable (plugin) sequentially.
 * autoTable depends on jsPDF, so order matters.
 */
async function _loadPdfLibraries() {
  // If already loaded, skip
  if (
    window.jspdf?.jsPDF &&
    typeof window.jspdf.jsPDF.API?.autoTable === "function"
  ) {
    return;
  }

  // 1. Load jsPDF base
  await _loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js",
  );

  // 2. Load autoTable plugin (registers itself on jsPDF)
  await _loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js",
  );
}

/* ------------------------------------------------------------ */

const Exporter = (() => {
  "use strict";

  const dayNameMap = {
    Saturday: "السبت",
    Sunday: "الأحد",
    Monday: "الإثنين",
    Tuesday: "الثلاثاء",
    Wednesday: "الأربعاء",
  };

  /* ---------- Arabic Font Loading ---------- */

  let _fontLoaded = false;
  let _fontData = null;

  async function _loadArabicFont() {
    if (_fontLoaded) return;
    try {
      const response = await fetch(
        "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf",
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      _fontData = btoa(binary);
      _fontLoaded = true;
    } catch (e) {
      console.warn("Could not load Arabic font, falling back to default:", e);
    }
  }

  /** Register & apply the Amiri font to a jsPDF doc */
  function _applyFont(doc) {
    if (!_fontData) return;
    doc.addFileToVFS("Amiri-Regular.ttf", _fontData);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    doc.setFont("Amiri");
  }

  /* ---------- Color Palette ---------- */

  const COLORS = {
    primary: [108, 92, 231], // #6c5ce7
    primaryLight: [237, 233, 254], // very light purple
    accent: [0, 206, 201], // #00cec9
    accentLight: [224, 255, 254], // very light teal
    headerBg: [108, 92, 231],
    headerText: [255, 255, 255],
    rowEven: [255, 255, 255],
    rowOdd: [248, 247, 254],
    dayCellBg: [243, 241, 255],
    border: [220, 218, 240],
    textDark: [30, 30, 50],
    textMuted: [120, 120, 140],
    labBg: [230, 255, 254],
    lectureBg: [240, 237, 255],
  };

  /* ---------- Main Export ---------- */

  return {
    async generatePDF() {
      // 1. Load libraries dynamically
      try {
        await _loadPdfLibraries();
      } catch {
        alert("فشل تحميل مكتبة PDF. يرجى التحقق من اتصال الإنترنت.");
        return;
      }

      // 2. Gather state
      const state = AppState.get();
      const merged = AppState.getMergedSchedule();
      if (!merged) return;

      // 3. Pre-load Arabic font
      await _loadArabicFont();

      // 4. Create document (landscape A4)
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      _applyFont(doc);

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const fontName = _fontData ? "Amiri" : "helvetica";
      const groupNum = state.selectedGroup.replace("G", "");
      const sectionNum = state.selectedSection.replace("S", "");

      // ── Header Accent Bar ───────────────────────────
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 0, pageW, 3, "F");

      // ── Title ───────────────────────────────────────
      doc.setFont(fontName, "normal");
      doc.setFontSize(20);
      doc.setTextColor(...COLORS.textDark);
      const title = "الجدول الدراسي";
      doc.text(title, pageW - 14, 16, { align: "right" });

      // ── Subtitle ───────────────────────────────────
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.textMuted);
      const subtitle = `المجموعة ${groupNum} — الشعبة ${sectionNum}  |  الفصل الدراسي الثاني ٢٠٢٥–٢٠٢٦`;
      doc.text(subtitle, pageW - 14, 23, { align: "right" });

      // ── Thin separator line ────────────────────────
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.4);
      doc.line(14, 27, pageW - 14, 27);

      // ── Build Table Data (transposed: days=rows, times=columns) ──
      const { grid, days, timeSlots } = merged;

      // Column headers: "اليوم" + each time slot
      const columns = [
        { header: "اليوم", dataKey: "day" },
        ...timeSlots.map((t) => ({ header: t, dataKey: t })),
      ];

      // One row per day
      const rows = days.map((day) => {
        const rowData = { day: dayNameMap[day] || day };
        timeSlots.forEach((slot) => {
          const gridRow = grid.find((r) => r.time === slot);
          const entries = gridRow ? gridRow.cells[day] : [];
          if (!entries || entries.length === 0) {
            rowData[slot] = "—";
          } else {
            rowData[slot] = entries
              .map((e) => {
                let text = e.subject;
                if (e.instructor) text += `\n${e.instructor}`;
                if (e.location) text += `\n${e.location}`;
                return text;
              })
              .join("\n\n");
          }
        });
        return rowData;
      });

      // ── Render Table ────────────────────────────────
      doc.autoTable({
        columns,
        body: rows,
        startY: 31,
        theme: "grid",
        tableWidth: "auto",

        styles: {
          font: fontName,
          fontSize: 7.5,
          cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
          halign: "center",
          valign: "middle",
          lineWidth: 0.25,
          lineColor: COLORS.border,
          textColor: COLORS.textDark,
          overflow: "linebreak",
          cellWidth: "wrap",
        },

        headStyles: {
          fillColor: COLORS.headerBg,
          textColor: COLORS.headerText,
          fontSize: 8.5,
          fontStyle: "bold",
          halign: "center",
          cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
        },

        alternateRowStyles: {
          fillColor: COLORS.rowOdd,
        },

        bodyStyles: {
          fillColor: COLORS.rowEven,
        },

        columnStyles: {
          day: {
            cellWidth: 24,
            fontStyle: "bold",
            fillColor: COLORS.dayCellBg,
            halign: "center",
            fontSize: 9,
          },
        },

        didParseCell(data) {
          // Color-code lecture vs lab cells
          if (data.section === "body" && data.column.dataKey !== "day") {
            const val = String(data.cell.raw || "");
            if (
              val.includes("Lab") ||
              val.includes("معمل") ||
              val.includes("lab")
            ) {
              data.cell.styles.fillColor = COLORS.labBg;
            } else if (
              val.includes("Lec") ||
              val.includes("محاضرة") ||
              (val !== "—" && val.length > 2)
            ) {
              data.cell.styles.fillColor = COLORS.lectureBg;
            }
          }
        },

        margin: { top: 31, right: 14, bottom: 20, left: 14 },

        didDrawPage(data) {
          // Accent bar on every page
          doc.setFillColor(...COLORS.primary);
          doc.rect(0, 0, pageW, 3, "F");
        },
      });

      // ── Footer ──────────────────────────────────────
      const finalY = doc.lastAutoTable?.finalY || pageH - 30;
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textMuted);

      const dateStr = new Date().toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const footer = `تم التصدير بتاريخ ${dateStr}`;
      doc.text(footer, pageW / 2, Math.min(finalY + 10, pageH - 8), {
        align: "center",
      });

      // ── Bottom accent bar ──────────────────────────
      doc.setFillColor(...COLORS.accent);
      doc.rect(0, pageH - 2, pageW, 2, "F");

      // ── Save ────────────────────────────────────────
      doc.save(`Timetable_G${groupNum}_S${sectionNum}.pdf`);
    },
  };
})();
