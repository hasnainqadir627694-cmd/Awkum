# AWKUM ClassHub — Verification & Testing Guide

**Abdul Wali Khan University Mardan · Garden Campus**  
*Document Version: 2.1 · Status: Active Test Specification*

---

## 1. Testing Strategy Overview

AWKUM ClassHub verification is structured into three layers:
1. **Static Analysis & Type Verification**: Zero-tolerance policy for TypeScript compilation errors (`tsc --noEmit`).
2. **Automated RBAC & Full-Stack Integration Testing**: Scripted validation of server-authoritative API contracts (`server.ts`) covering grant, revocation, cross-class protection, and operation verification.
3. **Manual Interactive & Responsive Testing**: Step-by-step verification of UI workflows (mobile hamburger menu, inline dashboard cards, attendance marking, PDF report generation, and student submission).

---

## 2. Test Commands & Automation

```bash
# 1. TypeScript Static Typecheck
npm run lint

# 2. Production Bundle Compilation Check
npm run build

# 3. Full-Stack RBAC Lifecycle Integration Test
node -e "
const http = require('http');

function test(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('--- EXECUTING AWKUM CLASSHUB RBAC TEST SUITE ---');
  
  // Test 1: Normal student validation
  const t1 = await test('/api/auth/validate-cr?email=student@awkum.edu.pk');
  console.log('Test 1 (Normal student isCR=false):', t1.status === 200 && t1.body.isCR === false ? 'PASS' : 'FAIL');

  // Test 2: Normal student forbidden operation
  const t2 = await test('/api/cr/verify-operation', 'POST', { email: 'student@awkum.edu.pk', targetClass: 'BSCS 3A' });
  console.log('Test 2 (Normal student blocked 403):', t2.status === 403 ? 'PASS' : 'FAIL');

  // Test 3: Master Admin grants CR
  const t3 = await test('/api/admin/grant-cr', 'POST', {
    adminEmail: 'hasnainbuilds724656@gmail.com',
    targetEmail: 'test.cr@awkum.edu.pk',
    targetUid: 'uid-test-cr',
    targetName: 'Test CR',
    targetStudentId: '23CS9999',
    assignedClass: 'BSCS 3A'
  });
  console.log('Test 3 (Master admin grant 200):', t3.status === 200 ? 'PASS' : 'FAIL');

  // Test 4: Appointed CR validation
  const t4 = await test('/api/auth/validate-cr?email=test.cr@awkum.edu.pk');
  console.log('Test 4 (CR isCR=true, class=BSCS 3A):', t4.status === 200 && t4.body.isCR === true ? 'PASS' : 'FAIL');

  // Test 5: Authorized CR operation
  const t5 = await test('/api/cr/verify-operation', 'POST', { email: 'test.cr@awkum.edu.pk', uid: 'uid-test-cr', targetClass: 'BSCS 3A' });
  console.log('Test 5 (CR authorized 200):', t5.status === 200 && t5.body.authorized === true ? 'PASS' : 'FAIL');

  // Test 6: Cross-class isolation
  const t6 = await test('/api/cr/verify-operation', 'POST', { email: 'test.cr@awkum.edu.pk', uid: 'uid-test-cr', targetClass: 'BSSE 1A' });
  console.log('Test 6 (Cross-class blocked 403):', t6.status === 403 ? 'PASS' : 'FAIL');

  // Test 7: Master Admin revokes CR
  const t7 = await test('/api/admin/revoke-cr', 'POST', { adminEmail: 'hasnainbuilds724656@gmail.com', targetEmail: 'test.cr@awkum.edu.pk' });
  console.log('Test 7 (Master admin revoke 200):', t7.status === 200 ? 'PASS' : 'FAIL');

  // Test 8: Revoked CR blocked
  const t8 = await test('/api/cr/verify-operation', 'POST', { email: 'test.cr@awkum.edu.pk', uid: 'uid-test-cr', targetClass: 'BSCS 3A' });
  console.log('Test 8 (Revoked CR blocked 403):', t8.status === 403 ? 'PASS' : 'FAIL');
})();
"
```

---

## 3. Practical Verification Test Matrix

### Category A: Authentication & User Accounts

| Test ID | Scenario | Expected Outcome | Execution Type | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Standard student login with email/password | Successfully authenticates, routes to Student Portal. | Manual / Deployed | **Verified** |
| **AUTH-02** | Master Admin login (`hasnainbuilds724656@gmail.com`) | Routes to Master Admin Control Room. | Manual / Deployed | **Verified** |
| **AUTH-03** | Google popup authentication | User profile synchronized, lowercased email resolved. | Manual / Deployed | **Verified** |
| **AUTH-04** | Invalid password submission | Shows clear error feedback without crashing. | Manual | **Verified** |
| **AUTH-05** | Session restoration on reload | Remembered session restores without requiring re-login. | Automated / Manual | **Verified** |

### Category B: Class Representative Lifecycle & RBAC

| Test ID | Scenario | Expected Outcome | Execution Type | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CR-01** | Normal student logs in | CR button in drawer and banner on home are hidden. | Automated / Manual | **Verified** |
| **CR-02** | Normal student enters `#cr` in URL | System redirects to Student Portal; URL hash cleared. | Manual | **Verified** |
| **CR-03** | Master Admin grants CR access | Role saved to `crAssignments` & `users/{email}`; audit log written. | Automated (`server.ts`) | **Verified** |
| **CR-04** | Live CR elevation on student portal | Appointment modal appears; CR button appears in drawer and on home. | Manual | **Verified** |
| **CR-05** | CR switches to CR Workspace | CR Layout renders with dashboard, roster, attendance tools. | Manual | **Verified** |
| **CR-06** | CR switches back to Student Portal | Student Portal renders with timetable, assignments, progress. | Manual | **Verified** |
| **CR-07** | CR performs cross-class operation | Backend returns `403 Forbidden` (strictly class-isolated). | Automated (`server.ts`) | **Verified** |
| **CR-08** | Master Admin revokes CR access | Access immediately stripped; open CR view closed; subsequent calls return 403. | Automated / Manual | **Verified** |

### Category C: Attendance & Reporting

| Test ID | Scenario | Expected Outcome | Execution Type | Status |
| :--- | :--- | :--- | :--- | :--- |
| **ATT-01** | CR opens Attendance marking view | Enrolled roster loaded for assigned class; defaults to Present. | Manual | **Verified** |
| **ATT-02** | Bulk "Mark All Present" / "Mark All Absent" | Toggles all student statuses in real-time. | Manual | **Verified** |
| **ATT-03** | Finalize attendance session | Session saved to `attendanceSessions/{classId}_{date}`; duplicate prevented. | Manual / Deployed | **Verified** |
| **ATT-04** | Attendance Saved modal (Screen 09) | Displays metrics and 3 buttons (View PDF, Go to History, Back to Dashboard). | Manual | **Verified** |
| **ATT-05** | In-App A4 PDF Preview (Screen 10) | Displays printable university document, metrics, student table, download button. | Manual | **Verified** |
| **ATT-06** | Browser PDF Download | Generates clean A4 PDF file via `jsPDF` matching university standard. | Manual | **Verified** |
| **ATT-07** | Attendance History view (Screen 12) | Lists past sessions with percentages, revision pills, and in-app preview. | Manual | **Verified** |
| **ATT-08** | Attendance Correction workflow | Amends record with mandatory audit reason; increments revision tag. | Manual | **Verified** |

### Category D: UI, Design & Responsiveness

| Test ID | Scenario | Expected Outcome | Execution Type | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UI-01** | Smartphone viewport (375px–430px) | Navigation docked at bottom; zero horizontal scroll; touch targets $\ge 44\text{px}$. | Manual | **Verified** |
| **UI-02** | Device Frame Toggle | Wraps application into phone shell with speaker notch on desktop. | Manual | **Verified** |
| **UI-03** | Empty roster condition | Displays exact phrase: *"No students are assigned to this class yet."* | Manual | **Verified** |
| **UI-04** | Empty attendance history condition | Displays exact phrase: *"No attendance reports available."* | Manual | **Verified** |
| **UI-05** | Faculty Alert dispatch | Resolves instructor, respects 60s rate limit, records audit item. | Manual | **Verified** |
