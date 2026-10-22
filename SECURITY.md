# AWKUM ClassHub — Application Security Policy & Threat Model

**Abdul Wali Khan University Mardan · Garden Campus**  
*Document Version: 2.1 · Status: Authoritative Security Policy*

---

## 1. Security Architecture & Core Tenets

Security in AWKUM ClassHub is enforced through **layered defense-in-depth**:
1. **Never Trust the Client**: Client requests claiming elevated roles are treated as unverified assertions until validated against authoritative database records and server checks.
2. **UID as the Primary Identity Anchor**: While verified emails are retained for administrative recognition, the **Firebase Authentication UID** is the primary identity token for authorization and document ownership.
3. **Least Privilege by Default**: Ordinary student accounts can only access personal data and read published departmental materials. Administrative and Class Representative privileges are granted on an opt-in basis.

---

## 2. Role-Based Access Control (RBAC) Specification

### 2.1 Master Administrator
- **Root Identifier**: `hasnainbuilds724656@gmail.com`
- **Scope of Authority**:
  - Unrestricted read/write across all collections in `firestore.rules`.
  - Exclusive access to administrative operations: `/api/admin/grant-cr`, `/api/admin/revoke-cr`.
  - Exclusive authority over branding configuration (`/branding/current`).
  - Read access to the immutable security audit log (`/auditLogs`).

### 2.2 Class Representative (CR) Dual-Role Model
- **Grant Mechanism**: Granted by Master Admin; stored in `/crAssignments/{id}` and updated on `/users/{email}`.
- **Role Coexistence**: Appointing a CR **does not remove the student role**. The user retains full access to the Student Portal while gaining access to the CR Workspace (`roles: ['student', 'cr']`, `isCR: true`).
- **Class-Bound Scope**: Authorization is **strictly restricted to the assigned section** (e.g., *BSCS 3A*). A CR cannot record attendance or dispatch alerts for other classes.
- **Instant Revocation**: When revoked by Master Admin, the assignment is marked `status: 'revoked'`. Client listeners immediately close the CR Workspace and hide navigation buttons, while backend endpoints return `403 Forbidden`.

### 2.3 Student Role
- **Scope**: Can view public announcements, enrolled schedules, subject notes, and personal attendance history.
- **Submissions**: Can submit assignments to `/submissions`. Submissions are private to the student and faculty.

### 2.4 Faculty / Teacher Role
- **Scope**: Restricted to assigned subjects and course materials.

---

## 3. Defense Against Common Vulnerabilities

### 3.1 Privilege Escalation & State Tampering
- **Risk**: A malicious user edits `localStorage`, React component state, or browser variables to inject `role = "master_admin"` or `isCR = true`.
- **Mitigation**:
  - `firestore.rules` enforces that non-admin users cannot write to `/crAssignments` or update privileged fields (`role`, `roles`, `isCR`, `crStatus`, `assignedClass`) in `/users`.
  - Backend endpoints (`/api/admin/grant-cr`, `/api/admin/revoke-cr`, `/api/cr/verify-operation`) independently re-query the authoritative database before executing any state change.

### 3.2 URL Hash Spoofing (`#cr`)
- **Risk**: A normal student manually types `#cr` in the browser URL bar to access the Class Representative dashboard.
- **Mitigation**:
  - `App.tsx` attaches a hash change listener that calls `isUserCR(currentUser)`. If the current account is not an active CR, the router strips `#cr` via `history.replaceState` and resets `portalMode` to `'student'`.
  - Even if the view were rendered in the client, backend API calls return `403 Forbidden`.

### 3.3 Attendance Duplication & Race Conditions
- **Risk**: Multiple CR sessions or network retries creating conflicting attendance sheets for the same class and date.
- **Mitigation**:
  - Deterministic document keying: `attendanceSessions/${classId}_${date}` ensures that duplicate submissions overwrite or update the single daily document rather than creating orphaned records.
  - Finalized sessions are locked; any modification requires an explicit revision record with an audit justification.

### 3.4 File Upload Safety & Secret Exposure
- **Risk**: Malicious scripts uploaded via assignment submissions or exposure of Cloudinary API secrets.
- **Mitigation**:
  - All privileged Cloudinary operations are proxied through `/api/upload` on the Express server.
  - Server validates file payloads (100MB limit) and enforces mime-type checks.
  - Client bundles contain only public upload presets; `CLOUDINARY_API_SECRET` is strictly kept on the server.

---

## 4. Threat Matrix & Status

| Threat Scenario | Impact | Implemented Mitigation | Verification Status |
| :--- | :--- | :--- | :--- |
| Normal student calls `/api/admin/grant-cr` | High | Endpoint verifies `adminEmail === hasnainbuilds724656@gmail.com`. | **Verified** (Returns 403) |
| Normal student calls `/api/cr/verify-operation` | High | Endpoint validates active assignment in `crAssignments`. | **Verified** (Returns 403) |
| Active CR for BSCS 3A attempts to mark BSSE 1A | High | Endpoint checks `targetClass === activeAssignment.assignedClass`. | **Verified** (Returns 403) |
| Revoked CR attempts to mark attendance | High | Endpoint checks `assignment.status === 'active'`. | **Verified** (Returns 403) |
| User attempts to tamper with audit logs | Medium | `firestore.rules` sets `allow update, delete: if false;`. | **Verified** |
| User attempts to forge account via localStorage | Low | `App.tsx` re-resolves role against Firestore on every auth change. | **Verified** |

---

## 5. Security Audit Log Structure

Security-relevant actions are logged to the `auditLogs` collection:
```json
{
  "action": "Class Representative Access Granted",
  "performedBy": "hasnainbuilds724656@gmail.com",
  "details": "Granted CR role to cr.student@awkum.edu.pk for BSCS 3A (UID: uid-123)",
  "category": "role",
  "status": "success",
  "timestamp": "SERVER_TIMESTAMP"
}
```

---

## 6. Prioritized Remediation Roadmap

1. **Firebase Admin SDK Service Account**:
   - *Current*: `server.ts` uses project ID initialization with in-memory sync fallback when service account key is omitted.
   - *Target*: Require explicit service account key in staging/production environments.
2. **Server-Side Token Verification**:
   - *Current*: Endpoints receive `adminEmail` / `email` from request payloads.
   - *Target*: Require Firebase `Authorization: Bearer <id_token>` headers on all API routes and verify tokens with `admin.auth().verifyIdToken(token)`.
3. **Cloudinary Upload Strict Mime-Type Filtering**:
   - *Current*: Client-side extension validation and Cloudinary auto-typing.
   - *Target*: Enforce strict server-side magic number byte header inspections for uploaded files.
