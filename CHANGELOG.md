# Changelog — AWKUM ClassHub

All notable changes to the AWKUM ClassHub codebase are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
