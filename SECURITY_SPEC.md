# AWKUM ClassHub — Security Architecture & RBAC Specification

## 1. Core Data Invariants & Security Principles

1. **Master Admin Authority Invariant**:
   Only the verified Master Administrator (`hasnainbuilds724656@gmail.com` / UID `97DtWk8axhfWOyi3hZfOcWgS0n92`) or a server-verified Master Admin account can grant, modify, or revoke roles (`teacher`, `cr`, `master_admin`).

2. **One Whole-Class Daily Attendance Record Invariant**:
   Attendance is recorded strictly **once per class/section per calendar day**.
   Only an authorized Class Representative (CR) with an active assignment for that specific class (`assignedClass`) or Master Admin can create/update attendance records for that section.

3. **Dual-Experience Identity Preservation for CRs**:
   Granting CR privileges adds `roles: ['student', 'cr']` and `isCR: true` while preserving full access to the Student Portal. Revoking CR access reverts role to `student` without deleting or corrupting the student profile.

4. **Teacher Subject Scope Boundary**:
   Faculty members granted `role: 'teacher'` can access the Teacher Panel and view/manage submissions and materials ONLY for their authorized `assignedSubjects`.

5. **Student Privacy & Submission Boundary**:
   Students can read/write ONLY their own assignment submissions and personal progress data. They cannot view or modify other students' private records.

6. **Immutable Identifier Protection**:
   `uid`, `email`, `createdAt`, `grantedBy`, and `performedBy` fields cannot be altered or spoofed after document creation.

---

## 2. The "Dirty Dozen" Threat Payloads & Security Checks

All 12 malicious payloads below MUST be PERMISSION_DENIED by Firestore Security Rules and Server Endpoints:

1. **Payload 1 (Self-Elevation Attack)**:
   Student sends `setDoc(/users/targetUid)` with `{ role: 'master_admin' }` or `{ isCR: true }`.
   *Result*: PERMISSION_DENIED.

2. **Payload 2 (Unassigned Attendance Marking)**:
   Student without active CR assignment attempts `addDoc(/attendanceSessions)` for `BSSE 1A`.
   *Result*: PERMISSION_DENIED.

3. **Payload 3 (Cross-Class CR Attendance Injection)**:
   CR assigned to `BSCS 3A` attempts `setDoc(/attendanceSessions/session_bsse_1a)` for `BSSE 1A`.
   *Result*: PERMISSION_DENIED.

4. **Payload 4 (Ghost Field Privilege Escalation)**:
   User updates profile with valid fields plus `{ "role": "teacher", "isVerifiedAdmin": true }`.
   *Result*: PERMISSION_DENIED (blocked by `affectedKeys()` whitelist).

5. **Payload 5 (Unauthenticated CR Grant via Endpoint)**:
   An unauthenticated caller or normal student posts to `/api/admin/grant-cr` with `{ adminEmail: "student@awkum.edu.pk" }`.
   *Result*: HTTP 403 Access Denied.

6. **Payload 6 (Student Submission Tampering)**:
   Student A sends `updateDoc(/submissions/student_b_sub)` modifying Student B's grade or feedback.
   *Result*: PERMISSION_DENIED.

7. **Payload 7 (Audit Log Alteration/Deletion)**:
   User sends `deleteDoc(/auditLogs/log123)` or `updateDoc(/auditLogs/log123)` attempting to scrub security logs.
   *Result*: PERMISSION_DENIED.

8. **Payload 8 (Identity Spoofing on User Registration)**:
   New user registers sending `{ email: "victim@awkum.edu.pk", uid: "different_uid", role: "master_admin" }`.
   *Result*: PERMISSION_DENIED.

9. **Payload 9 (Teacher Access Scope Bypass)**:
   Teacher assigned to `PF Theory` attempts to modify grading for `Data Structures`.
   *Result*: PERMISSION_DENIED.

10. **Payload 10 (Direct Storage Asset Tampering)**:
    Unauthenticated user attempts to write to private student assignment storage paths.
    *Result*: PERMISSION_DENIED.

11. **Payload 11 (Terminal State Lock Override)**:
    Non-admin user attempts to alter a finalized attendance sheet (`finalized: true`).
    *Result*: PERMISSION_DENIED.

12. **Payload 12 (Branding Configuration Scuttling)**:
    Non-admin student sends `setDoc(/config/branding)` overwriting logo URLs.
    *Result*: PERMISSION_DENIED.

---

## 3. Role & Permission Matrix

| Resource / Collection | Student | Class Representative (CR) | Teacher | Master Admin |
| :--- | :--- | :--- | :--- | :--- |
| **`/users/{uid}`** | Read own, Create (student role only), Update non-privileged fields | Read own, Create (student role only), Update non-privileged fields | Read own, Update non-privileged fields | Full Read / Write / Manage All |
| **`/crAssignments/{id}`** | Read own status | Read assigned class status | Read own status | Full Read / Write / Grant / Revoke |
| **`/teacherAssignments/{id}`** | No access | No access | Read own subject scope | Full Read / Write / Grant / Revoke |
| **`/attendanceSessions/{id}`** | Read own class attendance | Read & Write assigned class attendance sheets | Read assigned subjects/classes attendance | Full Read / Write / Override All |
| **`/submissions/{id}`** | Read/Create own submissions | Read/Create own submissions | Read & Grade assigned subject submissions | Full Read / Write / Manage All |
| **`/config/branding`** | Read Only | Read Only | Read Only | Full Read / Write |
| **`/auditLogs/{id}`** | Read No access, Create self actions | Read No access, Create self actions | Read No access, Create self actions | Read All, Append-Only (No Update/Delete) |
