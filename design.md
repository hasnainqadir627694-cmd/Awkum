# AWKUM ClassHub — Design System & Visual Specification

**Abdul Wali Khan University Mardan · Garden Campus**  
*Document Version: 2.1 · Status: Active Specification*

---

## 1. Product Identity & Design Philosophy

AWKUM ClassHub is the official student companion and academic operational portal designed for Abdul Wali Khan University Mardan (AWKUM). It balances academic prestige with everyday utility, structured around a simple mandate:

> **Information first. Minimum effort. Maximum clarity.**

A student or class representative using this application must be able to glance at their screen and immediately answer:
1. **Next Class**: What is my next class, where is it, and who is teaching?
2. **Attendance Integrity**: What is my verified class attendance record today?
3. **Materials & Tasks**: Which new lecture materials or assignments need attention?
4. **Official Notices**: What urgent administrative or departmental updates have been posted?

---

## 2. Configurable Academic Data Principles

### Dynamic vs. Hardcoded Data
The design system separates the **visual container** from the **academic content**:
- **Subjects, classes, sections, and teacher assignments are dynamic entities**, not permanent UI invariants.
- Adding, renaming, reassigning, or removing a subject or course instructor must **never require UI redesign or template modification**.
- UI cards and tables dynamically format whatever subject or instructor payload is retrieved from the data source.
- When an academic record, timetable, or student list has not yet been configured, the UI must render an **informative empty state** rather than fallback mock arrays or invented placeholders.

### Implementation Limitation Note
*In the current prototype codebase (`src/data/portalData.ts`), initial seed constants (`SUBJECTS`, `SCHEDULE_ITEMS`) exist to support development previews. In the production architecture, these collections are dynamically managed through Firestore and the Master Admin configuration workflows. UI components must treat static arrays solely as optional development fallbacks, never as authoritative production catalogs.*

---

## 3. Color Palette & Semantic Tokens

The visual identity is drawn directly from the academic atmosphere of AWKUM's Garden Campus—combining warm earth tones, ivory cream surfaces, and deep espresso brown typography:

### Core Palette

| Token Name | Hex Code | Tailwind Equivalent | Purpose / Application |
| :--- | :--- | :--- | :--- |
| **Warm Canvas** | `#F8F0E5` | `bg-[#F8F0E5]` | Primary applet canvas and background. |
| **Sand Canvas Alt** | `#EFE3D3` | `bg-[#EFE3D3]` | Secondary page background, outer wrapper shell. |
| **Ivory Surface** | `#FFF9F1` / `#FFFDF9` | `bg-[#FFF9F1]` | Cards, dialog modals, dropdowns, input containers. |
| **Deep Espresso** | `#493222` | `bg-[#493222]` | Primary interactive buttons, navigation highlights, badge pills. |
| **Espresso Dark** | `#38271C` | `text-[#38271C]` | Primary typography, headings, high-contrast labels. |
| **Muted Earth** | `#806A56` | `text-[#806A56]` | Secondary text, timestamps, captions, subtle icons. |
| **Beige Border** | `#E6D8C7` | `border-[#E6D8C7]` | Structural card outlines, table gridlines, separators. |
| **Olive Green** | `#668064` | `text-[#668064]` | Present attendance, verified status, active progress pills. |
| **Olive Surface** | `#EAF2E9` | `bg-[#EAF2E9]` | Background surface for present tags, active status cards. |
| **Terra Cotta Red** | `#C84B31` | `text-[#C84B31]` | Absent attendance, overdue alerts, urgent notices, errors. |
| **Red Surface** | `#FDE8E4` | `bg-[#FDE8E4]` | Background surface for absent tags, destructive action alerts. |
| **Warning Amber** | `#856404` | `text-[#856404]` | Attendance revision notices, pending changes. |
| **Amber Surface** | `#FFF3CD` | `bg-[#FFF3CD]` | Revision banners and audit highlight cards. |

---

## 4. Typography Hierarchy & System

AWKUM ClassHub employs a dual-typography strategy:
- **Display & Academic Authority**: Classic serif (`font-serif`, Times/Georgia style) reserved for the university emblem, official report headers, and modal appointment titles.
- **Interface & Operational Usability**: Clean modern sans-serif (`font-sans`, Inter/system fallback) with deliberate weight steps for scanning and rapid data entry.

### Type Scale

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | 20px / 24px (`text-xl` sm:`text-2xl`) | Bold (`font-bold`) | Tight (`leading-tight`) | Screen headers, modal titles. |
| **Section Title** | 16px / 18px (`text-base` sm:`text-lg`) | Bold (`font-bold`) | Snug (`leading-snug`) | Card titles, subject names. |
| **Card Subtitle** | 13px / 14px (`text-xs` sm:`text-sm`) | Semi-bold (`font-semibold`) | Normal (`leading-normal`) | Metadata, instructor names, rooms. |
| **Body Text** | 12px (`text-xs`) | Medium (`font-medium`) | Relaxed (`leading-relaxed`) | Instructions, descriptions, notices. |
| **Caption / Badge** | 10px / 11px (`text-[10px]` / `text-[11px]`) | Bold (`font-bold`) | Tight (`leading-tight`) | Status pills, table headers, counts. |
| **Tabular Numbers** | 18px–28px (`text-lg` to `text-3xl`) | Extra-bold (`font-extrabold`) | None (`leading-none`) | Attendance percentages, counts. |

---

## 5. Spacing, Radii, Shadows & Icons

### Border Radii
- **Input & Mini Controls**: `rounded-xl` (12px)
- **Cards & Data Containers**: `rounded-2xl` (16px)
- **Hero Containers & Major Modals**: `rounded-3xl` (24px)
- **Status Pills & Chips**: `rounded-full` (9999px)

### Elevation & Shadows
- **Card Surfaces**: Subtle tactile shadow `shadow-xs` / `shadow-2xs` with a 1px border of `#E6D8C7`.
- **Primary Buttons & Modals**: Medium elevation `shadow-md` to establish clear z-axis hierarchy.
- **Fixed Navigation**: Backdrop-blur overlay (`backdrop-blur-md`) with 95% opacity.

### Iconography Rules
- **Library**: `lucide-react` (standard stroke width `stroke-[1.8]` for standard states, `stroke-[2.2]` for active navigation).
- **Proportions**: Standard icons are 16px (`w-4 h-4`) or 20px (`w-5 h-5`).
- **No Random Emojis**: Emojis are forbidden as primary interface controls or navigation icons.

---

## 6. Responsive Layout & Viewport Ergonomics

1. **Smartphone Viewport Focus**: Built mobile-first for 375px–430px displays (iPhone 13–16, Samsung Galaxy, Pixel).
2. **Device Frame Shell**: Optional desktop emulation mode wrapping the portal into a 430px smartphone frame with a simulated speaker notch.
3. **Desktop Adaptability**: When expanded beyond 640px, the layout centers cleanly inside a `max-w-2xl` container, preserving thumb reachability and preventing awkward horizontal stretching.
4. **Touch Targets**: All interactive elements (buttons, nav tabs, present/absent toggles) have a minimum touch footprint of **44 × 44px**.

---

## 7. Component Specifications

### 7.1 Buttons & Interactive Controls
- **Primary Action**: Solid `#493222` background, `#FFF9F1` text, `rounded-xl`, subtle active scale `active:scale-95`.
- **Secondary Action**: Bordered `#E6D8C7`, `#FFF9F1` surface, `#38271C` text, hover `#F8F0E5`.
- **Destructive Action**: `#C84B31` text or `#FDE8E4` surface with red outline.
- **Disabled State**: Opacity 50%, `cursor-not-allowed`, zero hover transform.

### 7.2 Status Badges & Pills
- **Present / Verified**: `#668064` text on `#EAF2E9` background.
- **Absent / Overdue**: `#C84B31` text on `#FDE8E4` background.
- **Pending / In-Progress**: `#806A56` text on `#EFE3D3` background.
- **Active Role / CR**: `#FFF9F1` text on `#493222` background with gold/amber accent.

### 7.3 Data Tables (Rosters & Records)
- Clean, uncluttered layout with alternating rows (`bg-white` and `bg-[#F8F0E5]/40`).
- Clear numeric alignment for Roll Numbers, Counts, and Percentages.
- Right-aligned interactive actions (Present/Absent switches, PDF download icons).
- Always include explicit empty states when no records match filter criteria.

---

## 8. Screen & Workflow Guidelines

### 8.1 Shared Authentication (`LoginScreen.tsx`)
- Unified login screen serving Students, Class Representatives, Faculty, and Administrators.
- Supports email/password authentication and Google Popup sign-in.
- Validates user role securely on completion and routes to the appropriate portal.

### 8.2 Student Portal (`HomeScreen.tsx`, `ScheduleScreen.tsx`, `ClassesScreen.tsx`, `AssignmentsScreen.tsx`, `ProgressScreen.tsx`)
- **Docked Bottom Navigation**: 5 core tabs (Home, Schedule, Classes, Assignments, Progress) with indicator dots.
- **Next Class Hero Card**: Deep espresso background displaying real upcoming class, room, countdown pill, and full schedule link.
- **Class Representative Card (Screen 4)**: Visible **only to authorized CRs**, positioned directly below Next Class. Clean beige container with shield badge, section tag, and chevron.
- **Metrics Grid**: Four clean 2-column cards displaying Attendance %, New Uploads, Pending Tasks, and Total Enrolled Classes.
- **Assignments Workflow**: Filterable by status (To Do, Submitted, Overdue). Includes submission modal supporting text answers, Cloudinary file uploads, and timestamped submission receipts.
- **Personal Attendance**: Real-time progress chart displaying overall percentage, finalized sessions count, and personal attendance history.

### 8.3 Class Representative Workspace (`CRLayout.tsx`)
- **Dual-Experience Model**: An authorized CR switches between the Student Portal and CR Workspace with one tap; their normal student view is never deleted or replaced.
- **CR Dashboard**: Real-time session status hero card (*"Today Finalized"* vs *"Attendance Pending"*), quick action tiles, and upcoming class instructor alert card.
- **Attendance Marking View**: Enforces the **single daily whole-class attendance invariant**. Allows bulk *"Mark All Present"* / *"Mark All Absent"*, individual toggles, search filtering, and review modal.
- **Attendance Saved Dialog (Screen 9)**: Modal showing summary metrics and three distinct action buttons: *View PDF Report*, *Go to History*, *Back to Dashboard*.
- **In-App A4 Attendance Report Preview (Screen 10)**: Modal rendering an authentic A4 printable report with official university header, metadata boxes, summary statistics, and verified student roster table.
- **Attendance History View (Screen 12)**: Chronological list of daily sessions with status pills, revision history badges, in-app report preview, and direct PDF download.
- **Faculty Alert Workflow (Screen 11)**: Class selector resolving the instructor, automated template preview, rate-limit cooldown, and audit log.
- **CR Profile (Screen 13)**: Student credentials, active section badge, Master Admin governance notice, portal switch button, and secure sign-out.

### 8.4 Hamburger Navigation Menu (`SideDrawer.tsx`)
- Slide-out drawer with profile header, academic links, account settings, PWA install prompt, and university support contacts.
- **Bottom CR Control Panel Entry**: Distinct navigation button at the bottom separated by a subtle divider, visible only to authorized active CR accounts.

---

## 9. Attendance Visual Invariants

1. **One Daily Record Per Section**: Attendance is recorded once per section per calendar day. It is **never recorded separately for each individual subject**.
2. **Visual Status Continuity**:
   - $\ge 75\%$ Attendance: Displayed in Olive Green (`#668064`).
   - $< 75\%$ Attendance: Displayed in Terra Cotta Red (`#C84B31`) as an attendance warning.
3. **Finalized Locking**: Finalized sessions are visually locked with a checkmark badge. Revisions require entering the formal correction workflow and documenting an audit reason.

---

## 10. Accessibility & Ergonomics Standards

- **Color Contrast**: All text combinations satisfy WCAG AA contrast standards ($\ge 4.5:1$ for body text, $\ge 3:1$ for bold headers).
- **Visible Focus**: All keyboard-navigable controls feature clear focus rings (`focus:ring-2 focus:ring-[#493222]`).
- **Screen Reader Support**: All icon-only buttons include descriptive `aria-label` or `title` attributes.
- **Motion Reduction**: All transitions respect user OS preferences via `motion/react` spring configurations and CSS transitions.
