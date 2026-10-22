# AWKUM ClassHub

**Abdul Wali Khan University Mardan · Department of Computer Science & Software Engineering**  
*Official Academic Portal, Attendance System & Class Representative Control Center*

[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-v13-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 1. Project Overview

**AWKUM ClassHub** is an academic management web application built for students, class representatives (CRs), faculty instructors, and administrators of Abdul Wali Khan University Mardan (AWKUM). 

It unifies daily academic workflows into a mobile-first, high-clarity interface inspired by the university's Garden Campus identity:
- **For Students**: Real-time daily timetable, Next Class countdown, enrolled subject courseware, assignment submissions with Cloudinary attachments, personal attendance progress charts, and university announcements.
- **For Class Representatives (CRs)**: A protected, high-efficiency Class Representative Workspace for recording single daily whole-class attendance, generating official A4 PDF reports, managing class student rosters, and dispatching faculty arrival alerts.
- **For Master Administrators**: Administrative Control Room (`hasnainbuilds724656@gmail.com`) for user role management, appointing and revoking CRs/teachers, configuring branding emblems, and monitoring security audit logs.
- **For Teachers / Faculty**: Advisory portal and subject syllabus coordination.

---

## 2. Key Documentation Index

All developers and coding agents must consult these authoritative specifications before making modifications:

| Document | Purpose & Scope |
| :--- | :--- |
| **[Architecture Documentation](architecture.md)** | Full-stack architecture, component trees, lifecycle diagrams, and integration boundaries. |
| **[Engineering Invariants & Rules](rules.md)** | Mandatory, non-negotiable development rules, RBAC invariants, and security requirements. |
| **[Design System Specification](design.md)** | Visual design tokens, typography, colors, component patterns, and viewport guidelines. |
| **[Database Schema (DATA_MODEL.md)](DATA_MODEL.md)** | Firestore collections, document structures, validation schemas, and relationships. |
| **[Firebase Setup Guide (FIREBASE_SETUP.md)](FIREBASE_SETUP.md)** | Configuration instructions for Firebase Authentication, Firestore, and Security Rules. |
| **[Security Policy (SECURITY.md)](SECURITY.md)** | RBAC threat model, authorization boundaries, privilege escalation defenses, and audit trails. |
| **[Verification & Testing (TESTING.md)](TESTING.md)** | Verification test matrix, automated test scripts, and test procedures. |
| **[Deployment Procedures (DEPLOYMENT.md)](DEPLOYMENT.md)** | Build instructions, static hosting, Express backend execution, and rule deployment. |
| **[AI Agent Instructions (AGENTS.md)](AGENTS.md)** | Fast onboarding guidelines and critical dos/don'ts for automated coding agents. |
| **[Change History (CHANGELOG.md)](CHANGELOG.md)** | Chronological record of major releases, bug fixes, and feature additions. |
| **[API Reference (API_REFERENCE.md)](API_REFERENCE.md)** | Contract for Express REST endpoints in `server.ts`. |
| **[Architectural Decisions (DECISIONS.md)](DECISIONS.md)** | Architectural Decision Records (ADRs) explaining key design choices. |

---

## 3. Technology Stack

- **Frontend Framework**: React 19 (`react`, `react-dom`)
- **Build System**: Vite 8 (`vite`, `@vitejs/plugin-react`)
- **Type Safety**: TypeScript (`typescript`, `tsconfig.json`)
- **Styling**: Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) via `@import "tailwindcss";`
- **Icons**: Lucide React (`lucide-react`)
- **Motion & Micro-interactions**: Motion (`motion`)
- **Document Generation**: jsPDF (`jspdf`, `jspdf-autotable`)
- **Backend Server**: Node.js v22 with Express (`express`, `tsx`)
- **Database & Authentication**: Firebase Web SDK v13 (`firebase`) and Firebase Admin SDK (`firebase-admin`)
- **Cloud Storage & CDN**: Cloudinary v2 (`cloudinary`)

---

## 4. Prerequisites & Environment Configuration

### Prerequisites
- Node.js version 20.x or 22.x
- npm version 9.x or higher

### Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```

| Variable | Description | Where Required | Safe Placeholder Example |
| :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key | Client | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Client | `awku-mardan.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firestore Project ID | Client & Server | `awku-mardan` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM Messaging sender ID | Client | `173788232652` |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | Client | `1:173788232652:web:...` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary account name | Client | `YOUR_CLOUD_NAME` |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset | Client | `YOUR_UPLOAD_PRESET` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Server | `YOUR_API_KEY` |
| `CLOUDINARY_API_SECRET` | Cloudinary Secret (Never expose to client) | Server | `YOUR_API_SECRET` |
| `PORT` | Express server port (defaults to 3000) | Server | `3000` |

---

## 5. Local Development Commands

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server (Express + Vite on port 3000)
npm run dev

# 3. Run TypeScript type-checking without emitting files
npm run lint

# 4. Compile production frontend bundle
npm run build

# 5. Preview production build locally
npm run preview
```

---

## 6. Default Master Admin Account

The Master Admin root credential is:
- **Email**: `hasnainbuilds724656@gmail.com`
- **Role**: `master_admin`
- **Scope**: Full system administration, user role assignment, CR appointments, and security audits.

---

## 7. Operational Services Note
- **Cloud Firestore**: Configured for project `awku-mardan`. Database security is enforced by `firestore.rules`.
- **Firebase Authentication**: Email/Password and Google sign-in enabled.
- **Cloudinary CDN**: Configured for document submissions and university crest assets.
