# Changelog — AWKUM ClassHub

All notable changes to the AWKUM ClassHub codebase are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
