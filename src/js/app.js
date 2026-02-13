/* ============================================================
   app.js — Main Application Entry Point
   ============================================================ */

(async function () {
  "use strict";

  const {
    $,
    $$,
    renderGroupButtons,
    renderSectionButtons,
    showStep,
    renderTimetable,
    updateSummary,
  } = DOMHelper;

  // --- Load Schedule Data ---
  try {
    const response = await fetch("public/data/schedule.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    AppState.set("scheduleData", data);
    init(data);
  } catch (err) {
    console.error("Failed to load schedule data:", err);
    $("#main-content").innerHTML = `
      <div class="step-card" style="text-align:center; padding: 3rem;">
        <h2 class="step-title">⚠️ خطأ في تحميل البيانات</h2>
        <p class="step-desc">لم نتمكن من تحميل جدول المواعيد. يرجى تحديث الصفحة.</p>
      </div>
    `;
  }

  function init(data) {
    // --- Render Group buttons ---
    renderGroupButtons(data.settings.groups, handleGroupSelect);

    // --- Render Section buttons ---
    renderSectionButtons(data.settings.sections, handleSectionSelect);

    // --- Back buttons ---
    $("#back-to-group").addEventListener("click", () => {
      AppState.set("selectedGroup", null);
      AppState.goToStep(1);
    });

    $("#back-to-section").addEventListener("click", () => {
      AppState.goToStep(2);
    });

    // --- Download PDF ---
    $("#download-pdf").addEventListener("click", async () => {
      const btn = $("#download-pdf");
      btn.disabled = true;
      btn.innerHTML = `<span>جاري التحميل...</span>`;
      try {
        await Exporter.generatePDF();
      } catch (e) {
        console.error("PDF generation failed:", e);
        alert("حدث خطأ أثناء تحميل الملف. يرجى المحاولة مرة أخرى.");
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          تحميل PDF
        `;
      }
    });

    // --- State-driven rendering ---
    AppState.subscribe((state) => {
      showStep(state.currentStep);
    });
  }

  function handleGroupSelect(groupId) {
    AppState.set("selectedGroup", groupId);
    AppState.goToStep(2);
  }

  function handleSectionSelect(sectionId) {
    // Set state silently (no subscriber notification) to avoid double render
    AppState.setSilent("selectedSection", sectionId);

    // Render the timetable
    const merged = AppState.getMergedSchedule();
    renderTimetable(merged);

    // Update summary
    const state = AppState.get();
    updateSummary(state.selectedGroup, state.selectedSection);

    // Single goToStep call triggers subscriber → showStep() exactly once
    AppState.goToStep(3);
  }
})();
