/* ============================================================
   export.js — PDF Export using jsPDF + autoTable
   Supports Arabic text via embedded font
   ============================================================ */

const Exporter = (() => {
  const dayNameMap = {
    Saturday: "السبت",
    Sunday: "الأحد",
    Monday: "الإثنين",
    Tuesday: "الثلاثاء",
    Wednesday: "الأربعاء",
  };

  /**
   * Load an Arabic-supporting font (Amiri) for jsPDF.
   * We use a Base64-embedded TTF font.
   */
  let _fontLoaded = false;
  let _fontData = null;

  async function loadArabicFont() {
    if (_fontLoaded) return;
    try {
      // Load Amiri font from Google Fonts (direct TTF link)
      const response = await fetch(
        "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf",
      );
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

  /**
   * Reverse Arabic text segments to work around jsPDF RTL limitations.
   * jsPDF renders text LTR by default; we reshape the string.
   */
  function reshapeArabic(text) {
    // Simply return text — autoTable handles basic rendering,
    // and the Amiri font has correct glyph shapes.
    // If more complex shaping is needed, integrate arabic-reshaper library.
    return text;
  }

  /**
   * Register font and apply to the doc
   */
  function applyFont(doc) {
    if (_fontData) {
      doc.addFileToVFS("Amiri-Regular.ttf", _fontData);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      doc.setFont("Amiri");
    }
  }

  return {
    async generatePDF() {
      const state = AppState.get();
      const merged = AppState.getMergedSchedule();
      if (!merged) return;

      // Pre-load font
      await loadArabicFont();

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Apply Arabic font
      applyFont(doc);

      const pageWidth = doc.internal.pageSize.getWidth();

      // --- Title ---
      doc.setFontSize(18);
      const title = "الجدول الدراسي";
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, pageWidth - 14, 18, { align: "right" });

      // --- Subtitle ---
      doc.setFontSize(11);
      const groupNum = state.selectedGroup.replace("G", "");
      const sectionNum = state.selectedSection.replace("S", "");
      const subtitle = `المجموعة ${groupNum} — الشعبة ${sectionNum}  |  الفصل الدراسي الثاني ٢٠٢٥-٢٠٢٦`;
      doc.text(subtitle, pageWidth - 14, 26, { align: "right" });

      // --- Build table data ---
      const { grid, days } = merged;

      // Column headers (right to left: time first for RTL)
      const columns = [
        { header: "الوقت", dataKey: "time" },
        ...days.map((d) => ({ header: dayNameMap[d] || d, dataKey: d })),
      ];

      const rows = grid.map((row) => {
        const rowData = { time: row.time };
        days.forEach((day) => {
          const entries = row.cells[day];
          if (entries.length === 0) {
            rowData[day] = "—";
          } else {
            rowData[day] = entries
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

      // --- Render Table ---
      doc.autoTable({
        columns,
        body: rows,
        startY: 32,
        theme: "grid",
        styles: {
          font: _fontData ? "Amiri" : "helvetica",
          fontSize: 8,
          cellPadding: 3,
          halign: "center",
          valign: "middle",
          lineWidth: 0.3,
          lineColor: [200, 200, 200],
        },
        headStyles: {
          fillColor: [108, 92, 231],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 250],
        },
        columnStyles: {
          time: {
            cellWidth: 28,
            fontStyle: "bold",
            fillColor: [240, 240, 248],
          },
        },
        didParseCell: function (data) {
          // Color-code cells based on content
          if (data.section === "body" && data.column.dataKey !== "time") {
            const val = data.cell.raw || "";
            if (typeof val === "string") {
              if (val.toLowerCase().includes("lab") || val.includes("معمل")) {
                data.cell.styles.fillColor = [230, 255, 254];
              } else if (val.includes("Lec") || val.includes("محاضرة")) {
                data.cell.styles.fillColor = [240, 237, 255];
              }
            }
          }
        },
        margin: { top: 32, right: 14, bottom: 14, left: 14 },
      });

      // --- Footer ---
      const finalY = doc.lastAutoTable.finalY || 180;
      doc.setFontSize(7);
      doc.setTextColor(150);
      const footer = `تم التصدير بتاريخ ${new Date().toLocaleDateString("ar-EG")}`;
      doc.text(footer, pageWidth / 2, finalY + 8, { align: "center" });

      // --- Save ---
      doc.save(`Timetable_G${groupNum}_S${sectionNum}.pdf`);
    },
  };
})();
