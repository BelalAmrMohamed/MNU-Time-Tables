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

    /** Render the Timetable — Days as rows, Time slots as columns */
    renderTimetable(merged) {
      if (!merged) return;

      const { grid, days, timeSlots } = merged;
      const container = $("#timetable-container");

      // Build HTML table (transposed: days = rows, times = columns)
      let html = '<table class="timetable">';

      // Header row: first cell = "اليوم", then one <th> per time slot
      html += "<thead><tr>";
      html += "<th>اليوم</th>";
      timeSlots.forEach((slot) => {
        html += `<th>${slot}</th>`;
      });
      html += "</tr></thead>";

      // Body rows: one row per day
      html += "<tbody>";
      days.forEach((day) => {
        html += "<tr>";
        html += `<td class="day-cell">${dayNameMap[day] || day}</td>`;

        timeSlots.forEach((slot) => {
          // Find the grid row matching this time slot
          const gridRow = grid.find((r) => r.time === slot);
          const entries = gridRow ? gridRow.cells[day] : [];

          if (!entries || entries.length === 0) {
            html += '<td><span class="cell-empty">—</span></td>';
          } else {
            html += "<td>";
            entries.forEach((entry) => {
              const typeClass = `type-${entry.source}`;
              html += `<div class="cell-content ${typeClass}">`;
              html += `<span class="cell-subject">${entry.subject}</span>`;
              if (entry.instructor && entry.instructor !== "") {
                html += `<span class="cell-detail"><span class="detail-icon">👤</span>${entry.instructor}</span>`;
              }
              if (entry.location && entry.location !== "") {
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
        </div>
      `;

      container.innerHTML = html;
    },

    /** Update the selection summary text */
    updateSummary(groupId, sectionId) {
      const summary = $("#selection-summary");
      const groupNum = groupId.replace("G", "");
      const sectionNum = sectionId.replace("S", "");
      summary.textContent = `Group ${groupNum} — Section ${sectionNum}`;
    },
  };
})();
