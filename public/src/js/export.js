/* ============================================================
   export.js — PDF Export using jsPDF + autoTable
   • Larger, more readable fonts
   • RTL layout with days on the right
   ============================================================ */

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function _loadPdfLibraries() {
  if (!window.jspdf?.jsPDF) {
    await _loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    );
  }

  if (!window.jspdf?.jsPDF) {
    throw new Error("jsPDF failed to register on window.jspdf");
  }

  if (typeof window.jspdf.jsPDF.API?.autoTable !== "function") {
    await _loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js",
    );
  }
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

  /* ---------- Enhanced Color Palette ---------- */

  const COLORS = {
    primary: [108, 92, 231],
    primaryDark: [78, 62, 195],
    accent: [0, 206, 201],
    accentDark: [0, 170, 166],
    headerBg: [88, 72, 211],
    headerText: [255, 255, 255],
    rowEven: [255, 255, 255],
    rowOdd: [243, 241, 255], // more visible alternation
    dayCellBg: [225, 218, 254], // stronger purple tint
    dayCellText: [50, 35, 130],
    border: [200, 196, 230],
    textDark: [25, 25, 45],
    textMuted: [90, 90, 115],
    labBg: [200, 248, 246], // more saturated teal
    labBorder: [0, 180, 176],
    lectureBg: [228, 222, 255], // more saturated purple
    lectureBorder: [108, 92, 231],
    emptyText: [180, 178, 200],
  };

  /* ---------- Main Export ---------- */

  return {
    async generatePDF() {
      // 1. Load libraries dynamically
      try {
        await _loadPdfLibraries();
      } catch (err) {
        console.error("PDF library loading failed:", err);
        alert("فشل تحميل مكتبة PDF. يرجى التحقق من اتصال الإنترنت.");
        return;
      }

      // 2. Gather state
      const state = AppState.get();
      const merged = AppState.getMergedSchedule();
      if (!merged) return;

      // 3. Pre-load Arabic font
      await _loadArabicFont();

      // 4. Create document with optimized slide-like dimensions
      // Using 297mm × 210mm (A4 landscape) but will optimize margins
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4", // 297 × 210 mm
      });

      _applyFont(doc);

      const pageW = doc.internal.pageSize.getWidth(); // 297mm
      const pageH = doc.internal.pageSize.getHeight(); // 210mm
      const fontName = _fontData ? "Amiri" : "helvetica";
      const groupNum = state.selectedGroup.replace("G", "");
      const sectionNum = state.selectedSection.replace("S", "");

      // ── Margins (reduced for more table space) ──
      const marginTop = 10;
      const marginRight = 10;
      const marginBottom = 10;
      const marginLeft = 10;

      // ── Header Accent Bar (thicker, more prominent) ──
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 0, pageW, 5, "F");

      // ── Title (larger, more prominent) ──
      doc.setFont(fontName, "normal");
      doc.setFontSize(24);
      doc.setTextColor(...COLORS.textDark);
      const title = "الجدول الدراسي";
      doc.text(title, pageW - marginRight, 18, { align: "right" });

      // ── Subtitle (larger) ──
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.textMuted);
      const subtitle = `المجموعة ${groupNum} — الشعبة ${sectionNum}  |  الفصل الدراسي الثاني ٢٠٢٥–٢٠٢٦`;
      doc.text(subtitle, pageW - marginRight, 27, { align: "right" });

      // ── Separator line ──
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, 32, pageW - marginRight, 32);

      // ── Build Table Data (RTL) ──
      const { grid, days, timeSlots } = merged;

      // Reverse time slots so RTL reads: earliest on RIGHT → latest on LEFT
      const reversedSlots = [...timeSlots].reverse();

      // Day column LAST so it appears on the RIGHT in the rendered PDF
      const columns = [
        ...reversedSlots.map((t) => ({ header: t, dataKey: t })),
        { header: "اليوم", dataKey: "day" },
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

      // ── Render Table with RTL and improved styling ──
      doc.autoTable({
        columns,
        body: rows,
        startY: 37,
        theme: "grid",
        tableWidth: "auto",

        // Enable RTL for the entire table
        // Note: This affects text direction within cells and column order
        styles: {
          font: fontName,
          fontSize: 11,
          cellPadding: { top: 5, right: 5, bottom: 5, left: 5 },
          halign: "center",
          valign: "middle",
          lineWidth: 0.35,
          lineColor: COLORS.border,
          textColor: COLORS.textDark,
          overflow: "linebreak",
          cellWidth: "wrap",
          minCellHeight: 16,
        },

        headStyles: {
          fillColor: COLORS.headerBg,
          textColor: COLORS.headerText,
          fontSize: 13,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          cellPadding: { top: 6, right: 5, bottom: 6, left: 5 },
          lineWidth: 0.5,
          lineColor: COLORS.primaryDark,
        },

        alternateRowStyles: {
          fillColor: COLORS.rowOdd,
        },

        bodyStyles: {
          fillColor: COLORS.rowEven,
          lineWidth: 0.35,
        },

        columnStyles: {
          day: {
            cellWidth: 28,
            fontStyle: "bold",
            fillColor: COLORS.dayCellBg,
            textColor: COLORS.dayCellText,
            halign: "center",
            fontSize: 13,
            lineWidth: 0.5,
            lineColor: COLORS.primary,
          },
        },

        didParseCell(data) {
          // Enhanced color-coding with borders
          if (data.section === "body" && data.column.dataKey !== "day") {
            const val = String(data.cell.raw || "");

            // Lab cells: distinct background with accent border
            if (
              val.includes("Lab") ||
              val.includes("معمل") ||
              val.includes("lab")
            ) {
              data.cell.styles.fillColor = COLORS.labBg;
              data.cell.styles.lineWidth = 0.5;
              data.cell.styles.lineColor = COLORS.labBorder;
            }
            // Lecture cells: subtle background with primary border
            else if (
              val.includes("Lec") ||
              val.includes("محاضرة") ||
              (val !== "—" && val.length > 2)
            ) {
              data.cell.styles.fillColor = COLORS.lectureBg;
              data.cell.styles.lineWidth = 0.4;
              data.cell.styles.lineColor = COLORS.lectureBorder;
            }
            // Empty cells: subtle dash
            else if (val === "—") {
              data.cell.styles.textColor = COLORS.emptyText;
              data.cell.styles.fontSize = 16;
            }
          }
        },

        // Optimized margins for maximum table width
        margin: {
          top: 37,
          right: marginRight,
          bottom: marginBottom + 8,
          left: marginLeft,
        },

        didDrawPage(data) {
          // Top accent bar on every page
          doc.setFillColor(...COLORS.primary);
          doc.rect(0, 0, pageW, 5, "F");

          // Page number (if multiple pages)
          const pageCount = doc.internal.getNumberOfPages();
          if (pageCount > 1) {
            doc.setFontSize(9);
            doc.setTextColor(...COLORS.textMuted);
            doc.text(
              `صفحة ${data.pageNumber} من ${pageCount}`,
              pageW / 2,
              pageH - 4,
              { align: "center" },
            );
          }
        },
      });

      // ── Footer ──
      const finalY = doc.lastAutoTable?.finalY || pageH - 25;
      doc.setFontSize(8.5); // Larger footer text
      doc.setTextColor(...COLORS.textMuted);

      const dateStr = new Date().toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const footer = `تم التصدير بتاريخ ${dateStr}`;
      const footerY = Math.min(finalY + 12, pageH - 6);
      doc.text(footer, pageW / 2, footerY, { align: "center" });

      // ── Bottom accent bar (thicker) ──
      doc.setFillColor(...COLORS.accent);
      doc.rect(0, pageH - 3, pageW, 3, "F");

      // ── Save ──
      doc.save(`Timetable_G${groupNum}_S${sectionNum}.pdf`);
    },
  };
})();
