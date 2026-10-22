import { AdminUser, UserRole, UserStatus, INITIAL_USERS, AuditLogItem } from '../data/adminData';
import { db, auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  onSnapshot,
  DocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';

export const MASTER_ADMIN_EMAIL = 'hasnainbuilds724656@gmail.com';

export interface AuthResolutionResult {
  success: boolean;
  user?: AdminUser;
  role?: UserRole;
  error?: string;
  isSuspended?: boolean;
}

export interface StudentRegistrationInput {
  fullName: string;
  fatherName: string;
  email: string;
  password?: string;
  department: string;
}

// In-memory registered users pool, initialized with pre-existing directory
let registeredUsersPool: AdminUser[] = [...INITIAL_USERS];

export function getRegisteredUsers(): AdminUser[] {
  return registeredUsersPool;
}

/**
 * Normalizes a user record from Firestore document data
 */
export function normalizeUserRecord(docId: string, data: any): AdminUser {
  const email = (data?.email || (docId.includes('_') ? docId.replace(/_/g, '.') : docId)).trim();
  const rawRole = (data?.role as string) || 'student';
  const crStatus = (data?.crStatus as ('active' | 'revoked' | 'none' | undefined)) || undefined;
  
  // Strict revocation enforcement: if revoked, role cannot be CR
  const effectiveRole: UserRole =
    crStatus === 'revoked' && rawRole === 'cr'
      ? 'student'
      : (['master_admin', 'teacher', 'cr', 'student'].includes(rawRole) ? (rawRole as UserRole) : 'student');

  const isCR = Boolean(
    crStatus === 'active' ||
    (crStatus !== 'revoked' && (data?.isCR || rawRole === 'cr' || (Array.isArray(data?.roles) && data.roles.includes('cr'))))
  );

  return {
    id: data?.id || `u-${docId}`,
    uid: data?.uid || data?.firebaseUid || (docId.startsWith('uid_') ? docId : undefined),
    name: data?.name || data?.fullName || 'Registered Student',
    email: email,
    studentId: data?.studentId || data?.rollNo || data?.rollNumber || undefined,
    role: effectiveRole,
    roles: Array.isArray(data?.roles) && data.roles.length > 0
      ? (crStatus === 'revoked' ? data.roles.filter((r: string) => r !== 'cr') : data.roles)
      : (isCR ? ['student', 'cr'] : [effectiveRole]),
    isCR: isCR && crStatus !== 'revoked',
    crStatus: crStatus || (isCR ? 'active' : 'none'),
    status: (['active', 'pending', 'suspended'].includes(data?.status) ? data.status : 'active') as UserStatus,
    registeredDate:
      data?.registeredDate ||
      (data?.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Recently Registered'),
    lastLogin: data?.lastLogin?.toDate ? data.lastLogin.toDate().toLocaleDateString() : data?.lastLogin,
    avatarUrl: data?.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`,
    assignedSubjects: Array.isArray(data?.assignedSubjects) ? data.assignedSubjects : undefined,
    assignedClass: data?.assignedClass || (isCR ? 'BSCS 3A' : undefined),
    phone: data?.phone,
    department: data?.department || 'Software Engineering',
    fatherName: data?.fatherName,
    semester: data?.semester || '1st Semester',
    crAssignedAt: data?.crAssignedAt,
    crAssignedBy: data?.crAssignedBy,
    crRevokedAt: data?.crRevokedAt,
    crRevocationReason: data?.crRevocationReason,
    crAcknowledged: data?.crAcknowledged,
    isFirebaseUser: true,
  };
}

/**
 * Merges base directory users with live Firebase users (Firestore takes precedence)
 */
export function mergeUsers(baseUsers: AdminUser[], firestoreUsers: AdminUser[]): AdminUser[] {
  const map = new Map<string, AdminUser>();

  // Add initial/base users
  baseUsers.forEach((u) => {
    if (u && u.email) {
      map.set(u.email.toLowerCase(), u);
    }
  });

  // Overlay Firestore users (Firestore is source of truth)
  firestoreUsers.forEach((u) => {
    if (u && u.email) {
      const existing = map.get(u.email.toLowerCase());
      map.set(u.email.toLowerCase(), {
        ...(existing || {}),
        ...u,
        isFirebaseUser: true,
      });
    }
  });

  return Array.from(map.values());
}

/**
 * Fetches all registered users from Cloud Firestore users collection
 */
export async function getAllRegisteredUsersFromFirestore(): Promise<AdminUser[]> {
  if (!db) {
    return registeredUsersPool;
  }

  try {
    const snap = await getDocs(collection(db, 'users'));
    const firestoreUsers: AdminUser[] = [];
    snap.forEach((docSnap) => {
      if (docSnap.exists()) {
        firestoreUsers.push(normalizeUserRecord(docSnap.id, docSnap.data()));
      }
    });

    const merged = mergeUsers(INITIAL_USERS, firestoreUsers);
    registeredUsersPool = merged;
    return merged;
  } catch (err: any) {
    console.info('[Auth Service] Fetch all users from Firestore notice:', err?.message || err);
    return registeredUsersPool;
  }
}

// Active subscribers to all registered users (Master Admin real-time synchronization)
const userSubscribers = new Set<(users: AdminUser[]) => void>();

export function notifyUserSubscribers(users: AdminUser[]) {
  userSubscribers.forEach((cb) => {
    try {
      cb([...users]);
    } catch (e) {
      console.warn('[Auth Service] User subscriber callback notice:', e);
    }
  });
}

/**
 * Subscribes to real-time updates for all registered users in Firebase Firestore.
 * Automatically keeps Master Admin in sync when new students register or roles change.
 */
export function subscribeToAllUsers(
  onUpdate: (users: AdminUser[]) => void
): () => void {
  userSubscribers.add(onUpdate);

  // Immediately notify with current in-memory pool so UI updates with 0 latency
  onUpdate([...registeredUsersPool]);

  if (!db) {
    return () => {
      userSubscribers.delete(onUpdate);
    };
  }

  try {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const firestoreUsers: AdminUser[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            firestoreUsers.push(normalizeUserRecord(docSnap.id, docSnap.data()));
          }
        });

        const merged = mergeUsers(INITIAL_USERS, firestoreUsers);
        registeredUsersPool = merged;
        notifyUserSubscribers(merged);
      },
      (error: FirestoreError) => {
        console.info('[Auth Service] All users listener notice:', error.message);
        onUpdate(registeredUsersPool);
      }
    );

    return () => {
      userSubscribers.delete(onUpdate);
      unsubscribe();
    };
  } catch (err) {
    console.info('[Auth Service] Subscribe to all users notice:', err);
    return () => {
      userSubscribers.delete(onUpdate);
    };
  }
}

/**
 * Server-authoritative check verifying if an account currently has an active, valid CR assignment.
 * Checks server endpoint and Firestore crAssignments collection.
 */
export async function validateCRAssignmentOnServer(
  uid?: string,
  email?: string
): Promise<{ isCR: boolean; assignedClass: string | null; status: 'active' | 'revoked' | 'none'; assignment?: any }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUid = (uid || '').trim();

  // 1. Check server-side Express authorization API
  try {
    const res = await fetch('/api/auth/validate-cr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: cleanUid, email: cleanEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.info('[Auth Service] Server API check notice:', err);
  }

  // 2. Query Firestore crAssignments collection
  if (db && (cleanEmail || cleanUid)) {
    try {
      const crCol = collection(db, 'crAssignments');
      if (cleanUid) {
        const snap = await getDocs(query(crCol, where('uid', '==', cleanUid), where('status', '==', 'active')));
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          return { isCR: true, assignedClass: docData.assignedClass, status: 'active', assignment: docData };
        }
      }
      if (cleanEmail) {
        const snap = await getDocs(query(crCol, where('email', '==', cleanEmail), where('status', '==', 'active')));
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          return { isCR: true, assignedClass: docData.assignedClass, status: 'active', assignment: docData };
        }
      }
    } catch (err) {
      console.info('[Auth Service] Firestore crAssignments check notice:', err);
    }
  }

  return { isCR: false, assignedClass: null, status: 'revoked' };
}

/**
 * Server-authoritative check verifying if an account currently has an active, valid Teacher assignment.
 * Checks server endpoint and Firestore teacherAssignments collection.
 */
export async function validateTeacherAssignmentOnServer(
  uid?: string,
  email?: string
): Promise<{ isTeacher: boolean; assignedSubjects: string[]; status: 'active' | 'revoked' | 'none'; assignment?: any }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUid = (uid || '').trim();

  // 1. Check server-side Express authorization API
  try {
    const res = await fetch('/api/auth/validate-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: cleanUid, email: cleanEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.info('[Auth Service] Server teacher API check notice:', err);
  }

  // 2. Query Firestore teacherAssignments collection
  if (db && (cleanEmail || cleanUid)) {
    try {
      const teacherCol = collection(db, 'teacherAssignments');
      if (cleanUid) {
        const snap = await getDocs(query(teacherCol, where('uid', '==', cleanUid), where('status', '==', 'active')));
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          return { isTeacher: true, assignedSubjects: docData.assignedSubjects || [], status: 'active', assignment: docData };
        }
      }
      if (cleanEmail) {
        const snap = await getDocs(query(teacherCol, where('email', '==', cleanEmail), where('status', '==', 'active')));
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          return { isTeacher: true, assignedSubjects: docData.assignedSubjects || [], status: 'active', assignment: docData };
        }
      }
    } catch (err) {
      console.info('[Auth Service] Firestore teacherAssignments check notice:', err);
    }
  }

  return { isTeacher: false, assignedSubjects: [], status: 'revoked' };
}

/**
 * Validates a CR operation on the server before execution
 */
export async function verifyCROperationOnServer(
  uid: string | undefined,
  email: string | undefined,
  targetClass: string,
  operation: string
): Promise<{ authorized: boolean; error?: string }> {
  try {
    const res = await fetch('/api/cr/verify-operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email, targetClass, operation }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        authorized: false,
        error: errorData?.error || 'Operation forbidden: CR access revoked or expired.',
      };
    }
    return { authorized: true };
  } catch (err: any) {
    const fallback = await validateCRAssignmentOnServer(uid, email);
    if (fallback.isCR && fallback.assignedClass?.toLowerCase() === targetClass.toLowerCase()) {
      return { authorized: true };
    }
    return {
      authorized: false,
      error: 'CR authorization check failed. Access denied.',
    };
  }
}

/**
 * Validates and resolves an authenticating user's role and account status.
 * Reconciles with server-authoritative CR and Teacher records on every login.
 */
export async function resolveUserRole(
  identifier: string,
  _password?: string,
  verifiedUid?: string
): Promise<AuthResolutionResult> {
  const cleanId = identifier.trim().toLowerCase();

  // 1. Initial Master Admin verification
  if (cleanId === MASTER_ADMIN_EMAIL.toLowerCase()) {
    let adminRecord: AdminUser = {
      id: 'u-admin-master',
      uid: verifiedUid || 'uid_master_admin',
      name: 'Hasnain Qadir',
      email: MASTER_ADMIN_EMAIL,
      role: 'master_admin',
      status: 'active',
      registeredDate: 'Oct 01, 2026',
      department: 'Central Administration / IT Directorate',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    };

    if (db) {
      try {
        const userDocRef = doc(db, 'users', 'master_admin');
        const emailDocRef = doc(db, 'users', MASTER_ADMIN_EMAIL.replace(/[@.]/g, '_'));
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'suspended') {
            return {
              success: false,
              isSuspended: true,
              error: 'This administrative account has been suspended. Please contact IT Security.',
            };
          }
          adminRecord = { ...adminRecord, ...data } as AdminUser;
        } else {
          await setDoc(userDocRef, {
            ...adminRecord,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
        }
        await setDoc(emailDocRef, {
          ...adminRecord,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.info('[Auth Service] Master Admin Firestore check notice:', err);
      }
    }

    return {
      success: true,
      user: adminRecord,
      role: 'master_admin',
    };
  }

  // 2. Validate current server-authorized CR & Teacher assignments
  const [crVerdict, teacherVerdict] = await Promise.all([
    validateCRAssignmentOnServer(verifiedUid, cleanId),
    validateTeacherAssignmentOnServer(verifiedUid, cleanId),
  ]);

  // 3. Find registered user in memory or Firestore
  let matchedUser = registeredUsersPool.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      (u.studentId && u.studentId.toLowerCase() === cleanId) ||
      (verifiedUid && u.uid === verifiedUid)
  );

  if (!matchedUser && db && cleanId.includes('@')) {
    try {
      const userDocRef = doc(db, 'users', cleanId.replace(/[@.]/g, '_'));
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        matchedUser = normalizeUserRecord(snap.id, snap.data());
      }
    } catch (err) {
      console.info('[Auth Service] Remote user lookup notice:', err);
    }
  }

  if (matchedUser) {
    if (matchedUser.status === 'suspended') {
      return {
        success: false,
        isSuspended: true,
        error: 'Your account has been suspended by the university administration. Please visit the CS Department / IT Center.',
      };
    }

    // Attach verified UID if not present
    if (verifiedUid && !matchedUser.uid) {
      matchedUser = { ...matchedUser, uid: verifiedUid };
    }

    // Reconcile role strictly with server authorization:
    // If server reports active Teacher assignment -> grant Teacher role
    // Else if server reports active CR assignment -> grant CR role
    // Else -> strictly set to student role
    if (teacherVerdict.isTeacher) {
      matchedUser = {
        ...matchedUser,
        role: 'teacher',
        roles: Array.from(new Set([...(matchedUser.roles || ['student']), 'teacher'])),
        teacherStatus: 'active',
        assignedSubjects: teacherVerdict.assignedSubjects.length > 0 ? teacherVerdict.assignedSubjects : (matchedUser.assignedSubjects || []),
      };
    } else if (crVerdict.isCR && crVerdict.assignedClass) {
      matchedUser = {
        ...matchedUser,
        role: 'cr',
        roles: ['student', 'cr'],
        isCR: true,
        crStatus: 'active',
        assignedClass: crVerdict.assignedClass,
      };
    } else {
      matchedUser = {
        ...matchedUser,
        role: matchedUser.role === 'teacher' && matchedUser.teacherStatus === 'active' ? 'teacher' : 'student',
        roles: matchedUser.role === 'teacher' && matchedUser.teacherStatus === 'active' ? ['teacher'] : ['student'],
        isCR: false,
        crStatus: crVerdict.status === 'revoked' ? 'revoked' : 'none',
        teacherStatus: teacherVerdict.status === 'revoked' ? 'revoked' : (matchedUser.teacherStatus || 'none'),
      };
    }

    // Update in memory pool
    registeredUsersPool = registeredUsersPool.map((u) =>
      u.email.toLowerCase() === cleanId ? matchedUser! : u
    );

    return {
      success: true,
      user: matchedUser,
      role: matchedUser.role,
    };
  }

  // 4. If student is not registered, strictly prevent login
  return {
    success: false,
    error: 'Account not registered. If you are a new student, please click "Register New Account" below to register for the 1st semester.',
  };
}

/**
 * Registers a new student account:
 * - Collects Full Name, Father's Name, Email, Password, Department (Software Engineering)
 * - Automatically registers the student in 1st Semester (Fall 2026)
 * - Auto-generates Roll Number / Student ID (e.g. 26SE1042)
 */
export async function registerStudentAccount(
  input: StudentRegistrationInput
): Promise<AuthResolutionResult> {
  const cleanEmail = input.email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      success: false,
      error: 'Please enter a valid university or personal email address.',
    };
  }

  if (!input.fullName.trim()) {
    return {
      success: false,
      error: 'Please enter your full name.',
    };
  }

  if (!input.fatherName.trim()) {
    return {
      success: false,
      error: "Please enter your father's name.",
    };
  }

  // Check if account already exists
  const existing = registeredUsersPool.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    return {
      success: false,
      error: 'An account with this email address is already registered. Please sign in.',
    };
  }

  // Auto-generate roll number for 1st Semester Software Engineering
  const randomRoll = Math.floor(1000 + Math.random() * 9000);
  const studentId = `26SE${randomRoll}`;

  let firebaseUid: string | undefined;
  if (auth && input.password) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, input.password);
      firebaseUid = cred.user.uid;
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        console.info('[Auth Service] Email verification dispatch notice:', e);
      }
    } catch (authErr: any) {
      if (authErr?.code === 'auth/email-already-in-use') {
        return {
          success: false,
          error: 'An account with this email address already exists in Firebase Authentication. Please sign in.',
        };
      }
      console.info('[Auth Service] Firebase Auth creation notice:', authErr?.code || authErr?.message);
    }
  }

  const newStudent: AdminUser = {
    id: `u-student-${Date.now()}`,
    uid: firebaseUid || auth?.currentUser?.uid || `uid_${cleanEmail.replace(/[@.]/g, '_')}`,
    name: input.fullName.trim(),
    fatherName: input.fatherName.trim(),
    email: cleanEmail,
    studentId,
    role: 'student',
    roles: ['student'],
    status: 'active',
    registeredDate: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    department: input.department || 'Software Engineering',
    semester: '1st Semester',
    assignedClass: 'BSSE 1A',
    avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`,
    isFirebaseUser: true,
  };

  // Add to active memory directory
  registeredUsersPool.unshift(newStudent);
  notifyUserSubscribers(registeredUsersPool);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('classhub_user_registered', { detail: newStudent }));
  }

  // Persist to Cloud Firestore
  if (db) {
    try {
      const userDocRef = doc(db, 'users', cleanEmail.replace(/[@.]/g, '_'));
      await setDoc(userDocRef, {
        ...newStudent,
        createdAt: serverTimestamp(),
      }, { merge: true });

      if (firebaseUid) {
        const uidDocRef = doc(db, 'users', firebaseUid);
        await setDoc(uidDocRef, {
          ...newStudent,
          createdAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.info('[Auth Service] User saved to session. Remote Firestore notice:', err);
    }
  }

  // Record immutable audit log
  await recordAuditLog({
    action: 'New Student Registered',
    performedBy: cleanEmail,
    details: `${newStudent.name} S/D of ${newStudent.fatherName} (${newStudent.studentId}) registered in ${newStudent.department} (1st Semester)`,
    category: 'user',
    status: 'success',
  });

  return {
    success: true,
    user: newStudent,
    role: 'student',
  };
}

/**
 * Dispatches an immutable administrative audit log entry
 */
export async function recordAuditLog(
  item: Omit<AuditLogItem, 'id' | 'timestamp'>
): Promise<void> {
  if (db) {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        ...item,
        timestamp: serverTimestamp(),
        date: new Date().toISOString(),
      });
    } catch (err) {
      console.info('[Audit Service] Firestore audit record notice:', err);
    }
  }
}

/**
 * Grants Class Representative (CR) privileges to an existing student account.
 * Follows server-enforced rules:
 * - One active CR per class/section: automatically revokes previous CR for that class.
 * - Adds CR role while PRESERVING student role and full Student Portal access.
 * - Persists to crAssignments collection bound to verified Firebase Auth UID and Gmail.
 * - Updates Firestore users/{uid}, roleAssignments, and audit logs.
 */
export async function grantCRAccess(
  adminEmail: string,
  targetEmailOrId: string,
  assignedClass: string,
  targetUid?: string
): Promise<{ success: boolean; user?: AdminUser; previousCR?: AdminUser; error?: string }> {
  const cleanAdmin = adminEmail.trim().toLowerCase();
  const cleanTarget = targetEmailOrId.trim().toLowerCase();
  const cleanClass = assignedClass.trim();

  // 1. Authorize Master Admin
  if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: 'Unauthorized: Only the Master Administrator has authority to appoint Class Representatives.',
    };
  }

  // 2. Find target student
  let targetUser = registeredUsersPool.find(
    (u) =>
      u.email.toLowerCase() === cleanTarget ||
      (u.studentId && u.studentId.toLowerCase() === cleanTarget)
  );

  if (!targetUser && db) {
    try {
      const snap = await getDoc(doc(db, 'users', cleanTarget.replace(/[@.]/g, '_')));
      if (snap.exists()) {
        targetUser = normalizeUserRecord(snap.id, snap.data());
      }
    } catch (err) {
      console.info('[Auth Service] User fetch notice:', err);
    }
  }

  if (!targetUser) {
    return {
      success: false,
      error: 'Target student account not found in university directory. Student must be registered first.',
    };
  }

  const effectiveUid = targetUid || targetUser.uid || `uid_${cleanTarget.replace(/[@.]/g, '_')}`;

  // 3. Find if another student is currently assigned as CR for this class -> Revoke previous CR
  let previousCR: AdminUser | undefined;
  registeredUsersPool = registeredUsersPool.map((u) => {
    if (u.assignedClass === cleanClass && (u.role === 'cr' || u.isCR) && u.email.toLowerCase() !== targetUser!.email.toLowerCase()) {
      previousCR = { ...u, role: 'student', isCR: false, roles: ['student'], crStatus: 'revoked' };
      // Persist revocation of previous CR to Firestore
      if (db) {
        setDoc(doc(db, 'users', u.email.replace(/[@.]/g, '_')), previousCR, { merge: true }).catch(() => {});
        setDoc(
          doc(db, 'crAssignments', `cr_${u.email.replace(/[@.]/g, '_')}`),
          {
            status: 'revoked',
            revokedAt: new Date().toISOString(),
            revokedBy: cleanAdmin,
            revocationReason: `Replaced by ${targetUser!.name} as CR for ${cleanClass}`,
          },
          { merge: true }
        ).catch(() => {});
      }
      return previousCR;
    }
    return u;
  });

  if (previousCR) {
    await recordAuditLog({
      action: 'CR Assignment Replaced',
      performedBy: adminEmail,
      details: `${previousCR.name} (${previousCR.email}) replaced by ${targetUser.name} as CR for ${cleanClass}`,
      category: 'role',
      status: 'warning',
    });
  }

  // 4. Update target student with active CR privileges
  const grantedAt = new Date().toISOString();
  const updatedUser: AdminUser = {
    ...targetUser,
    uid: effectiveUid,
    role: 'cr',
    roles: ['student', 'cr'],
    isCR: true,
    crStatus: 'active',
    assignedClass: cleanClass,
    crAssignedAt: grantedAt,
    crAssignedBy: adminEmail,
    crAcknowledged: false, // Triggers confirmation dialog on first view
  };

  // Update in memory pool & notify
  registeredUsersPool = registeredUsersPool.map((u) =>
    u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u
  );
  if (!registeredUsersPool.some((u) => u.email.toLowerCase() === updatedUser.email.toLowerCase())) {
    registeredUsersPool.push(updatedUser);
  }
  notifyUserSubscribers(registeredUsersPool);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('classhub_user_role_changed', { detail: updatedUser }));
  }

  // 5. Persist to Cloud Firestore: crAssignments (binding verified UID + Gmail) & users
  const assignmentDocId = `cr_${cleanTarget.replace(/[@.]/g, '_')}`;
  const assignmentRecord = {
    id: assignmentDocId,
    uid: effectiveUid,
    email: cleanTarget,
    name: updatedUser.name,
    studentId: updatedUser.studentId || '',
    assignedClass: cleanClass,
    status: 'active',
    grantedAt,
    grantedBy: adminEmail,
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
  };

  if (db) {
    try {
      await setDoc(doc(db, 'crAssignments', assignmentDocId), assignmentRecord);
      const userDocRef = doc(db, 'users', updatedUser.email.replace(/[@.]/g, '_'));
      await setDoc(userDocRef, updatedUser, { merge: true });

      if (effectiveUid && !effectiveUid.startsWith('uid_')) {
        await setDoc(doc(db, 'users', effectiveUid), updatedUser, { merge: true }).catch(() => {});
      }

      // Save to roleAssignments history collection
      await addDoc(collection(db, 'roleAssignments'), {
        userId: updatedUser.id,
        userEmail: updatedUser.email,
        userName: updatedUser.name,
        role: 'cr',
        assignedClass: cleanClass,
        assignedBy: adminEmail,
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      console.warn('[Auth Service] Firestore sync notice:', err?.message || err);
    }
  }

  // 6. Call backend server authorization endpoint
  fetch('/api/admin/grant-cr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adminEmail,
      targetUid: effectiveUid,
      targetEmail: cleanTarget,
      targetName: updatedUser.name,
      targetStudentId: updatedUser.studentId,
      assignedClass: cleanClass,
    }),
  }).catch(() => {});

  // Record audit log
  await recordAuditLog({
    action: 'Class Representative Appointed',
    performedBy: adminEmail,
    details: `${updatedUser.name} (${updatedUser.email}) granted CR privileges for ${cleanClass}`,
    category: 'role',
    status: 'success',
  });

  return {
    success: true,
    user: updatedUser,
    previousCR,
  };
}

/**
 * Revokes CR access from a user while preserving their normal student account.
 * Updates crAssignments (marking status 'revoked') and users (reverting role to 'student').
 */
export async function revokeCRAccess(
  adminEmail: string,
  targetEmail: string,
  reason = 'Admin revocation'
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const cleanAdmin = adminEmail.trim().toLowerCase();
  const cleanTarget = targetEmail.trim().toLowerCase();

  if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: 'Unauthorized: Only Master Administrator can revoke CR privileges.',
    };
  }

  const targetUser = registeredUsersPool.find((u) => u.email.toLowerCase() === cleanTarget);
  if (!targetUser) {
    return { success: false, error: 'User account not found.' };
  }

  const revokedAt = new Date().toISOString();
  const revertedUser: AdminUser = {
    ...targetUser,
    role: 'student',
    roles: ['student'],
    isCR: false,
    crStatus: 'revoked',
    crRevokedAt: revokedAt,
    crRevocationReason: reason,
  };

  registeredUsersPool = registeredUsersPool.map((u) =>
    u.email.toLowerCase() === cleanTarget ? revertedUser : u
  );
  notifyUserSubscribers(registeredUsersPool);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('classhub_user_role_changed', { detail: revertedUser }));
  }

  if (db) {
    try {
      const assignmentDocId = `cr_${cleanTarget.replace(/[@.]/g, '_')}`;
      await setDoc(
        doc(db, 'crAssignments', assignmentDocId),
        {
          status: 'revoked',
          revokedAt,
          revokedBy: adminEmail,
          revocationReason: reason,
        },
        { merge: true }
      );

      const userDocRef = doc(db, 'users', cleanTarget.replace(/[@.]/g, '_'));
      await setDoc(userDocRef, revertedUser, { merge: true });

      if (targetUser.uid && !targetUser.uid.startsWith('uid_')) {
        await setDoc(doc(db, 'users', targetUser.uid), revertedUser, { merge: true }).catch(() => {});
      }
    } catch (err) {
      console.info('[Auth Service] Revoke sync notice:', err);
    }
  }

  // Sync revocation across active sessions via server-side endpoint
  fetch('/api/admin/revoke-cr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adminEmail,
      targetUid: targetUser.uid,
      targetEmail: cleanTarget,
      reason,
    }),
  }).catch(() => {});

  await recordAuditLog({
    action: 'CR Privileges Revoked',
    performedBy: adminEmail,
    details: `Revoked CR role from ${targetUser.name} (${cleanTarget}) - Reason: ${reason}`,
    category: 'role',
    status: 'warning',
  });

  return { success: true, user: revertedUser };
}

/**
 * Subscribes to real-time role updates for the logged in user.
 * Combines in-memory speed, authoritative server validation, and Cloud Firestore listeners
 * for both user documents and crAssignments records.
 */
export function subscribeToUserAccount(
  email: string,
  onUpdate: (user: AdminUser) => void
): () => void {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@')) {
    return () => {};
  }

  let activeUser: AdminUser = registeredUsersPool.find(
    (u) => u.email.toLowerCase() === cleanEmail
  ) || {
    id: `u-${cleanEmail.replace(/[@.]/g, '_')}`,
    name: cleanEmail.split('@')[0],
    email: cleanEmail,
    role: 'student' as UserRole,
    roles: ['student'] as UserRole[],
    status: 'active' as UserStatus,
    registeredDate: 'Today',
    department: 'Software Engineering',
  };

  // 1. Immediately invoke with current state
  onUpdate({ ...activeUser });

  // Helper to safely merge updates and notify subscribers
  const applyUserUpdate = (partial: Partial<AdminUser>) => {
    activeUser = {
      ...activeUser,
      ...partial,
      // Ensure roles array remains consistent
      roles: Array.isArray(partial.roles) && partial.roles.length > 0
        ? partial.roles
        : (partial.isCR ? ['student', 'cr'] : (activeUser.roles || [partial.role || activeUser.role])),
    };

    // Synchronize memory pool
    registeredUsersPool = registeredUsersPool.map((u) =>
      u.email.toLowerCase() === cleanEmail ? { ...u, ...activeUser } : u
    );
    if (!registeredUsersPool.some((u) => u.email.toLowerCase() === cleanEmail)) {
      registeredUsersPool.push(activeUser);
    }

    onUpdate({ ...activeUser });
  };

  // 2. Authoritative Server-Side Validation on subscription initialization
  Promise.all([
    validateCRAssignmentOnServer(activeUser.uid, cleanEmail),
    validateTeacherAssignmentOnServer(activeUser.uid, cleanEmail),
  ]).then(([crRes, teacherRes]) => {
    if (teacherRes.isTeacher) {
      applyUserUpdate({
        role: 'teacher',
        roles: Array.from(new Set([...(activeUser.roles || ['student']), 'teacher'])),
        teacherStatus: 'active',
        assignedSubjects: teacherRes.assignedSubjects.length > 0 ? teacherRes.assignedSubjects : activeUser.assignedSubjects,
      });
    } else if (crRes.isCR && crRes.assignedClass) {
      applyUserUpdate({
        role: 'cr',
        roles: ['student', 'cr'],
        isCR: true,
        crStatus: 'active',
        assignedClass: crRes.assignedClass,
      });
    } else if ((crRes.status === 'revoked' || teacherRes.status === 'revoked') && (activeUser.role === 'cr' || activeUser.role === 'teacher' || activeUser.isCR)) {
      applyUserUpdate({
        role: 'student',
        roles: ['student'],
        isCR: false,
        crStatus: crRes.status === 'revoked' ? 'revoked' : 'none',
        teacherStatus: teacherRes.status === 'revoked' ? 'revoked' : 'none',
      });
    }
  }).catch((e) => {
    console.info('[Auth Service] Server CR/Teacher validation notice:', e);
  });

  // 3. Listen to in-app role change events for zero-delay cross-component reactivity
  const handleLocalRoleChange = (e: Event) => {
    const customEvent = e as CustomEvent<AdminUser>;
    const updated = customEvent.detail;
    if (updated && updated.email && updated.email.toLowerCase() === cleanEmail) {
      applyUserUpdate(updated);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('classhub_user_role_changed', handleLocalRoleChange);
  }

  // 4. Live Cloud Firestore real-time subscriptions
  const unsubs: (() => void)[] = [];

  if (db) {
    try {
      // 4a. Listen to user profile document in users collection
      const userDocRef = doc(db, 'users', cleanEmail.replace(/[@.]/g, '_'));
      const unsubUser = onSnapshot(
        userDocRef,
        (snapshot: DocumentSnapshot) => {
          if (snapshot.exists()) {
            const normalized = normalizeUserRecord(snapshot.id, snapshot.data());
            applyUserUpdate(normalized);
          }
        },
        (error: FirestoreError) => {
          console.info('[Auth Service] User document listener notice:', error.message);
        }
      );
      unsubs.push(unsubUser);

      // 4b. Listen directly to crAssignments document for this user
      const crDocRef = doc(db, 'crAssignments', `cr_${cleanEmail.replace(/[@.]/g, '_')}`);
      const unsubCRDoc = onSnapshot(
        crDocRef,
        (snapshot: DocumentSnapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data?.status === 'active') {
              applyUserUpdate({
                role: 'cr',
                roles: ['student', 'cr'],
                isCR: true,
                crStatus: 'active',
                assignedClass: data.assignedClass || activeUser.assignedClass || 'BSCS 3A',
              });
            } else if (data?.status === 'revoked') {
              applyUserUpdate({
                role: 'student',
                roles: ['student'],
                isCR: false,
                crStatus: 'revoked',
              });
            }
          }
        },
        (error: FirestoreError) => {
          console.info('[Auth Service] CR document listener notice:', error.message);
        }
      );
      unsubs.push(unsubCRDoc);

      // 4c. Listen to teacherAssignments document for this user
      const teacherDocRef = doc(db, 'teacherAssignments', `teacher_${cleanEmail.replace(/[@.]/g, '_')}`);
      const unsubTeacherDoc = onSnapshot(
        teacherDocRef,
        (snapshot: DocumentSnapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data?.status === 'active') {
              applyUserUpdate({
                role: 'teacher',
                roles: Array.from(new Set([...(activeUser.roles || ['student']), 'teacher'])),
                teacherStatus: 'active',
                assignedSubjects: data.assignedSubjects || activeUser.assignedSubjects,
              });
            } else if (data?.status === 'revoked') {
              applyUserUpdate({
                role: 'student',
                roles: ['student'],
                teacherStatus: 'revoked',
              });
            }
          }
        },
        (error: FirestoreError) => {
          console.info('[Auth Service] Teacher document listener notice:', error.message);
        }
      );
      unsubs.push(unsubTeacherDoc);

      // 4c. Listen to any crAssignments documents where email matches
      const crCol = collection(db, 'crAssignments');
      const crQuery = query(crCol, where('email', '==', cleanEmail));
      const unsubCRQuery = onSnapshot(
        crQuery,
        (snap) => {
          if (!snap.empty) {
            const activeDoc = snap.docs.find((d) => d.data().status === 'active');
            if (activeDoc) {
              const data = activeDoc.data();
              applyUserUpdate({
                role: 'cr',
                roles: ['student', 'cr'],
                isCR: true,
                crStatus: 'active',
                assignedClass: data.assignedClass || activeUser.assignedClass || 'BSCS 3A',
              });
            } else {
              const hasRevoked = snap.docs.some((d) => d.data().status === 'revoked');
              if (hasRevoked && (activeUser.role === 'cr' || activeUser.isCR)) {
                applyUserUpdate({
                  role: 'student',
                  roles: ['student'],
                  isCR: false,
                  crStatus: 'revoked',
                });
              }
            }
          }
        },
        (error: FirestoreError) => {
          console.info('[Auth Service] CR query listener notice:', error.message);
        }
      );
      unsubs.push(unsubCRQuery);
    } catch (err) {
      console.info('[Auth Service] Real-time listeners setup notice:', err);
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('classhub_user_role_changed', handleLocalRoleChange);
    }
    unsubs.forEach((u) => {
      try {
        u();
      } catch (e) {}
    });
  };
}

/**
 * Marks CR access dialog as acknowledged for a student
 */
export async function markCRAccessAcknowledged(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  registeredUsersPool = registeredUsersPool.map((u) =>
    u.email.toLowerCase() === cleanEmail ? { ...u, crAcknowledged: true } : u
  );

  if (db) {
    try {
      const userDocRef = doc(db, 'users', cleanEmail.replace(/[@.]/g, '_'));
      await setDoc(userDocRef, { crAcknowledged: true }, { merge: true });
    } catch (err) {
      console.info('[Auth Service] Acknowledgment notice:', err);
    }
  }
}

/**
 * Grants Teacher Panel access to a registered user account.
 * Binds verified UID and Gmail to assigned subjects and classes.
 */
export async function grantTeacherAccess(
  adminEmail: string,
  targetEmail: string,
  assignedSubjects: string[],
  assignedClass?: string,
  targetUid?: string
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const cleanAdmin = adminEmail.trim().toLowerCase();
  const cleanTarget = targetEmail.trim().toLowerCase();

  if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: 'Unauthorized: Only Master Administrator can grant Teacher Panel access.',
    };
  }

  let targetUser = registeredUsersPool.find((u) => u.email.toLowerCase() === cleanTarget);
  if (!targetUser && db) {
    try {
      const snap = await getDoc(doc(db, 'users', cleanTarget.replace(/[@.]/g, '_')));
      if (snap.exists()) {
        targetUser = normalizeUserRecord(snap.id, snap.data());
      }
    } catch (err) {
      console.info('[Auth Service] Teacher target fetch notice:', err);
    }
  }

  if (!targetUser) {
    return { success: false, error: 'Target user account not found in directory.' };
  }

  const effectiveUid = targetUid || targetUser.uid || `uid_${cleanTarget.replace(/[@.]/g, '_')}`;
  const grantedAt = new Date().toISOString();

  const updatedUser: AdminUser = {
    ...targetUser,
    uid: effectiveUid,
    role: 'teacher',
    roles: Array.from(new Set([...(targetUser.roles || ['student']), 'teacher'])),
    assignedSubjects: assignedSubjects.length > 0 ? assignedSubjects : ['PF Theory'],
    assignedClass: assignedClass || targetUser.assignedClass,
    teacherStatus: 'active',
    teacherAssignedAt: grantedAt,
    teacherAssignedBy: adminEmail,
  };

  registeredUsersPool = registeredUsersPool.map((u) =>
    u.email.toLowerCase() === cleanTarget ? updatedUser : u
  );
  if (!registeredUsersPool.some((u) => u.email.toLowerCase() === cleanTarget)) {
    registeredUsersPool.push(updatedUser);
  }

  notifyUserSubscribers(registeredUsersPool);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('classhub_user_role_changed', { detail: updatedUser }));
  }

  const assignmentDocId = `teacher_${cleanTarget.replace(/[@.]/g, '_')}`;
  const assignmentRecord = {
    id: assignmentDocId,
    uid: effectiveUid,
    email: cleanTarget,
    name: updatedUser.name,
    panelType: 'teacher',
    assignedSubjects,
    assignedClass: assignedClass || '',
    status: 'active',
    grantedAt,
    grantedBy: adminEmail,
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
  };

  if (db) {
    try {
      await setDoc(doc(db, 'teacherAssignments', assignmentDocId), assignmentRecord);
      await setDoc(doc(db, 'users', cleanTarget.replace(/[@.]/g, '_')), updatedUser, { merge: true });
      await addDoc(collection(db, 'roleAssignments'), {
        userId: updatedUser.id,
        userEmail: updatedUser.email,
        userName: updatedUser.name,
        role: 'teacher',
        assignedSubjects,
        assignedBy: adminEmail,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.info('[Auth Service] Teacher grant sync notice:', err);
    }
  }

  await recordAuditLog({
    action: 'Teacher Panel Access Granted',
    performedBy: adminEmail,
    details: `Granted Teacher Panel access to ${updatedUser.name} (${cleanTarget}) for subjects: ${assignedSubjects.join(', ')}`,
    category: 'role',
    status: 'success',
  });

  return { success: true, user: updatedUser };
}

/**
 * Revokes Teacher Panel access from a user.
 */
export async function revokeTeacherAccess(
  adminEmail: string,
  targetEmail: string,
  reason = 'Admin revocation'
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const cleanAdmin = adminEmail.trim().toLowerCase();
  const cleanTarget = targetEmail.trim().toLowerCase();

  if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: 'Unauthorized: Only Master Administrator can revoke Teacher Panel access.',
    };
  }

  const targetUser = registeredUsersPool.find((u) => u.email.toLowerCase() === cleanTarget);
  if (!targetUser) {
    return { success: false, error: 'User account not found.' };
  }

  const revokedAt = new Date().toISOString();
  const revertedUser: AdminUser = {
    ...targetUser,
    role: 'student',
    roles: (targetUser.roles || []).filter((r) => r !== 'teacher'),
    teacherStatus: 'revoked',
    teacherRevokedAt: revokedAt,
    teacherRevocationReason: reason,
  };

  registeredUsersPool = registeredUsersPool.map((u) =>
    u.email.toLowerCase() === cleanTarget ? revertedUser : u
  );
  notifyUserSubscribers(registeredUsersPool);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('classhub_user_role_changed', { detail: revertedUser }));
  }

  if (db) {
    try {
      const assignmentDocId = `teacher_${cleanTarget.replace(/[@.]/g, '_')}`;
      await setDoc(
        doc(db, 'teacherAssignments', assignmentDocId),
        {
          status: 'revoked',
          revokedAt,
          revokedBy: adminEmail,
          revocationReason: reason,
        },
        { merge: true }
      );
      await setDoc(doc(db, 'users', cleanTarget.replace(/[@.]/g, '_')), revertedUser, { merge: true });
    } catch (err) {
      console.info('[Auth Service] Revoke teacher sync notice:', err);
    }
  }

  await recordAuditLog({
    action: 'Teacher Panel Access Revoked',
    performedBy: adminEmail,
    details: `Revoked Teacher Panel access from ${targetUser.name} (${cleanTarget}) - Reason: ${reason}`,
    category: 'role',
    status: 'warning',
  });

  return { success: true, user: revertedUser };
}

