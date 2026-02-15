/* ============================================================
   state.js — Simple Application State Manager
   ============================================================ */

const AppState = (() => {
  /** @type {{ currentStep: number, selectedGroup: string|null, selectedSection: string|null, scheduleData: object|null }} */
  const _state = {
    currentStep: 1,
    selectedGroup: null,
    selectedSection: null,
    scheduleData: null,
  };

  const _listeners = [];

  return {
    get() {
      return { ..._state };
    },

    set(key, value) {
      _state[key] = value;
      _listeners.forEach((fn) => fn({ ..._state }));
    },

    /** Update state without notifying subscribers (for batched changes) */
    setSilent(key, value) {
      _state[key] = value;
    },

    /** Navigate to a specific step */
    goToStep(step) {
      _state.currentStep = step;
      _listeners.forEach((fn) => fn({ ..._state }));
    },

    /** Subscribe to state changes */
    subscribe(fn) {
      _listeners.push(fn);
    },

    /** Get the merged timetable for the current selection */
    getMergedSchedule() {
      const data = _state.scheduleData;
      if (!data || !_state.selectedGroup || !_state.selectedSection)
        return null;

      const groupSchedule = data.schedules.groups[_state.selectedGroup] || {};
      const sectionSchedule =
        data.schedules.sections[_state.selectedSection] || {};
      const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
      const timeSlots = data.settings.timeSlots;

      // Build a grid: rows = timeSlots, columns = days
      const grid = [];

      timeSlots.forEach((slot) => {
        const row = { time: slot, cells: {} };
        days.forEach((day) => {
          row.cells[day] = [];

          // Find matching entries from group schedule
          const groupEntries = groupSchedule[day] || [];
          groupEntries.forEach((entry) => {
            if (entry.time === slot) {
              row.cells[day].push({ ...entry, source: "lecture" });
            }
          });

          // Find matching entries from section schedule
          const sectionEntries = sectionSchedule[day] || [];
          sectionEntries.forEach((entry) => {
            if (entry.time === slot) {
              // Determine type based on subject name
              const subjectLower = entry.subject.toLowerCase();
              let source = "section";
              if (subjectLower.includes("lab")) source = "lab";
              row.cells[day].push({ ...entry, source });
            }
          });
        });
        grid.push(row);
      });

      return { grid, days, timeSlots };
    },

    /** Get display name for a group/section id */
    getDisplayName(type, id) {
      const data = _state.scheduleData;
      if (!data) return id;
      const list =
        type === "group" ? data.settings.groups : data.settings.sections;
      const found = list.find((item) => item.id === id);
      return found ? found.name : id;
    },
  };
})();
