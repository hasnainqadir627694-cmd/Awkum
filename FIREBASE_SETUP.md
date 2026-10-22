# AWKUM ClassHub — Existing Firebase Configuration & Setup Guide

**Abdul Wali Khan University Mardan · Garden Campus**  
*Document Version: 2.1 · Status: Active Configuration Guide*

---

## 1. Existing Firebase Project Overview

AWKUM ClassHub uses the existing Firebase project:
- **Project ID**: `awku-mardan`
- **Auth Domain**: `awku-mardan.firebaseapp.com`
- **Firestore Database Location**: Default Cloud Firestore (Native mode)

> **CRITICAL RULE**: Do not create a new Firebase project or generate parallel configuration files. All features must integrate with this established project.

---

## 2. Applicable Services & Architecture

| Service | Role in AWKUM ClassHub | Where Handled | Security Boundary |
| :--- | :--- | :--- | :--- |
| **Firebase Authentication** | User sign-in, registration, password hashing, and Google popup authentication. | Client (`src/lib/firebase.ts`, `authService.ts`) | Generates secure JWT bearer tokens verified by Firebase infrastructure. |
| **Cloud Firestore** | Persistent document store for users, CR assignments, attendance sessions, notices, and audit logs. | Client (`src/lib/firebase.ts`) & Server (`server.ts`) | Client access governed by `firestore.rules`; server access uses Admin SDK. |
| **Firestore Security Rules** | Authoritative database-level access control. | `firestore.rules` (deployed via CLI) | Enforced on every Firestore read and write. |
| **Firebase Admin SDK** | Trusted server operations (Master Admin CR grants, audit logs, background tasks). | Server (`server.ts`) | Server runtime with privileged credentials. |
| **Cloudinary Storage** | Academic document and coursework attachment uploads. | Client & Server (`/api/upload`) | Server proxy protects API secrets. |

---

## 3. Configuration & Environment Variables

Firebase configuration is split into two security categories:

### 3.1 Frontend-Safe Client Configuration
These keys configure the browser client to connect to the Firebase project. They are safe to include in client bundles and are prefixed with `VITE_`:

```ini
# Client Firebase Keys (in .env)
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="awku-mardan.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="awku-mardan"
VITE_FIREBASE_MESSAGING_SENDER_ID="173788232652"
VITE_FIREBASE_APP_ID="1:173788232652:web:..."
```

*File location*: Loaded automatically by Vite from `.env` in local development and injected as runtime environment variables in production.

### 3.2 Privileged Server-Side Credentials
The Express server (`server.ts`) initializes `firebase-admin`. In production, it utilizes Google Cloud Application Default Credentials (ADC) or a Service Account JSON referenced via `GOOGLE_APPLICATION_CREDENTIALS`:

```ini
# Server Environment
FIREBASE_PROJECT_ID="awku-mardan"
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

> **NEVER** expose the Service Account JSON or `CLOUDINARY_API_SECRET` to the frontend bundle or commit them to Git.

---

## 4. Firebase Authentication Setup

### 4.1 Sign-in Methods Configured
1. **Email / Password**:
   - Enables standard student registration and login.
   - Self-registered users are assigned `role: 'student'` by default.
2. **Google Sign-In**:
   - Enabled via popup (`signInWithPopup(auth, new GoogleAuthProvider())`).
   - Normalizes student emails to lowercase.

### 4.2 Authorized Domains
In the Firebase Console (**Authentication** $\rightarrow$ **Settings** $\rightarrow$ **Authorized domains**), ensure the following domains are whitelisted:
- `localhost`
- `127.0.0.1`
- `awku-mardan.firebaseapp.com`
- `awku-mardan.web.app`
- Cloud Run / Applet production preview domains (e.g. `*.asia-southeast1.run.app`)

---

## 5. Cloud Firestore Rules Deployment

Database rules are maintained in `firestore.rules` at the root of the repository:

### Deployment Command
```bash
firebase deploy --only firestore:rules
```

### Core Security Rules Overview
- `/crAssignments/{id}`: Read permitted only to Master Admin or the assigned user whose UID/email matches; write permitted **exclusively to Master Admin**.
- `/users/{userId}`: Self-creation restricted to `role: 'student'`; updates restricted to non-privileged fields (cannot self-grant `isCR: true` or `role: 'cr'`).
- `/auditLogs/{id}`: Append-only for authenticated users; modifications and deletions forbidden (`allow update, delete: if false;`).
- `/branding/{id}`: Public read; write restricted to Master Admin.

---

## 6. Verification & Health Diagnostic Procedures

### 6.1 Verifying Project ID & Client Connection
In the browser console:
```javascript
// Test Firestore connectivity
import { db } from './src/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

const snap = await getDocs(query(collection(db, 'branding'), limit(1)));
console.log('Firestore connected successfully. Docs:', snap.docs.length);
```

### 6.2 Testing Common Permissions & Diagnosing Failures

| Error Code / Symptom | Root Cause | Diagnosis & Resolution |
| :--- | :--- | :--- |
| `permission-denied` on `/crAssignments` write | Non-admin account attempted to write role assignment. | Verify calling user is `hasnainbuilds724656@gmail.com`. Use `/api/admin/grant-cr` endpoint instead of direct client write. |
| `auth/unauthorized-domain` | Current preview or staging URL is not listed in Firebase Authorized Domains. | Add the host domain to Firebase Console under Authentication $\rightarrow$ Settings $\rightarrow$ Authorized domains. |
| `auth/user-not-found` or `auth/wrong-password` | Invalid user credentials during login. | Prompt user to verify credentials or use Google sign-in. |
| Stale role after grant | Client role cache not refreshed. | Ensure client subscribes to real-time `onSnapshot` via `subscribeToUserAccount` in `authService.ts`. |
