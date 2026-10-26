# AWKUM ClassHub — Backend API Reference

**Abdul Wali Khan University Mardan · Garden Campus**  
*Document Version: 2.1 · Status: Active API Contract*

---

## 1. Overview & Base URL

The AWKUM ClassHub backend runs as an Express service on Node.js (`server.ts`).
- **Base URL**: `http://localhost:3000` (development) or the deployed service origin (production).
- **Content Type**: `application/json` (except static asset routes).
- **Authentication**: Role validation evaluated against the user's verified Firebase UID and email.

---

## 2. Authentication & RBAC Endpoints

### 2.1 Validate CR Status
Validates whether a given email address or Firebase UID has an active Class Representative assignment.

- **Route**: `ALL /api/auth/validate-cr` (Supports `GET` with query parameters or `POST` with JSON body)
- **Headers**: `Content-Type: application/json`
- **Parameters**:
  - `email` (string, optional): Target student email.
  - `uid` (string, optional): Target student Firebase Auth UID.
- **Success Response (Active CR)** — `200 OK`:
  ```json
  {
    "isCR": true,
    "assignedClass": "BSCS 3A",
    "status": "active",
    "assignment": {
      "id": "cr_user_awkum_edu_pk_1729500000",
      "uid": "97DtWk8axhfWOyi3hZfOcWgS0n92",
      "email": "user@awkum.edu.pk",
      "name": "Usman Ali Khan",
      "studentId": "23CS1001",
      "assignedClass": "BSCS 3A",
      "status": "active",
      "grantedAt": "2026-10-21T10:00:00.000Z",
      "grantedBy": "hasnainbuilds724656@gmail.com"
    }
  }
  ```
- **Success Response (Normal Student / Not CR)** — `200 OK`:
  ```json
  {
    "isCR": false,
    "assignedClass": null,
    "status": "none"
  }
  ```

---

### 2.2 Grant Class Representative Access
Grants Class Representative privileges to a registered student. Enforces that only the verified Master Administrator (`hasnainbuilds724656@gmail.com`) can authorize the assignment.

- **Route**: `POST /api/admin/grant-cr`
- **Authorization**: Caller must be Master Admin.
- **Request Body**:
  ```json
  {
    "adminEmail": "hasnainbuilds724656@gmail.com",
    "targetEmail": "student@awkum.edu.pk",
    "targetUid": "uid-optional-123",
    "targetName": "Usman Ali Khan",
    "targetStudentId": "23CS1001",
    "assignedClass": "BSCS 3A"
  }
  ```
  *(Note: Accepts either `assignedClass` or `targetClass`)*
- **Success Response** — `200 OK`:
  ```json
  {
    "success": true,
    "assignment": {
      "id": "cr_student_awkum_edu_pk_1729501234",
      "email": "student@awkum.edu.pk",
      "assignedClass": "BSCS 3A",
      "status": "active"
    },
    "message": "CR role successfully granted to student@awkum.edu.pk for BSCS 3A."
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: `Access Denied: Only the verified Master Administrator can grant Class Representative roles.`
  - `400 Bad Request`: `Missing target student Gmail or assigned class/section.`

---

### 2.3 Revoke Class Representative Access
Revokes Class Representative privileges from an account. Inactivates the assignment while preserving the underlying student profile and all historical attendance records.

- **Route**: `POST /api/admin/revoke-cr`
- **Authorization**: Caller must be Master Admin.
- **Request Body**:
  ```json
  {
    "adminEmail": "hasnainbuilds724656@gmail.com",
    "targetEmail": "student@awkum.edu.pk",
    "targetUid": "uid-optional-123",
    "reason": "End of academic semester term"
  }
  ```
- **Success Response** — `200 OK`:
  ```json
  {
    "success": true,
    "message": "CR role revoked. Student account preserved with normal Student Portal permissions.",
    "revokedAt": "2026-10-21T10:15:00.000Z"
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: `Access Denied: Only the verified Master Administrator can revoke Class Representative roles.`
  - `400 Bad Request`: `Target student email or UID required.`

---

### 2.4 Verify CR Operation
Server-side authorization check invoked before sensitive CR actions (attendance saving, PDF exports, roster queries). Validates that the caller has an active CR assignment and is assigned to the target class.

- **Route**: `POST /api/cr/verify-operation`
- **Request Body**:
  ```json
  {
    "email": "student@awkum.edu.pk",
    "uid": "uid-123",
    "targetClass": "BSCS 3A",
    "operation": "mark_attendance"
  }
  ```
- **Success Response** — `200 OK`:
  ```json
  {
    "authorized": true,
    "assignedClass": "BSCS 3A",
    "operation": "mark_attendance"
  }
  ```
- **Forbidden Responses** — `403 Forbidden`:
  - If user is not an active CR:
    ```json
    {
      "authorized": false,
      "error": "Forbidden: You do not have an active Class Representative assignment. CR access has been revoked or expired."
    }
    ```
  - If CR attempts an operation on a different class (e.g. BSCS 3A CR attempts BSSE 1A):
    ```json
    {
      "authorized": false,
      "error": "Forbidden: Your CR authorization is strictly restricted to BSCS 3A. You cannot perform operations on BSSE 1A."
    }
    ```

---

### 2.5 List All CR Assignments
Retrieves all active and historical CR assignments for administrative monitoring.

- **Route**: `GET /api/admin/cr-assignments?adminEmail=hasnainbuilds724656@gmail.com`
- **Success Response** — `200 OK`:
  ```json
  {
    "assignments": [
      {
        "id": "cr_student_awkum_edu_pk_1729501234",
        "email": "student@awkum.edu.pk",
        "assignedClass": "BSCS 3A",
        "status": "active"
      }
    ]
  }
  ```

---

## 3. Media & Storage Endpoints

### 3.1 Cloudinary File Upload Proxy
Handles server-side upload of student assignment submissions and university branding assets to Cloudinary.

- **Route**: `POST /api/upload`
- **Request Body**:
  ```json
  {
    "fileData": "data:application/pdf;base64,...",
    "fileName": "assignment_solution.pdf",
    "folder": "awkum_classhub/submissions"
  }
  ```
- **Success Response** — `200 OK`:
  ```json
  {
    "success": true,
    "url": "http://res.cloudinary.com/ehc1fewm/image/upload/...",
    "secureUrl": "https://res.cloudinary.com/ehc1fewm/image/upload/...",
    "publicId": "awkum_classhub/submissions/...",
    "format": "pdf",
    "bytes": 245100
  }
  ```
- **Error Response** — `500 Internal Server Error`:
  ```json
  {
    "error": "Cloudinary upload operation failed."
  }
  ```

---

## 4. Subject-Wise Teacher Assignment Endpoints

### 4.1 Assign Subject Teacher
Binds an authenticated faculty account's permanent Firebase UID to a specific curriculum subject. Preserves other account roles (Student/CR) and guarantees learning resource continuity.

- **Route**: `POST /api/admin/assign-subject-teacher`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "adminEmail": "hasnainbuilds724656@gmail.com",
    "subjectId": "subj_cs101",
    "teacherUid": "uid_abc123xyz",
    "teacherEmail": "faculty@gmail.com",
    "teacherName": "Engr. Tariq Khan"
  }
  ```
- **Success Response** — `200 OK`:
  ```json
  {
    "success": true,
    "assignmentId": "sta_subj_cs101_uid_abc123xyz_1729680000",
    "message": "Teacher Engr. Tariq Khan successfully assigned to subj_cs101."
  }
  ```

### 4.2 Revoke Subject Teacher Access
Revokes a faculty member's active management access from a specific subject. Never deletes or cascades removal to course documents, assignments, or student submissions.

- **Route**: `POST /api/admin/revoke-subject-teacher`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "adminEmail": "hasnainbuilds724656@gmail.com",
    "subjectId": "subj_cs101",
    "reason": "Department curriculum reallocation"
  }
  ```
- **Success Response** — `200 OK`:
  ```json
  {
    "success": true,
    "message": "Subject teacher access revoked for subj_cs101. All learning resources preserved."
  }
  ```

### 4.3 Keep Subject Teacher Active
Re-confirms active status for the currently assigned teacher without modifying historic IDs or re-uploading documents.

- **Route**: `POST /api/admin/keep-subject-teacher-active`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "adminEmail": "hasnainbuilds724656@gmail.com",
    "subjectId": "subj_cs101"
  }
  ```
- **Success Response** — `200 OK`:
  ```json
  {
    "success": true,
    "message": "Active teacher status confirmed for subj_cs101."
  }
  ```

---

### 4.4 Subject Teacher Invitation Credentials Endpoints

#### 4.4.1 Generate Subject Invitation
Generates a unique subject invitation code and 12-char cryptographic password. Stores only SHA-256 hex hash in Firestore (`subjectInvitations`), returning the plaintext code & password to Master Admin once for copying.

- **Route**: `POST /api/teacher-invitations/generate`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "adminEmail": "hasnainbuilds724656@gmail.com",
    "subjectId": "subj_cs101"
  }
  ```
- **Success Response** — `200 OK`:
  ```json
  {
    "success": true,
    "invitation": {
      "id": "sinv_subj_cs101_1729836000000",
      "invitationCode": "CS101-7M9K2X",
      "invitationPassword": "X7k!9q2#mP4L",
      "subjectId": "subj_cs101",
      "subjectName": "Programming Fundamentals",
      "subjectCode": "CS-101",
      "status": "active"
    }
  }
  ```

#### 4.4.2 Verify Subject Invitation Credentials
Verifies invitation code and plaintext password against stored SHA-256 hash. Enforces single-active-teacher policy and fetches verified subject details directly from Firestore.

- **Route**: `POST /api/teacher-invitations/verify`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "invitationCode": "CS101-7M9K2X",
    "invitationPassword": "••••••••••••"
  }
  ```
- **Success Response** — `200 OK`:
  ```json
  {
    "success": true,
    "invitation": {
      "id": "sinv_subj_cs101_1729836000000",
      "invitationCode": "CS101-7M9K2X",
      "subjectId": "subj_cs101",
      "status": "active"
    },
    "subject": {
      "id": "subj_cs101",
      "name": "Programming Fundamentals",
      "code": "CS-101",
      "creditHours": 4,
      "assignedClass": "BSCS 1st A"
    }
  }
  ```

#### 4.4.3 Reserve Subject Invitation (Pending Email Verification)
Locks the invitation during teacher email verification to prevent concurrent claims.

- **Route**: `POST /api/teacher-invitations/reserve`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "invitationId": "sinv_subj_cs101_1729836000000",
    "teacherEmail": "teacher@awkum.edu.pk"
  }
  ```

#### 4.4.4 Claim Subject Invitation
Independently validates that the Firebase Auth user has `emailVerified: true`, atomically marks the invitation `claimed`, updates the subject document to `Assigned`, registers `subjectTeacherAssignments`, updates the user's role profile to `teacher`, and writes an immutable audit record.

- **Route**: `POST /api/teacher-invitations/claim`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "invitationId": "sinv_subj_cs101_1729836000000",
    "teacherUid": "verified_firebase_uid",
    "teacherEmail": "teacher@awkum.edu.pk",
    "teacherName": "Dr. Muhammad Asim"
  }
  ```
- **Success Response** — `200 OK`:
  ```json
  {
    "success": true,
    "message": "Subject teacher claimed successfully.",
    "subjectId": "subj_cs101",
    "subjectName": "Programming Fundamentals"
  }
  ```

#### 4.4.5 Revoke Subject Invitation
Allows Master Admin to invalidate an active or pending invitation without touching existing course documents or submissions.

- **Route**: `POST /api/teacher-invitations/revoke`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "adminEmail": "hasnainbuilds724656@gmail.com",
    "invitationId": "sinv_subj_cs101_1729836000000",
    "reason": "Administrative reallocation"
  }
  ```

---

## 5. Diagnostics & Health Endpoint

### 5.1 System Health
Returns overall system status, active CR assignment count, and integration health.

- **Route**: `GET /api/health`
- **Response** — `200 OK`:
  ```json
  {
    "status": "healthy",
    "service": "AWKUM ClassHub Full-Stack API",
    "rbac": {
      "activeCRAssignments": 1,
      "masterAdmin": "hasnainbuilds724656@gmail.com"
    },
    "cloudinary": {
      "cloud_name": "ehc1fewm",
      "status": "connected"
    },
    "timestamp": "2026-10-21T10:00:00.000Z"
  }
  ```
