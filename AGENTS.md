# Instructions for Future AI Coding Sessions — AWKUM ClassHub

**Target Audience: LLM Coding Agents & Senior Engineers**  
*Document Version: 2.1 · Status: Mandatory System Directive*

---

## 1. Golden Rules for Automated Coding Agents

1. **Read Before Modifying**:
   Before modifying any file or proposing architecture changes, read:
   - `rules.md` (Mandatory engineering invariants and security constraints).
   - `architecture.md` (System map, component relationships, data flows).
   - `design.md` (Design system tokens, color hex codes, viewport ergonomics).
   - `DATA_MODEL.md` (Firestore collection schemas and field names).

2. **Inspect Existing Implementations First**:
   Always inspect real source files before assuming how a feature works. Never invent parallel contexts, duplicate services, or duplicate database collections.

3. **Strict No-Fake-Data Rule**:
   - **Never populate operational screens with fabricated users, random rosters, dummy reports, or mock percentages**.
   - If records are absent, display an informative **empty state** (e.g., *"No students are assigned to this class yet"*).
   - Never use `Math.random()` or hardcoded arrays to fake live university data.

4. **Configurable Academic Data**:
   - Subjects, classes, sections, and teacher assignments must be configurable data entities.
   - **Never hardcode a universal list of six subjects or fixed teacher mappings into application logic or design specifications**.

5. **Single Daily Whole-Class Attendance Record**:
   - Attendance is strictly recorded **once per class/section per calendar day**.
   - **Never create separate daily attendance records for individual subjects**.

6. **Dual-Experience Model for Class Representatives**:
   - An account granted CR access retains their Student role (`roles: ['student', 'cr']`).
   - The Student Portal must remain completely accessible to the CR.
   - The CR switches between Student Portal and CR Workspace without logging out.

7. **Never Weaken Security Rules**:
   - Never change `firestore.rules` to open permissions (e.g. `allow read, write: if true;`) to bypass errors.
   - Fix the client query, role resolution, or backend validation instead.

8. **Secret Discipline**:
   - Never expose `CLOUDINARY_API_SECRET` or service account keys in frontend bundles or commit them to Git.
   - Keep `.env.example` synchronized with safe placeholder values.

---

## 2. Standard Change Checklist

When working on any task in this repository:
1. **Locate & Read**: Identify the affected files and their imports.
2. **Implement Minimally & Safely**: Preserve existing functionality. Avoid unrelated refactors.
3. **Verify Type Safety**: Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
4. **Verify Compilation**: Run `npm run build` (`vite build`) to confirm production compilation.
5. **Update Documentation**: If you change or add an API, database collection, or workflow, update `DATA_MODEL.md`, `API_REFERENCE.md`, `CHANGELOG.md`, and `architecture.md`.
6. **Report Honestly**: State exactly what was changed, what was verified, and what remains untested.
