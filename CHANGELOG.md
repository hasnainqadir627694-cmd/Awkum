# Changelog — AWKUM ClassHub

All notable changes to the AWKUM ClassHub codebase are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.11.0] - 2026-10-26

### Added & Redesigned
- **Complete Redesign & Implementation of CR Schedule Planner (`CRSchedulePlannerView.tsx`)**:
  - Replaced the complicated, fragmented interface with an organized 4-section layout:
    1. **Current Weekly Schedule**: Overview card with live publication status, validity window (`startDate` to `endDate`), semester, total configured classes, and active weekdays.
    2. **Edit Timetable**: Intuitive weekday segmented strip (`Mon` to `Sun`) with per-day class tallies, quick "+ Add Class", and "Copy Day" schedule duplication.
    3. **Weekly Preview**: 7-day recurring overview chart displaying class sequences and teaching hours.
    4. **Review & Publish**: Pre-publication checklist modal with atomic Firestore persistence, version archiving, and audit log generation.
  - **Eliminated Manual Course Code & Title Entry**:
    - Completely removed manual text fields for Course Code and Subject Title.
    - Added an authoritative dropdown populated directly from Firebase `subjects` collection, scoped to the CR's authorized section with real-time search filtering.
    - Guaranteed that CRs cannot create duplicate or unregistered subjects.
  - **Automatic Active Teacher Resolution**:
    - Selecting a curriculum subject automatically resolves its authoritative teacher assignment from Firebase (`assignedTeacher`, `teacherUid`, `teacherEmail`).
    - Rendered as a read-only information badge with verified status; unassigned courses display clear "No Active Teacher Assigned" warnings.
  - **Tactile Vertical Scrolling Wheel Time Picker (`WheelTimePicker.tsx`)**:
    - Replaced static time presets with independent interactive vertical wheel pickers for Class Start Time and Class End Time (Hour, Minute, AM/PM).
    - Features centered selection lenses, optical gradient masks, touch drag with snap, mouse wheel scrolling, keyboard navigation, and micro-steppers.
  - **Robust Time Engine Upgrades (`scheduleEngine.ts`)**:
    - Upgraded `timeStringToMinutes` to seamlessly handle both 12-hour AM/PM and 24-hour formats with exact midnight/noon handling.
    - Added `formatMinutesTo12Hour` and `parse12HourTime` helpers.
  - **Secondary Utilities Segregation**:
    - Single-day cancellations and reschedules (`Schedule Overrides`) preserved in dedicated exceptions panel without altering future recurring weeks.
    - Validity period and historical version rollbacks maintained in clean secondary tabs.

---

## [2.10.0] - 2026-10-26

### Added & Fixed
- **Complete Firebase Account Lifecycle & Deletion Architecture**:
  - Implemented backend endpoint `POST /api/admin/delete-auth-user` authorizing Master Admin (`hasnainbuilds724656@gmail.com`) to delete accounts from Firebase Authentication, clean server memory maps, and invalidate sessions.
  - Implemented `deleteUserAccountCompletely` in `src/lib/authService.ts`:
    - Atomically revokes all active roles (`crAssignments`, `teacherAssignments`, `roleAssignments`).
    - Releases and vacates all assigned curriculum subjects via `vacateSubjectsForTeacher`, setting status to `Unassigned` while **preserving 100% of syllabus documents, assignments, student submissions, and attendance history**.
    - Invalidates active reservations and claimed invitations in `subjectInvitations`.
    - Backs up full record to `users_backup_archive` with audit metadata and purges from active `users` collection.
    - Recalculates `aggregates/userStats` without the deleted account and syncs in real time.
    - Emits `classhub_user_deleted` custom event and writes an immutable entry to `audit_logs`.
- **Distinct Operation Model in Admin Panel (`UserManagementView.tsx`)**:
  - **Operation A (Role Revocation)**: Revokes Faculty or CR role while preserving the user's Firebase Auth account and Student role. Vacates subjects safely.
  - **Operation B (Permanent Account Deletion)**: Explicit, art-directed confirmation modal displaying account name, email, verified Firebase UID, current role, and assigned subjects, with detailed impact warnings and academic preservation invariants.
- **Automated Multi-Layer Auth Reconciliation**:
  - Added endpoint `POST /api/admin/reconcile-auth` to clean expired reservations and stale states.
  - Added `reconcileAllAccountsWithAuth` in `src/lib/authService.ts` and toolbar "Reconcile Auth" button in `UserManagementView.tsx`.
  - Reconciles Firestore user profiles against active identities, archives orphaned documents, vacates orphaned teacher courses, and recomputes exact aggregates.
- **New UID Immunity**:
  - If a deleted email re-registers, Firebase issues a new UID. Hardened `resolveUserRole` and `normalizeUserRecord` so new UIDs start with a clean slate (student) and never inherit past roles or subject assignments based on email alone.
- **Strict Metric Calculations & Real-Time Aggregates**:
  - Fixed hardcoded `+ 238` offset in user table footer.
  - Updated `computeLocalStats` and `AdminDashboardOverview.tsx` to strictly filter out accounts with `status: 'deleted'` and maintain zero-overlap separation between teachers and students.

---

## [2.9.0] - 2026-10-25

### Added
- **Cryptographic Subject Teacher Invitation Credentials System**:
  - Replaced the retired Gmail-based teacher search & assignment dropdown with an automated subject-specific invitation credential workflow.
  - Automatically generates a unique, human-readable Subject Invitation Code (e.g., `CS101-7M9K2X`) and a 12-character high-entropy invitation password whenever Master Admin creates an unassigned subject.
  - Plaintext passwords are never stored in persistent storage: only SHA-256 cryptographic hex hashes are saved in the `subjectInvitations` collection.
  - Single-use and concurrency protection: invitations transition through `active` -> `reserved` -> `claimed` / `revoked`, permanently preventing duplicate claims or race conditions.
  - **Universal Login Integration**: Added a prominent mode toggle (`Existing Account Login | Join as Subject Teacher`) directly on the universal login screen (`LoginScreen.tsx`). No separate login page or detached portal URL was created.
  - **3-Step Invitation Claim & Faculty Onboarding Flow**:
    1. Credentials verification with live subject details confirmation from Firestore.
    2. Faculty registration with Firebase Authentication account creation / existing account linking.
    3. Mandatory Firebase email verification before atomic claim completion and Teacher Workspace routing.
  - **Master Admin Dashboard Controls**:
    - `SubjectsManagementView.tsx`: Automatic invitation modal popup upon subject creation with 1-click copy buttons; dynamic "Awaiting Teacher" status badge with invitation code in the curriculum list.
    - `TeacherAssignmentsView.tsx`: Real-time credentials inspection and regeneration for unassigned courses; verified teacher email, name, and assignment date display for active courses; explicit "Revoke Teacher Access" modal preserving all course documents and student submissions.
  - **Backend Endpoints (`server.ts`)**:
    - `POST /api/teacher-invitations/generate`: Cryptographic code & password generation with SHA-256 hashing.
    - `GET /api/teacher-invitations/by-subject`: Secure status retrieval.
    - `POST /api/teacher-invitations/verify`: Verification against stored SHA-256 hash.
    - `POST /api/teacher-invitations/reserve`: Email verification reservation.
    - `POST /api/teacher-invitations/claim`: Atomic assignment and role profile upgrade.
    - `POST /api/teacher-invitations/revoke`: Administrative revocation.

---

## [2.8.0] - 2026-10-25

### Fixed
- **Permanent CR Role Retention & Zero Auto-Revocation Enforcement**:
  - Removed all automatic revocation cascades when appointing new Class Representatives (`src/lib/authService.ts` and `server.ts`). An appointed CR remains active until the Master Administrator explicitly and manually invokes the Revocation workflow.
  - Resolved the Firestore ghost-revocation bug in real-time listeners: query snapshots in `unsubCRQuery` now only promote active CR assignments and never downgrade an account due to historical `status: 'revoked'` records.
  - Implemented timestamp precedence checking (`crAssignedAt >= crRevokedAt`) across `normalizeUserRecord`, `validateCRAssignmentOnServer`, and `/api/auth/validate-cr`, ensuring re-appointed CRs are never rejected by stale revocation flags.
  - Enforced canonical deterministic document IDs (`cr_${cleanEmail}`) in `server.ts` and pruned obsolete timestamped historical revocation records on assignment creation.
  - Updated `CRAssignmentsView.tsx` to display all active CRs per class section with individual health/acknowledgment badges and dedicated per-user manual revocation controls.

---

## [2.7.0] - 2026-10-24

### Added
- **Dedicated PWA Mobile App Branding Section in Master Admin (`BrandingAppearanceView.tsx`)**:
  - Separated branding into two independent controls:
    1. **Website & Portal Logo (ویب سائٹ و پورٹل لوگو)**: Governs web portal headers, login/register cards, side drawers, student/teacher/CR/admin layouts, and browser tab favicons.
    2. **Mobile App / PWA Icon (موبائل ایپ و پی ڈبلیو اے ہوم اسکرین آئیکن)**: Governs installed mobile phone application launcher icons on Android and iOS, splash launch screens, and dynamic `/manifest.json`.
  - Added dedicated preview widgets for both controls with 1:1 aspect ratio, `object-contain`, and transparent backgrounds with zero artificial borders, caging, or edge clipping.

### Fixed
- **Zero-Cropping PWA Launcher Icon Display**:
  - Replaced `"purpose": "maskable"` with `"purpose": "any"` across all manifest icon definitions (`/manifest.json` on Express server and `public/manifest.json`). This permanently prevents Android Chrome and mobile OS adaptive icon engines from zooming in by 20-40% and clipping the outer edges/sides of custom logos.
  - Provided direct raw image buffer writes to static launcher assets (`icon-192.png`, `icon-512.png`, `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`) preserving original alpha channels and dimensions without forced canvas padding.

---

## [2.6.0] - 2026-10-24

### Fixed
- **Root-Cause Diagnostic Fix — Global Logo Sync & Dynamic Branding Parity**:
  - Eliminated the dual-branding inconsistency between login screens, top navigation bars, and app shells.
  - Established the uploaded custom logo as the authoritative single source of truth across all application layers (Login, Register, Header, Teacher Portal, Admin Room, CR Workspace, Mobile Drawer, Modals, and Browser Tab/PWA icons).
  - Permanently removed the hardcoded AWKUM minaret archway SVG from `AwkumLogo.tsx` and `public/icon.svg`. In its place, implemented a clean, neutral academic placeholder that only appears if no logo has been configured.
  - Synchronized static PWA icons (`favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `og-image.png`) directly from the uploaded logo buffer.
  - Updated `index.html` to link to `/favicon.png` with dynamic timestamp cache-busting and synchronized OpenGraph and Twitter cards.
  - Enhanced Express `GET /api/branding` and server initialization to automatically load disk icons as fallback when Firestore documents are freshly provisioned.

---

## [2.5.0] - 2026-10-23

### Fixed
- **Firebase Authentication Registered Accounts Login ("Not Found" Bug)**:
  - Fixed `resolveUserRole` (`src/lib/authService.ts`) to query Firestore via multiple paths: primary UID document `users/{verifiedUid}`, email slug document `users/{email_slug}`, and collection queries by email and UID.
  - Implemented automatic, idempotent profile initialization: any authentic Firebase Auth user (`auth.currentUser` or verified UID) missing a Firestore document is immediately initialized with their student profile rather than being falsely rejected as "not found" / "not registered".
  - Fixed error handling in `LoginScreen.tsx` to stop swallowing Firebase Auth errors and accurately distinguish wrong password (`auth/wrong-password`, `auth/invalid-credential`), unverified email, rate limits, and non-existent accounts.
- **Admin Panel Live Search & Synchronization Communication**:
  - Eliminated the destructive background `deleteDoc` purge in `getAllRegisteredUsersFromFirestore` that was inadvertently removing valid Firestore user records.
  - Added backend search endpoint `GET /api/admin/search-users` in `server.ts` to bridge Cloud Firestore and Firebase Auth users via `admin.auth()`, auto-syncing any missing Auth accounts into Firestore.
  - Added live debounced search querying Firestore and the backend endpoint in `UserManagementView.tsx`, `TeacherAssignmentsView.tsx`, and `RoleAssignmentView.tsx`, so newly registered Firebase Auth accounts are immediately discoverable and selectable without requiring page reloads.
- **Firestore Security Rules**:
  - Enhanced `isOwner(userId)` helper in `firestore.rules` to correctly validate document ownership via `resource.data.email == request.auth.token.email` or `resource.data.uid == request.auth.uid`.

---

## [2.4.0] - 2026-10-23

### Added
- **Subject-Wise Teacher Assignment (4-Step Sequential Workflow)**:
  - *Step 1*: Filter, search, and select any genuine configured subject from Firestore.
  - *Step 2*: Scoped subject management workspace displaying subject code, name, credit hours, and active teacher status.
  - *Step 3*: Search teacher by exact registered Gmail from Firebase Auth user registry; validates verified UID and `emailVerified === true`.
  - *Step 4*: Binds permanent Firebase UID to subject (`subjectTeacherAssignments`), updates canonical `subjects/{subjectId}`, and keeps non-faculty roles intact.
- **Dynamic Multi-Subject Management in Teacher Portal (`TeacherLayout.tsx`)**:
  - Dynamically subscribes to all assigned subjects via `subscribeToTeacherAssignedSubjects({ uid, email })`.
  - Added dedicated Subject Switcher dropdown allowing teachers assigned to multiple courses to seamlessly toggle between workspaces.
  - Informative zero-fake-data empty state for verified faculty accounts awaiting subject allocation from Master Admin.
- **Student Document & Assignment Isolation (`App.tsx` & `teacherService.ts`)**:
  - Enforced `targetClass` tagging on published assignments, course documents, and notices.
  - Isolated student live feeds in `App.tsx` so students only receive materials relevant to their enrolled class/section.
- **Backend Endpoints (`server.ts`)**:
  - `POST /api/admin/assign-subject-teacher`
  - `POST /api/admin/revoke-subject-teacher`
  - `POST /api/admin/keep-subject-teacher-active`
- **Preserved Learning Resources Guarantee**: Revoking or reassigning teachers maintains all course documents, assignments, and student submissions attached to the canonical `subjectId`.

## [2.3.0] - 2026-10-22

### Added
- **Full Master Admin Academic Setup & Classes Management (`classService.ts` & `ClassesSectionsView.tsx`)**: Complete administrative workflow to create, inspect, deactivate, and safely manage university degree programs, classes, and sections in Cloud Firestore (`classes`).
- **Custom Curriculum Subject Authoring (`subjectService.ts` & `SubjectsManagementView.tsx`)**: Master Admin can define courses with custom titles, course codes, credit hours, program scopes, and descriptions.
- **Explicit Teacher Assignment Modal**: Assign verified registered faculty accounts to specific subjects with real-time Firestore sync and teacher profile reflection.
- **Dynamic Enrolled Student Class Selection on Registration**: Student registration (`LoginScreen.tsx` & `authService.ts`) now pulls from genuine active classes configured in Firestore; prevents hardcoded class assignments.
- **Enrolled Student Roster Modal**: Administrators can inspect real-time student rosters for any configured class section.
- **Safety Dependency Checks**: Classes with enrolled students and subjects with active curriculum cannot be accidentally deleted.

### Removed
- **Auto-Generated Default Academic Data**: Stripped all hardcoded baseline subjects (`INITIAL_SUBJECTS = []`, `OFFICIAL_SUBJECTS = []`, `SUBJECTS = []`), classes (`INITIAL_CLASSES = []`), static schedule items (`SCHEDULE_ITEMS = []`), and pre-assigned fake teachers.
- **Hardcoded Fallbacks**: Removed static `'BSSE 1A'` and `'BSCS 3A'` strings from student registration, attendance listeners, and role models.

### Changed
- **Zero-Fake Data & Empty States**: Clean, informative empty states across Classes & Sections, Subjects Management, Teacher Assignments, CR Assignments, Student Portal Classes screen, and Admin Overview cards.

---

## [2.2.0] - 2026-10-22

### Added
- **Four-Portal Unified Coordination System**: Master Admin, Teacher, Class Representative (CR), and Student Portals coordinate in real-time over persistent Cloud Firestore workspace records (`subjects`, `assignments`, `submissions`, `grades`, `attendanceSessions`, `documents`, `alerts`).
- **Teacher Replacement Continuity**: When a teacher is reassigned or replaced by Master Admin, all subject documents, published assignments, student submissions, and grades remain persistent and securely attached to the subject workspace.
- **CR Replacement Continuity**: When a CR is replaced, the incoming CR inherits the canonical whole-class daily attendance history (`attendanceSessions/${classId}_${date}`) and class roster without data loss.
- **Real-Time CR-to-Teacher Alert Notifications**: Added `subscribeToTeacherIncomingAlerts` to stream reminders in real time to the Teacher Portal dashboard banner.
- **Multi-Format In-Built Document Viewer (`DocumentPreviewModal.tsx`)**: In-built viewer supporting PDF documents (with responsive iframe), PPT/PPTX slide deck presentation mode with slide navigation and concept summaries, DOC/DOCX reader mode with zoom controls (70%–150%) and pagination, plus direct download.
- **Real-Time Curriculum Subject Management (`subjectService.ts`)**: Master Admin subject additions, edits, and teacher assignments synchronize directly to the Firestore `subjects` collection and reflect dynamically across all portals.
- **Student Submission & Grade Synchronization (`teacherService.ts` & `App.tsx`)**: Real-time tracking of student assignments, submitted work, grades, and teacher feedback.

### Changed
- **Account Status Persistence (`updateUserAccountStatus`)**: Master Admin suspensions and reactivations persist directly to Firestore `users/{email}` and `users/{uid}` with full audit logging.

---

## [2.1.0] - 2026-10-21

### Added
- **Interactive A4 Attendance PDF Preview Modal (`CRPdfModal.tsx`)**: Displays an authentic in-app preview of the official Abdul Wali Khan University Mardan attendance report with university headers, summary statistics, verified student roster table, and direct PDF download action.
- **Attendance Finalized & Saved Confirmation Dialog (Screen 09)**: Success dialog featuring three dedicated actions: *View PDF Report*, *Go to History*, and *Back to Dashboard*.
- **Class Representative Profile Screen (`CRProfileView.tsx`)**: Profile view displaying student details, active section badge, Master Admin governance notice, portal switching action, and sign-out control.
- **Dynamic Method Support on `/api/auth/validate-cr`**: Server endpoint now accepts both `GET` and `POST` requests, reading `email` and `uid` from request query parameters or request body.
- **Comprehensive Documentation Suite**: Created `README.md`, `DATA_MODEL.md`, `FIREBASE_SETUP.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `AGENTS.md`, `API_REFERENCE.md`, and `DECISIONS.md`. Upgraded `design.md`, `rules.md`, and `architecture.md`.

### Changed
- **Removed Hardcoded Subjects from `design.md`**: Stripped the static six-subject catalog from design documentation in compliance with the Configurable Academic Data architecture.
- **Repositioned CR Panel Dashboard Banner**: Moved the inline CR Panel launch card on `HomeScreen.tsx` directly below the Next Class card, matching Screen 04 of the reference storyboard.
- **Enforced Strict No-Fake-Data in Rosters**: Stripped all randomized fallback generators (`Math.random()`) from `classRosterData.ts`. If an assigned section has no enrolled students, views now render the required empty state: *"No students are assigned to this class yet."*
- **Empty State Enforcement in Attendance History**: Configured `CRAttendanceHistoryView.tsx` to render *"No attendance reports available."* when no records are present.

### Fixed
- **CR Panel Button Visibility After Role Grant**: Fixed the real-time role listener and elevation flow in `authService.ts` and `App.tsx` ensuring that granting CR access in Master Admin immediately reveals the CR Control Panel button in the hamburger menu (`SideDrawer.tsx`) and the inline card on `HomeScreen.tsx`.
- **Parameter Normalization on `/api/admin/grant-cr`**: Server now accepts either `assignedClass` or `targetClass` parameters interchangeably.

---

## [2.0.0] - 2026-10-20

### Added
- **Full-Stack Class Representative (CR) Panel**: Integrated the complete CR Workspace (`CRLayout.tsx`) with dashboard, student roster, single daily attendance marking, and faculty notifications.
- **Dual-Experience State Architecture**: Allows Class Representatives to toggle between the Student Portal and the CR Control Center seamlessly without logging out.
- **Server-Authoritative RBAC Endpoints**: Added `/api/auth/validate-cr`, `/api/admin/grant-cr`, `/api/admin/revoke-cr`, and `/api/cr/verify-operation` to `server.ts`.
- **Cloud Firestore RBAC Rules**: Deployed `firestore.rules` enforcing Master Admin exclusivity on `/crAssignments` and user role mutation guards.

---

## [1.0.0] - 2026-10-15

### Added
- **Initial Student Portal Baseline**: Core portal featuring Home dashboard, Next Class hero card, interactive semester timetable, enrolled classes document explorer, assignment submissions, personal attendance progress charts, and announcements.
- **Master Admin Control Room**: Initial administrative layout for user management and branding customization.
- **Cloudinary Integration**: Document and submission uploads proxied via server endpoint `/api/upload`.
