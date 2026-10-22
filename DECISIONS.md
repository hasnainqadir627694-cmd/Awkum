# Architectural Decision Records (ADRs) — AWKUM ClassHub

**Abdul Wali Khan University Mardan · Garden Campus**  
*Document Version: 2.1 · Status: Active Architectural Record*

---

## ADR 01: Single Daily Whole-Class Attendance Record Policy

- **Status**: Accepted & Invariant
- **Context**: Academic management software often suffers from fragmented data models when attendance is recorded individually per lecture, leading to multiple conflicting records, orphaned attendance states, and confusing percentage metrics.
- **Decision**: In AWKUM ClassHub, **exactly one attendance session exists per class/section per calendar day**. Attendance is NOT recorded separately for each subject.
- **Rationale**:
  - Eliminates subject-level schedule discrepancies.
  - Guarantees simple, unambiguous attendance percentages:
    $$\text{Rate} = \left(\frac{\text{Present Count}}{\text{Total Enrolled}}\right) \times 100$$
  - Enables deterministic document keying in Firestore: `{classId}_{YYYY-MM-DD}`.
- **Consequences**: Adding dynamic subjects to the timetable does not duplicate daily attendance sheets.

---

## ADR 02: Dual-Experience Model for Class Representatives

- **Status**: Accepted & Invariant
- **Context**: A student appointed as Class Representative is still an active student in that same section with homework to submit, lecture notes to read, and a personal timetable to view.
- **Decision**: Appointing a student as CR **adds the CR capability without replacing or deleting their Student role** (`roles: ['student', 'cr']`).
- **Rationale**:
  - The user can toggle between their Student Portal and CR Workspace with one tap without logging out.
  - Revoking CR privileges returns the user cleanly to standard student permissions without data loss.
- **Consequences**: UI components must support mode switching (`portalMode === 'cr' | 'student'`) and real-time permission listeners.

---

## ADR 03: Deterministic Document Keying for Attendance Sessions

- **Status**: Accepted
- **Context**: Concurrent network requests, accidental double-clicks, or offline retries could create duplicate attendance documents for the same section and date.
- **Decision**: Key attendance documents deterministically as `attendanceSessions/${classId}_${date}` (e.g. `BSCS_3A_2026-10-21`).
- **Rationale**:
  - Prevents race conditions and duplicate records at the database engine level.
  - Makes daily sessions easily indexable and retrievable without composite query overhead.
- **Consequences**: Updating a session updates the existing document rather than appending a duplicate record.

---

## ADR 04: Server-Side Cloudinary File Upload Proxy

- **Status**: Accepted
- **Context**: Student assignment submissions and university branding logos require cloud media storage. Storing private API secrets (`CLOUDINARY_API_SECRET`) in client code creates severe security vulnerabilities.
- **Decision**: Route file uploads through `/api/upload` on the Express server (`server.ts`).
- **Rationale**:
  - Keeps privileged API secrets strictly on the server.
  - Allows server-side payload validation (100MB limit, file type inspection) before sending to Cloudinary.
- **Consequences**: Requires Node.js Express server to be operational.

---

## ADR 05: Configurable Academic Data over Static Constants

- **Status**: Accepted
- **Context**: Prototypes often hardcode lists of six subjects (*PF Theory, PF Lab, etc.*) and teacher names, creating brittle architectures when academic curricula or faculty assignments change.
- **Decision**: Design all UI and data models to treat subjects, credit hours, classes, sections, and faculty assignments as **dynamically configurable data entities**.
- **Rationale**:
  - Adding or removing courses does not require interface redesigns.
  - Unconfigured classes render informative empty states instead of invented mock data.
- **Consequences**: Static constants in `portalData.ts` are documented as temporary prototype seed data, with full dynamic configuration designated as the production architectural target.
