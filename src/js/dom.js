/* ============================================================
   dom.js — DOM Rendering Helpers
   ============================================================ */

const DOMHelper = (() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Arabic day name mapping
  const dayNameMap = {
    Saturday: "السبت",
    Sunday: "الأحد",
    Monday: "الإثنين",
    Tuesday: "الثلاثاء",
    Wednesday: "الأربعاء",
  };

  // Group icons
  const groupIcons = { G1: "🔵", G2: "🟢", G3: "🔴" };

  return {
    $,
    $$,

    /** Render group selection buttons */
    renderGroupButtons(groups, onSelect) {
      const container = $("#group-buttons");
      container.innerHTML = "";
      groups.forEach((group) => {
        const btn = document.createElement("button");
        btn.className = "select-btn";
        btn.dataset.group = group.id;
        btn.setAttribute("aria-label", `اختر ${group.name}`);
        btn.innerHTML = `
          <span class="btn-icon">${groupIcons[group.id] || "⚪"}</span>
          <span class="btn-label">المجموعة ${group.id.replace("G", "")}</span>
        `;
        btn.addEventListener("click", () => onSelect(group.id));
        container.appendChild(btn);
      });
    },

    /** Render section selection buttons */
    renderSectionButtons(sections, onSelect) {
      const container = $("#section-buttons");
      container.innerHTML = "";
      sections.forEach((section) => {
        const btn = document.createElement("button");
        btn.className = "select-btn";
        btn.setAttribute("aria-label", `اختر ${section.name}`);
        btn.innerHTML = `
          <span class="btn-label">Section ${section.id.replace("S", "")}</span>
        `;
        btn.addEventListener("click", () => onSelect(section.id));
        container.appendChild(btn);
      });
    },

    /** Show a specific wizard step */
    showStep(stepNumber) {
      $$(".wizard-step").forEach((el) => el.classList.remove("active"));
      const stepMap = {
        1: "#step-group",
        2: "#step-section",
        3: "#step-timetable",
      };
      const target = $(stepMap[stepNumber]);
      if (target) {
        target.classList.add("active");
        // Re-trigger animation
        target.style.animation = "none";
        target.offsetHeight; // force reflow
        target.style.animation = "";
      }
    },

    /** Render the Timetable */
    renderTimetable(merged) {
      if (!merged) return;

      const { grid, days } = merged;
      const container = $("#timetable-container");

      // Build HTML table
      let html = '<table class="timetable">';

      // Header row
      html += "<thead><tr>";
      html += "<th>الوقت</th>";
      days.forEach((day) => {
        html += `<th>${dayNameMap[day] || day}</th>`;
      });
      html += "</tr></thead>";

      // Body rows
      html += "<tbody>";
      grid.forEach((row) => {
        html += "<tr>";
        // Time cell — convert to Arabic-friendly display
        html += `<td>${row.time}</td>`;

        days.forEach((day) => {
          const entries = row.cells[day];
          if (entries.length === 0) {
            html += '<td><span class="cell-empty">—</span></td>';
          } else {
            html += "<td>";
            entries.forEach((entry) => {
              const typeClass = `type-${entry.source}`;
              html += `<div class="cell-content ${typeClass}">`;
              html += `<span class="cell-subject">${entry.subject}</span>`;
              if (entry.instructor) {
                html += `<span class="cell-detail"><span class="detail-icon">👤</span>${entry.instructor}</span>`;
              }
              if (entry.location) {
                html += `<span class="cell-detail"><span class="detail-icon">📍</span>${entry.location}</span>`;
              }
              html += "</div>";
            });
            html += "</td>";
          }
        });

        html += "</tr>";
      });
      html += "</tbody></table>";

      // Legend
      html += `
        <div class="timetable-legend">
          <span class="legend-item"><span class="legend-dot lecture"></span>محاضرة</span>
          <span class="legend-item"><span class="legend-dot lab"></span>معمل</span>
          <span class="legend-item"><span class="legend-dot section"></span>سكشن</span>
        </div>
      `;

      container.innerHTML = html;
    },

    /** Update the selection summary text */
    updateSummary(groupId, sectionId) {
      const summary = $("#selection-summary");
      const groupNum = groupId.replace("G", "");
      const sectionNum = sectionId.replace("S", "");
      summary.textContent = `المجموعة ${groupNum} — الشعبة ${sectionNum}`;
    },
  };
})();
