**Role:**
You are an expert Senior Full-Stack Developer and UI/UX Architect specializing in modern, lightweight web applications. Your expertise lies in vanilla JS, CSS, HTML, client-side document generation, and efficient state management.
**Project Overview:**
I need to build a "Student Timetable Portal" for 2nd-year college students.
The goal is a clean, single-page application (SPA) where students can select their specific cohort and immediately view/download their personalized schedule.
**Key Constraints & Context:**

1.  **Data Structure:** There are 3 Groups and 16 Sections total.
2.  **Single Source of Truth:** All schedule data live in a single `.json` file. Updating this one file should update the entire website.
3.  **Hosting:** The site will be hosted on Vercel via GitHub (CI/CD).
4.  **User Flow (Onboarding Wizard):**
    - Screen 1: Select Group (1, 2, or 3).
    - Screen 2: Select Section (Must list all sections to everyone. Not dependent on the Group they chose).
    - Screen 3: Display the resulting Timetable.
5.  **Export Capabilities:** Users must be able to download the displayed schedule in: \* PDF (use `jspdf` and `jspdf-autotable`) in its own file
    **Your Task:**
    Please generate a comprehensive Project Plan and Technical Design Document. Do not write the full code yet; focus on architecture.
    **Deliverables:**
    **1. Data Schema Design (Crucial):**

- Sample structure of the `schedule.json` file:

```json
{
  "metadata": {
    "academicYear": "2025-2026",
    "lastUpdated": "2026-02-13",
    "year": "2nd Year"
  },

  "groups": [
    { "id": "G1", "name": "Group 1" },
    { "id": "G2", "name": "Group 2" },
    { "id": "G3", "name": "Group 3" }
  ],

  "sections": [
    { "id": "S1", "name": "Section 1" },
    { "id": "S2", "name": "Section 2" }
    // ... up to 16 sections
  ],

  "schedule": {
    "G1": {
      "Monday": [
        {
          "time": "9:00 AM - 10:00 AM",
          "subject": "Data Structures",
          "instructor": "Dr. Smith",
          "room": "Lab 301",
          "type": "Lecture"
        },
        {
          "time": "10:00 AM - 11:00 AM",
          "subject": "Database Systems",
          "instructor": "Prof. Johnson",
          "room": "Room 205",
          "type": "Lab"
        }
      ],

      "Tuesday": [
        /* ... */
      ]
      // ... other days
    },
    "G1": {
      /* ... */
    }
    // Continue for all Group
    // Then the same for the sections
  },
  "timeSlots": [
    "9:00 AM - 11:00 AM",
    "11:00 AM - 1:00 PM",
    "1:00 PM - 3:00 PM",
    "3:00 PM - 5:00 PM"
  ],

  "subjects": {
    "DSA": { "fullName": "Data Structures", "credits": 4 },
    "DBMS": { "fullName": "Database Systems", "credits": 3 },
    "OS": { "fullName": "Operating Systems", "credits": 4 }
  }
}
```

- Show a sample JSON snippet.
  **2. Application Architecture:**
- **State Management:** How will you handle the user's selection (Group/Section) across steps?
  **3. Export Logic Strategy:**
- Explain the logic for the "One Click Export."
  **4. Folder Structure:**
- Provide a standard folder tree for the project suitable for a Vercel deployment.
  **Tone:**
  Professional, structural, and pragmatic. Focus on maintainability and ease of use for the students.
