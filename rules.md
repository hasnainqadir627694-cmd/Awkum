# AWKUM ClassHub — Project Rules & Engineering Invariants

**Abdul Wali Khan University Mardan · Garden Campus**  
*Document Version: 2.1 · Status: Authoritative Non-Negotiable Specification*

> **Notice to all software engineers and AI coding agents:**  
> This document specifies the binding architectural invariants, security rules, and development discipline for AWKUM ClassHub. Violating any rule in this document undermines system security, data consistency, or user trust and is strictly prohibited.

---

## 1. Development Discipline & Architecture Preservation

### 1.1 Inspect Before Modifying
- Always inspect the actual codebase, component tree, and database schema before implementing changes.
- Never assume an API, package, database collection, or prop exists without verifying its declaration in the repository.
- Distinguish between **implemented code**, **prototype seed data**, and **planned architecture**.

### 1.2 Extend, Never Recreate
- AWKUM ClassHub is an existing, functioning multi-role system. **Never create a new project, delete the existing structure, or replace the framework**.
- Make focused, justified changes that solve the specific problem without breaking existing features.
- Preserve existing working routes, public-facing screens, Master Admin panels, and data models.

### 1.3 Prohibition of Fabricated Data & Mock Success (Strict No-Fake-Data Rule)
- **Never populate operational screens with fabricated users, fake attendance percentages, random mock rosters, or dummy reports**.
- Operational screens must render **real data** from Firestore and the backend API.
- If data is not yet recorded, display an appropriate and informative **empty state** (e.g., *"No students are assigned to this class yet"*, *"Attendance has not been recorded today"*, *"No attendance reports available"*).
- Never use random number generators (`Math.random()`) or mock arrays to make an incomplete screen look full.
- **Never display a success toast or notification before the underlying database write or API call has genuinely succeeded**.

### 1.4 Single Source of Truth
- Cloud Firestore and the server-authoritative backend (`server.ts`) constitute the persistent source of truth.
- Local storage may only be used for non-sensitive cached session restoration or explicit user UI preferences (e.g., device shell mode). It must never serve as an authoritative permission store.

---

## 2. Authentication vs. Authorization

### 2.1 Strict Separation of Concepts
- **Authentication**: Proves *who* the user is (handled via Firebase Authentication using email/password or Google sign-in, resolving a unique Firebase UID).
- **Authorization**: Determines *what* the authenticated user is permitted to do (governed by server-authoritative records in `crAssignments`, `users`, and `firestore.rules`).

### 2.2 Privilege Escalation Defense
- A client request claiming a role (e.g., `role: "cr"` or `role: "master_admin"`) is **untrusted by default**.
- Permissions must be evaluated against server-verified records bound to the user's authenticated UID and verified email.
- **Editing local storage, cookies, URL hashes, form inputs, or React component state must never grant elevated privileges**.
- If a client manually sets the browser URL hash to `#cr` without an active assignment in `crAssignments`, the client router must immediately redirect back to the Student Portal, and backend endpoints must return `403 Forbidden`.

---

## 3. Role-Based Access Control (RBAC) Invariants

### 3.1 Role Hierarchy

| Role | Authority Scope | Key Capabilities | Appointment Mechanism |
| :--- | :--- | :--- | :--- |
| **Master Admin** | System-Wide | User management, CR appointment/revocation, faculty assignments, system branding, audit logs. | Hardcoded root email: `hasnainbuilds724656@gmail.com`. |
| **Class Representative (CR)** | Assigned Class/Section Only (e.g., *BSCS 3A*) | Daily whole-class attendance marking, correction requests, PDF report generation, faculty alerts. | Appointed by Master Admin; bound to authenticated UID & Gmail. |
| **Student** | Personal Record Only | View timetable, personal attendance progress, download course documents, submit assignments. | Self-registration via verified email. |
| **Teacher / Faculty** | Assigned Subjects Only | Course materials upload, assignment grading, class announcements. | Appointed by Master Admin. |

### 3.2 Dual-Experience Model for Class Representatives
- Appointing a student as a Class Representative **adds the CR capability without deleting or replacing their Student role**.
- The user account maintains `roles: ['student', 'cr']` and `isCR: true`.
- The Student Portal remains completely accessible to the CR at all times.
- The CR can switch seamlessly between their Student Portal and the CR Workspace without logging out.

### 3.3 Revocation Invariant
- When the Master Admin revokes CR access:
  1. The assignment in `crAssignments` is marked `status: 'revoked'`.
  2. The user profile is updated to `isCR: false` and `role: 'student'`.
  3. Real-time listeners immediately hide the CR Control Panel button and banner.
  4. Any open CR session or modal is immediately terminated and redirected to the Student Portal.
  5. Subsequent backend requests to `/api/cr/verify-operation` return `403 Forbidden`.
  6. The underlying student account and its academic history remain completely intact.

---

## 4. Configurable Academic Data Invariants

### 4.1 No Hardcoded Academic Catalog Invariants
- **Subjects, courses, timetables, and teacher assignments must be configurable data entities**.
- No universal list of six subjects or specific instructor names may be treated as a permanent design invariant.
- Adding a new subject, modifying credit hours, reassigning instructors, or adding sections must be achievable via administrative data configuration without changing UI source code.

### 4.2 Class-Bound Permissions
- A Class Representative's authority is **strictly confined to their assigned section** (e.g., *BSCS 3A*).
- A CR from *BSCS 3A* must never be permitted to mark attendance, view rosters, or send alerts for *BSSE 1A*.
- The backend API (`server.ts`) must enforce class matching on every operation (`targetClass === activeAssignment.assignedClass`).

---

## 5. Attendance & Reporting Invariants

### 5.1 The Single Daily Record Policy
- **Exactly ONE attendance session exists per class/section per calendar day**.
- **Attendance is NOT recorded on a per-subject or per-lecture basis**.
- Daily sessions are keyed deterministically by class and ISO date: `${classId}_${YYYY-MM-DD}` (e.g., `BSCS_3A_2026-10-21`).
- Attempting to create a second session for the same class and date must be detected and rejected to prevent duplicate records.

### 5.2 Attendance Calculations
- Daily Session Attendance Rate:
  $$\text{Daily Rate} = \left( \frac{\text{Present Count}}{\text{Total Enrolled}} \right) \times 100$$
- Student Overall Attendance Percentage:
  $$\text{Student Overall Rate} = \left( \frac{\text{Personal Present Days}}{\text{Total Finalized Class Days}} \right) \times 100$$

### 5.3 Audit Trail on Corrections
- Once an attendance session is finalized, direct edits are locked.
- Amendments require a structured revision record documenting:
  - Timestamp of revision.
  - Identity of the editor.
  - Roll numbers changed.
  - Mandatory documented justification/reason.
- Revisions are incremented sequentially (e.g., `Rev #1`, `Rev #2`) and reflected on generated PDF reports.

### 5.4 Official A4 PDF Reports
- Official PDF reports must be generated exclusively from **real, saved database records**.
- Reports must include the university header, document reference ID, CR details, summary metrics, and full student roster table with status pills.
- PDF downloads must be protected and restricted to authorized accounts.

---

## 6. External Integrations & Storage Rules

### 6.1 Cloudinary Storage Rules
- Student assignment submissions and university branding assets are uploaded via secure server routes (`/api/upload`) or authenticated presets.
- Server-side Cloudinary credentials (`CLOUDINARY_API_SECRET`) must **never be exposed to the browser or committed to client bundles**.

### 6.2 Faculty Alert Invariants
- Teacher notifications must resolve the actual assigned instructor from the schedule.
- Alerts must be rate-limited with an active cooldown (minimum 60 seconds) to prevent spamming faculty.
- All dispatched alerts must be recorded in the database audit log.
- Do not indicate that an alert has been delivered or read unless verified by the system.

---

## 7. Security, Secrets & Testing

### 7.1 Secret Management
- Real API secrets, private keys, and service account tokens must **never be committed to Git**.
- `.env.example` must contain only descriptive placeholder values.
- Never prefix server-only secrets with `VITE_`.

### 7.2 Firebase Security Rules
- `firestore.rules` is the primary database security perimeter.
- Never weaken security rules (such as setting `allow read, write: if true;`) to bypass development errors.
- Always fix the client authorization or role query rather than degrading security rules.

### 7.3 Verification Before Deployment
- Before concluding any modification:
  1. Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
  2. Run `npm run build` (`vite build`) to verify bundle compilation.
  3. Verify RBAC enforcement (normal student denied, CR authorized, cross-class denied, revoked user denied).
