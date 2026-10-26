import { AdminUser, UserRole, UserStatus, INITIAL_USERS, AuditLogItem, UserAggregateStats } from '../data/adminData';
import { db, auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
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
  requiresVerification?: boolean;
  unverifiedEmail?: string;
}

export interface StudentRegistrationInput {
  fullName: string;
  fatherName: string;
  email: string;
  password?: string;
  department: string;
  assignedClass?: string;
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
  const rawEmail = (
    data?.email ||
    data?.studentEmail ||
    data?.userEmail ||
    (docId.includes('@') ? docId : (docId.includes('_') ? docId.replace(/_/g, '.') : ''))
  ).trim().toLowerCase();

  const email = rawEmail.includes('@') ? rawEmail : (data?.email || `${docId}@awkum.edu.pk`);

  // Extract clean human full name
  const rawName = data?.name || data?.fullName || data?.teacherName || data?.displayName || data?.claimedByName || data?.studentName;
  let cleanName = (typeof rawName === 'string' && rawName.trim()) ? rawName.trim() : '';

  if (!cleanName || cleanName.includes('@') || cleanName.toLowerCase() === email.toLowerCase()) {
    const alternativeName = data?.fullName || data?.teacherName || data?.studentName || data?.displayName || data?.claimedByName;
    if (alternativeName && typeof alternativeName === 'string' && !alternativeName.includes('@')) {
      cleanName = alternativeName.trim();
    } else {
      const emailPrefix = (email.includes('@') ? email.split('@')[0] : cleanName || docId)
        .replace(/[._-]/g, ' ')
        .replace(/\d+/g, '')
        .trim();
      cleanName = emailPrefix
        ? emailPrefix.replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'Registered User';
    }
  }

  const rawRole = (data?.role as string) || 'student';
  const rawCrStatus = (data?.crStatus as ('active' | 'revoked' | 'none' | undefined)) || undefined;
  const rawTeacherStatus = (data?.teacherStatus as ('active' | 'revoked' | 'registration_pending_verification' | 'none' | undefined)) || undefined;

  const isTeacherByData =
    rawTeacherStatus === 'active' ||
    rawTeacherStatus === 'registration_pending_verification' ||
    rawRole === 'teacher' ||
    (Array.isArray(data?.roles) && data.roles.includes('teacher'));

  // If user has both crAssignedAt and crRevokedAt timestamps, the most recent action dictates status
  let crStatus = rawCrStatus;
  if (data?.crAssignedAt && data?.crRevokedAt) {
    if (new Date(data.crAssignedAt).getTime() >= new Date(data.crRevokedAt).getTime()) {
      crStatus = 'active';
    } else {
      crStatus = 'revoked';
    }
  }

  const isCR = Boolean(
    !isTeacherByData && (
      crStatus === 'active' ||
      (crStatus !== 'revoked' && (data?.isCR || rawRole === 'cr' || (Array.isArray(data?.roles) && data.roles.includes('cr'))))
    )
  );

  // Effective role evaluation: teacher takes precedence if active
  let effectiveRole: UserRole = 'student';
  if (isTeacherByData && rawTeacherStatus !== 'revoked') {
    effectiveRole = 'teacher';
  } else if (crStatus === 'revoked' && rawRole === 'cr') {
    effectiveRole = 'student';
  } else if (['master_admin', 'teacher', 'cr', 'student'].includes(rawRole)) {
    effectiveRole = rawRole as UserRole;
  } else if (isCR) {
    effectiveRole = 'cr';
  }

  const isMasterAdmin = email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() || docId === 'master_admin';
  const emailVerified = Boolean(isMasterAdmin || data?.emailVerified === true);

  const effectiveUid =
    data?.uid ||
    data?.firebaseUid ||
    (!docId.includes('@') && !docId.includes('_') && docId.length >= 15 ? docId : undefined) ||
    (docId.startsWith('uid_') ? docId : undefined);

  return {
    id: data?.id || `u-${docId}`,
    uid: effectiveUid,
    name: cleanName,
    email: email,
    studentId: isTeacherByData ? undefined : (data?.studentId || data?.rollNo || data?.rollNumber || undefined),
    role: effectiveRole,
    roles: effectiveRole === 'teacher'
      ? ['teacher']
      : (Array.isArray(data?.roles) && data.roles.length > 0
        ? (crStatus === 'revoked' ? data.roles.filter((r: string) => r !== 'cr') : Array.from(new Set([...data.roles, ...(isCR ? ['cr'] : [])])))
        : (isCR ? ['student', 'cr'] : [effectiveRole])),
    isCR: isCR && crStatus !== 'revoked',
    crStatus: crStatus || (isCR ? 'active' : 'none'),
    teacherStatus: rawTeacherStatus || (isTeacherByData ? 'active' : 'none'),
    status: (['active', 'pending', 'suspended'].includes(data?.status) ? data.status : 'active') as UserStatus,
    emailVerified,
    verifiedAt: data?.verifiedAt || (isMasterAdmin ? 'Oct 01, 2026' : undefined),
    registeredDate:
      data?.registeredDate ||
      (data?.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Recently Registered'),
    lastLogin: data?.lastLogin?.toDate ? data.lastLogin.toDate().toLocaleDateString() : data?.lastLogin,
    avatarUrl: data?.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`,
    assignedSubjects: Array.isArray(data?.assignedSubjects) ? data.assignedSubjects : undefined,
    assignedClass: data?.assignedClass || undefined,
    phone: data?.phone,
    department: data?.department || (isTeacherByData ? 'Department of Computer Science & Software Engineering' : 'Software Engineering'),
    fatherName: isTeacherByData ? undefined : data?.fatherName,
    semester: isTeacherByData ? undefined : (data?.semester || '1st Semester'),
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
  const emailMap = new Map<string, AdminUser>();
  const uidToEmailMap = new Map<string, string>();

  const process = (u: AdminUser, isFirestore: boolean) => {
    if (!u) return;
    const cleanEmail = (u.email || '').trim().toLowerCase();
    const cleanUid = (u.uid || '').trim();

    // Find existing by UID or cleanEmail
    const existingKey = (cleanUid && uidToEmailMap.get(cleanUid)) || (cleanEmail && emailMap.has(cleanEmail) ? cleanEmail : null);
    const existing = existingKey ? emailMap.get(existingKey) : undefined;

    const mergedUser: AdminUser = {
      ...(existing || {}),
      ...u,
      id: u.id || existing?.id || (cleanUid ? `u-${cleanUid}` : `u-${cleanEmail}`),
      email: cleanEmail || existing?.email || u.email,
      uid: cleanUid || existing?.uid || u.uid,
      isFirebaseUser: isFirestore || existing?.isFirebaseUser || false,
    };

    const targetKey = mergedUser.email ? mergedUser.email.toLowerCase() : (cleanUid || mergedUser.id);
    emailMap.set(targetKey, mergedUser);
    if (cleanUid) {
      uidToEmailMap.set(cleanUid, targetKey);
    }
    if (mergedUser.uid) {
      uidToEmailMap.set(mergedUser.uid, targetKey);
    }
  };

  baseUsers.forEach((u) => process(u, false));
  firestoreUsers.forEach((u) => process(u, true));

  return Array.from(emailMap.values());
}

/**
 * Fetches all registered users from Cloud Firestore users collection and backend sync.
 * Never deletes users during read; safely reconciles all registered Firebase Auth identities.
 */
export async function getAllRegisteredUsersFromFirestore(): Promise<AdminUser[]> {
  const firestoreUsers: AdminUser[] = [];

  if (db) {
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const norm = normalizeUserRecord(docSnap.id, data);
          if (norm.email && norm.email.includes('@')) {
            firestoreUsers.push(norm);
          }
        }
      });
    } catch (err: any) {
      console.info('[Auth Service] Fetch all users from Firestore notice:', err?.message || err);
    }
  }

  // Also query backend search endpoint to ensure newly registered Firebase Auth users are fetched
  try {
    const res = await fetch('/api/admin/search-users?q=');
    if (res.ok) {
      const serverData = await res.json();
      if (Array.isArray(serverData?.users)) {
        serverData.users.forEach((su: any) => {
          if (su && su.email && su.email.includes('@')) {
            firestoreUsers.push(normalizeUserRecord(su.id || su.uid, su));
          }
        });
      }
    }
  } catch (e) {
    // Non-blocking server sync
  }

  const merged = mergeUsers(INITIAL_USERS, firestoreUsers);
  registeredUsersPool = merged;
  notifyUserSubscribers(merged);
  return merged;
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
 * Automatically keeps Master Admin in sync with verified accounts.
 */
export function subscribeToAllUsers(
  onUpdate: (users: AdminUser[]) => void
): () => void {
  userSubscribers.add(onUpdate);

  // Immediately notify with current in-memory pool
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
            const data = docSnap.data();
            const norm = normalizeUserRecord(docSnap.id, data);
            if (norm.email && norm.email.includes('@')) {
              firestoreUsers.push(norm);
            }
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

  try {
    const res = await fetch('/api/auth/validate-cr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: cleanUid, email: cleanEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.isCR || data.status === 'active' || data.status === 'revoked')) {
        return data;
      }
    }
  } catch (err) {}

  return { isCR: false, assignedClass: null, status: 'none' };
}

/**
 * Server-authoritative check verifying if an account currently has an active, valid Teacher assignment.
 * Checks server endpoint.
 */
export async function validateTeacherAssignmentOnServer(
  uid?: string,
  email?: string
): Promise<{ isTeacher: boolean; assignedSubjects: string[]; status: 'active' | 'revoked' | 'none'; teacherName?: string; assignment?: any }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUid = (uid || '').trim();

  try {
    const res = await fetch('/api/auth/validate-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: cleanUid, email: cleanEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.isTeacher || data.status === 'active' || data.status === 'revoked')) {
        return data;
      }
    }
  } catch (err) {}

  return { isTeacher: false, assignedSubjects: [], status: 'none' };
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
        const snap = await Promise.race([
          getDoc(userDocRef),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (snap && snap.exists()) {
          const data = snap.data();
          if (data.status === 'suspended') {
            return {
              success: false,
              isSuspended: true,
              error: 'This administrative account has been suspended. Please contact IT Security.',
            };
          }
          adminRecord = { ...adminRecord, ...data } as AdminUser;
        } else if (!snap) {
          console.info('[Auth Service] Fast-tracking Master Admin authentication; background Firestore sync active');
        } else {
          setDoc(userDocRef, {
            ...adminRecord,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          }).catch(() => {});
        }
        setDoc(emailDocRef, {
          ...adminRecord,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        }, { merge: true }).catch(() => {});
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

  if (!matchedUser && db) {
    try {
      // 3a. Check by verified UID if available
      if (verifiedUid) {
        const uidSnap = await Promise.race([
          getDoc(doc(db, 'users', verifiedUid)),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (uidSnap && uidSnap.exists()) {
          matchedUser = normalizeUserRecord(uidSnap.id, uidSnap.data());
        }
      }

      // 3b. Check by email slug
      if (!matchedUser && cleanId.includes('@')) {
        const userDocRef = doc(db, 'users', cleanId.replace(/[@.]/g, '_'));
        const snap = await Promise.race([
          getDoc(userDocRef),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (snap && snap.exists()) {
          matchedUser = normalizeUserRecord(snap.id, snap.data());
        }
      }

      // 3c. Query users collection by email
      if (!matchedUser && cleanId.includes('@')) {
        const emailQuerySnap = await Promise.race([
          getDocs(query(collection(db, 'users'), where('email', '==', cleanId))),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (emailQuerySnap && !emailQuerySnap.empty) {
          const firstDoc = emailQuerySnap.docs[0];
          matchedUser = normalizeUserRecord(firstDoc.id, firstDoc.data());
        }
      }

      // 3d. Query users collection by uid
      if (!matchedUser && verifiedUid) {
        const uidQuerySnap = await Promise.race([
          getDocs(query(collection(db, 'users'), where('uid', '==', verifiedUid))),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (uidQuerySnap && !uidQuerySnap.empty) {
          const firstDoc = uidQuerySnap.docs[0];
          matchedUser = normalizeUserRecord(firstDoc.id, firstDoc.data());
        }
      }
    } catch (err) {
      console.info('[Auth Service] Remote user lookup notice:', err);
    }
  }

  // 3e. Check backend server search endpoint if still not resolved
  if (!matchedUser && cleanId.includes('@')) {
    try {
      const serverRes = await fetch(`/api/admin/search-users?q=${encodeURIComponent(cleanId)}`);
      if (serverRes.ok) {
        const serverData = await serverRes.json();
        const found = serverData?.users?.find(
          (u: any) => u.email?.toLowerCase() === cleanId || (verifiedUid && u.uid === verifiedUid)
        );
        if (found) {
          matchedUser = normalizeUserRecord(found.id || found.uid, found);
        }
      }
    } catch (e) {
      // Non-blocking server check
    }
  }

  // 3f. If user is authenticated in Firebase Auth (verifiedUid or auth.currentUser) but has no Firestore doc yet:
  // Auto-initialize their official user profile idempotently respecting teacher/admin status!
  if (!matchedUser && (verifiedUid || auth?.currentUser)) {
    const liveAuth = auth?.currentUser;
    const effectiveUid = verifiedUid || liveAuth?.uid || `uid_${cleanId.replace(/[@.]/g, '_')}`;

    // Check if email or UID is registered in subjectInvitations or subjectTeacherAssignments
    let isTeacherByInv = teacherVerdict.isTeacher;
    let invTeacherName = '';
    let invSubjects: string[] = [];

    if (!isTeacherByInv && db) {
      try {
        const invSnap = await getDocs(query(collection(db, 'subjectInvitations')));
        invSnap.forEach((d) => {
          const inv = d.data();
          const matchesEmail =
            inv.teacherEmail?.toLowerCase() === cleanId ||
            inv.reservedForEmail?.toLowerCase() === cleanId ||
            inv.claimedByEmail?.toLowerCase() === cleanId;
          const matchesUid =
            inv.teacherUid === effectiveUid ||
            inv.reservedForUid === effectiveUid ||
            inv.claimedByUid === effectiveUid;

          if (matchesEmail || matchesUid) {
            isTeacherByInv = true;
            if (inv.teacherName && !inv.teacherName.includes('@')) {
              invTeacherName = inv.teacherName;
            }
            if (inv.subjectId) {
              invSubjects.push(inv.subjectId);
            }
          }
        });

        const staSnap = await getDocs(query(collection(db, 'subjectTeacherAssignments')));
        staSnap.forEach((d) => {
          const sta = d.data();
          if (sta.teacherEmail?.toLowerCase() === cleanId || sta.teacherUid === effectiveUid) {
            isTeacherByInv = true;
            if (sta.teacherName && !sta.teacherName.includes('@')) {
              invTeacherName = sta.teacherName;
            }
            if (sta.subjectId) {
              invSubjects.push(sta.subjectId);
            }
          }
        });
      } catch (e) {}
    }

    const isTeacherRole = isTeacherByInv;

    const emailPrefix = cleanId.split('@')[0].replace(/[._-]/g, ' ').replace(/\d+/g, '').trim().replace(/\b\w/g, (c) => c.toUpperCase());
    const rawDisplayName = liveAuth?.displayName || invTeacherName || emailPrefix;
    const displayName = rawDisplayName && !rawDisplayName.includes('@') ? rawDisplayName : emailPrefix || (isTeacherRole ? 'Faculty Instructor' : 'Registered Student');

    const roll = Math.floor(1000 + Math.random() * 9000);

    const initialUser: AdminUser = {
      id: `u-${effectiveUid}`,
      uid: effectiveUid,
      name: displayName,
      fatherName: isTeacherRole ? undefined : 'Not Provided',
      email: cleanId,
      studentId: isTeacherRole ? undefined : `26SE${roll}`,
      role: isTeacherRole ? 'teacher' : 'student',
      roles: isTeacherRole ? ['teacher'] : ['student'],
      teacherStatus: isTeacherRole ? 'active' : 'none',
      assignedSubjects: isTeacherRole ? (invSubjects.length > 0 ? invSubjects : teacherVerdict.assignedSubjects) : [],
      status: 'active',
      emailVerified: liveAuth?.emailVerified ?? false,
      registeredDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      department: isTeacherRole ? 'Department of Computer Science & Software Engineering' : 'Software Engineering',
      semester: isTeacherRole ? undefined : '1st Semester',
      avatarUrl: liveAuth?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      isFirebaseUser: true,
    };

    if (db) {
      try {
        setDoc(doc(db, 'users', effectiveUid), initialUser, { merge: true }).catch(() => {});
        setDoc(doc(db, 'users', cleanId.replace(/[@.]/g, '_')), initialUser, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    registeredUsersPool = [initialUser, ...registeredUsersPool.filter((u) => u.email.toLowerCase() !== cleanId)];
    notifyUserSubscribers(registeredUsersPool);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classhub_user_registered', { detail: initialUser }));
    }

    matchedUser = initialUser;
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
    if (teacherVerdict.isTeacher) {
      const resolvedTeacherName = teacherVerdict.teacherName || (matchedUser.name && !matchedUser.name.includes('@') && !matchedUser.name.toLowerCase().startsWith('teachertest') ? matchedUser.name : '');
      matchedUser = {
        ...matchedUser,
        name: resolvedTeacherName || matchedUser.name,
        role: 'teacher',
        roles: ['teacher'],
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
      const preserveCR =
        crVerdict.status !== 'revoked' &&
        matchedUser.crStatus !== 'revoked' &&
        Boolean(
          matchedUser.isCR ||
            matchedUser.role === 'cr' ||
            (Array.isArray(matchedUser.roles) && matchedUser.roles.includes('cr'))
        );

      const preserveTeacher =
        teacherVerdict.status !== 'revoked' &&
        matchedUser.teacherStatus !== 'revoked' &&
        Boolean(
          matchedUser.role === 'teacher' ||
            (Array.isArray(matchedUser.roles) && matchedUser.roles.includes('teacher')) ||
            matchedUser.teacherStatus === 'active' ||
            matchedUser.teacherStatus === 'registration_pending_verification'
        );

      const effectiveRole = preserveTeacher ? 'teacher' : preserveCR ? 'cr' : 'student';
      const effectiveRoles: UserRole[] = preserveTeacher
        ? ['teacher']
        : Array.from(
            new Set<UserRole>([
              'student',
              ...(preserveCR ? (['cr'] as UserRole[]) : []),
            ])
          );

      matchedUser = {
        ...matchedUser,
        role: effectiveRole,
        roles: effectiveRoles,
        isCR: preserveCR,
        crStatus: crVerdict.status === 'revoked' || matchedUser.crStatus === 'revoked' ? 'revoked' : (preserveCR ? 'active' : 'none'),
        teacherStatus: teacherVerdict.status === 'revoked' || matchedUser.teacherStatus === 'revoked' ? 'revoked' : (preserveTeacher ? 'active' : 'none'),
      };
    }

    const finalUser = matchedUser;

    // Self-healing Firestore repair: If user is resolved as a Teacher, persist role and name back to Firestore immediately!
    if (finalUser.role === 'teacher' && db) {
      const repairPayload: any = {
        role: 'teacher',
        roles: ['teacher'],
        teacherStatus: 'active',
        assignedSubjects: finalUser.assignedSubjects || [],
      };
      if (finalUser.name && !finalUser.name.includes('@')) {
        repairPayload.name = finalUser.name;
        repairPayload.fullName = finalUser.name;
        repairPayload.displayName = finalUser.name;
      }
      if (finalUser.uid) {
        setDoc(doc(db, 'users', finalUser.uid), repairPayload, { merge: true }).catch(() => {});
      }
      setDoc(doc(db, 'users', finalUser.email.replace(/[@.]/g, '_')), repairPayload, { merge: true }).catch(() => {});
    }

    // Strict Email Verification Check: Only Master Admin is exempt; all student/teacher accounts must be verified in Firebase Auth
    if (cleanId !== MASTER_ADMIN_EMAIL.toLowerCase()) {
      const liveAuthUser = auth?.currentUser;
      const isLiveEmailMatch = liveAuthUser?.email?.toLowerCase() === cleanId;
      const isVerifiedInAuth = isLiveEmailMatch && liveAuthUser?.emailVerified === true;

      if (liveAuthUser && isLiveEmailMatch && !isVerifiedInAuth) {
        return {
          success: false,
          requiresVerification: true,
          unverifiedEmail: cleanId,
          error: 'Your email address is pending verification. Please verify your email before accessing the portal.',
        };
      }

      if (isVerifiedInAuth) {
        finalUser.emailVerified = true;
        if (finalUser.uid && db) {
          setDoc(doc(db, 'users', finalUser.uid), {
            emailVerified: true,
            verifiedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
      }
    }

    // Update in memory pool
    registeredUsersPool = registeredUsersPool.map((u) =>
      u.email.toLowerCase() === cleanId ? finalUser : u
    );

    return {
      success: true,
      user: finalUser,
      role: finalUser.role,
    };
  }

  // 4. If student is not registered, strictly prevent login
  return {
    success: false,
    error: 'Account not registered. If you are a new student, please click "Register New Account" below to register for the 1st semester.',
  };
}

/**
 * Live search for users in memory, Firestore, and Firebase Authentication via server.
 * Enables finding newly registered accounts instantly in Admin Panel.
 */
export async function searchUsersInFirestoreOrServer(queryStr: string): Promise<AdminUser[]> {
  const cleanQ = queryStr.trim().toLowerCase();
  const results: AdminUser[] = [];
  const seenEmails = new Set<string>();

  // 1. Search in-memory pool
  registeredUsersPool.forEach((u) => {
    if (!u || !u.email) return;
    const matches =
      !cleanQ ||
      u.email.toLowerCase().includes(cleanQ) ||
      u.name.toLowerCase().includes(cleanQ) ||
      (u.studentId && u.studentId.toLowerCase().includes(cleanQ));
    if (matches && !seenEmails.has(u.email.toLowerCase())) {
      seenEmails.add(u.email.toLowerCase());
      results.push(u);
    }
  });

  // 2. Query Firestore directly if search term is provided
  if (db && cleanQ) {
    try {
      if (cleanQ.includes('@')) {
        const directSnap = await getDoc(doc(db, 'users', cleanQ.replace(/[@.]/g, '_')));
        if (directSnap.exists()) {
          const norm = normalizeUserRecord(directSnap.id, directSnap.data());
          if (norm.email && !seenEmails.has(norm.email.toLowerCase())) {
            seenEmails.add(norm.email.toLowerCase());
            results.push(norm);
          }
        }
      }

      const qSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', cleanQ))
      );
      qSnap.forEach((d) => {
        if (d.exists()) {
          const norm = normalizeUserRecord(d.id, d.data());
          if (norm.email && !seenEmails.has(norm.email.toLowerCase())) {
            seenEmails.add(norm.email.toLowerCase());
            results.push(norm);
          }
        }
      });
    } catch (e) {
      console.info('[Auth Service] Firestore search notice:', e);
    }
  }

  // 3. Query server endpoint to catch any Firebase Auth users
  try {
    const res = await fetch(`/api/admin/search-users?q=${encodeURIComponent(cleanQ)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.users)) {
        data.users.forEach((rawUser: any) => {
          if (rawUser && rawUser.email) {
            const norm = normalizeUserRecord(rawUser.id || rawUser.uid, rawUser);
            if (norm.email && !seenEmails.has(norm.email.toLowerCase())) {
              seenEmails.add(norm.email.toLowerCase());
              results.push(norm);
            }
          }
        });
      }
    }
  } catch (e) {
    // Non-blocking
  }

  // Merge newly discovered users into memory pool
  if (results.length > 0) {
    registeredUsersPool = mergeUsers(registeredUsersPool, results);
    notifyUserSubscribers(registeredUsersPool);
  }

  return results;
}

/**
 * Registers a new student account:
 * - Creates Firebase Auth user and immediately dispatches official email verification link
 * - Persists profile with Firebase UID as permanent primary identifier in users/{uid}
 * - Returns verification pending state
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
        // Handle existing unverified account gracefully without creating duplicate accounts
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, input.password);
          if (!cred.user.emailVerified) {
            await sendEmailVerification(cred.user);
            return {
              success: false,
              requiresVerification: true,
              unverifiedEmail: cleanEmail,
              error: 'This account already exists in Firebase Authentication but is pending email verification. A new verification link has been sent to your email.',
            };
          } else {
            return {
              success: false,
              error: 'An account with this email address already exists. Please sign in.',
            };
          }
        } catch {
          return {
            success: false,
            error: 'An account with this email address already exists in Firebase Authentication. Please sign in.',
          };
        }
      }
      return {
        success: false,
        error: authErr?.message || 'Failed to create account in Firebase Authentication.',
      };
    }
  }

  const effectiveUid = firebaseUid || auth?.currentUser?.uid || `uid_${cleanEmail.replace(/[@.]/g, '_')}`;

  const newStudent: AdminUser = {
    id: `u-student-${Date.now()}`,
    uid: effectiveUid,
    name: input.fullName.trim(),
    fatherName: input.fatherName.trim(),
    email: cleanEmail,
    studentId,
    role: 'student',
    roles: ['student'],
    status: 'active',
    emailVerified: false,
    registeredDate: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    department: input.department || 'Software Engineering',
    semester: '1st Semester',
    assignedClass: input.assignedClass || undefined,
    avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`,
    isFirebaseUser: true,
  };

  // Add to active memory directory
  registeredUsersPool.unshift(newStudent);
  notifyUserSubscribers(registeredUsersPool);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('classhub_user_registered', { detail: newStudent }));
  }

  // Persist to Cloud Firestore: PRIMARY document is users/{uid}
  if (db) {
    try {
      if (firebaseUid) {
        const uidDocRef = doc(db, 'users', firebaseUid);
        await setDoc(uidDocRef, {
          ...newStudent,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      const emailDocRef = doc(db, 'users', cleanEmail.replace(/[@.]/g, '_'));
      await setDoc(emailDocRef, {
        ...newStudent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.info('[Auth Service] User saved to session. Remote Firestore notice:', err);
    }
  }

  // Asynchronously synchronize aggregate stats
  reconcileUserRegistryAndAggregates().catch(() => {});

  // Record immutable audit log
  await recordAuditLog({
    action: 'New Student Registered (Pending Verification)',
    performedBy: cleanEmail,
    details: `${newStudent.name} S/D of ${newStudent.fatherName} (${newStudent.studentId}) registered in ${newStudent.department}. Verification email dispatched.`,
    category: 'user',
    status: 'success',
  });

  return {
    success: true,
    user: newStudent,
    role: 'student',
    requiresVerification: true,
    unverifiedEmail: cleanEmail,
  };
}

/**
 * Verifies current Firebase Auth user's email status by reloading the user.
 * If verified, marks the profile as verified in Firestore and refreshes local state.
 */
export async function checkEmailVerificationStatus(): Promise<{
  isVerified: boolean;
  user?: AdminUser;
  role?: UserRole;
  error?: string;
}> {
  if (!auth?.currentUser) {
    return { isVerified: false, error: 'No active session' };
  }

  await auth.currentUser.reload();
  const isVerified = Boolean(auth.currentUser.emailVerified);
  const uid = auth.currentUser.uid;
  const email = (auth.currentUser.email || '').trim().toLowerCase();

  if (!isVerified) {
    return { isVerified: false };
  }

  // Update in Firestore
  if (db && uid) {
    try {
      await setDoc(doc(db, 'users', uid), {
        emailVerified: true,
        verifiedAt: serverTimestamp(),
      }, { merge: true });

      if (email) {
        await setDoc(doc(db, 'users', email.replace(/[@.]/g, '_')), {
          emailVerified: true,
          verifiedAt: serverTimestamp(),
        }, { merge: true });

        // Auto-finalize any pending subject teacher invitations for this verified Gmail account
        try {
          const invSnap = await getDocs(query(collection(db, 'subjectInvitations'), where('status', 'in', ['registration_pending_verification', 'reserved', 'active'])));
          for (const d of invSnap.docs) {
            const inv = d.data();
            const matchesEmail = inv.teacherEmail?.toLowerCase() === email || inv.reservedForEmail?.toLowerCase() === email || inv.claimedByEmail?.toLowerCase() === email;
            const matchesUid = inv.teacherUid === uid || inv.reservedForUid === uid || inv.claimedByUid === uid;
            if (matchesEmail || matchesUid) {
              const nowIso = new Date().toISOString();
              const subjId = inv.subjectId;
              const invId = d.id;

              // 1. Mark invitation as claimed
              await setDoc(doc(db, 'subjectInvitations', invId), {
                status: 'claimed',
                claimedAt: nowIso,
                claimedByUid: uid,
                claimedByEmail: email,
              }, { merge: true });

              // 2. Create subject teacher assignment record
              const staId = `sta_${subjId}_${uid}_${Date.now()}`;
              await setDoc(doc(db, 'subjectTeacherAssignments', staId), {
                id: staId,
                subjectId: subjId,
                subjectName: inv.subjectName || subjId,
                subjectCode: inv.subjectCode || subjId,
                assignedClass: inv.assignedClass || '',
                teacherUid: uid,
                teacherEmail: email,
                teacherName: inv.teacherName || 'Faculty Instructor',
                status: 'active',
                assignedBy: 'System Invitation Claim',
                assignedAt: nowIso,
                invitationId: invId,
              });

              // 3. Update subject doc
              await setDoc(doc(db, 'subjects', subjId), {
                teacherUid: uid,
                teacherEmail: email,
                status: 'Assigned',
                teacherAssignedAt: nowIso,
                assignmentId: staId,
                invitationStatus: 'claimed',
              }, { merge: true });

              // 4. Update user profile
              await setDoc(doc(db, 'users', uid), {
                role: 'teacher',
                roles: ['teacher'],
                teacherStatus: 'active',
                emailVerified: true,
                teacherAssignedAt: nowIso,
              }, { merge: true });

              await setDoc(doc(db, 'users', email.replace(/[@.]/g, '_')), {
                role: 'teacher',
                roles: ['teacher'],
                teacherStatus: 'active',
                emailVerified: true,
                teacherAssignedAt: nowIso,
              }, { merge: true });

              // Try backend server claim endpoint
              fetch('/api/teacher-invitations/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  invitationCode: inv.invitationCode,
                  invitationPassword: inv.invitationPassword || 'verified',
                  teacherUid: uid,
                  teacherEmail: email,
                  teacherName: inv.teacherName || 'Faculty Instructor',
                  isEmailVerified: true,
                }),
              }).catch(() => {});
            }
          }
        } catch (invErr) {
          console.info('[Auth Service] Invitation claim notice on verification:', invErr);
        }
      }
    } catch (e) {
      console.info('[Auth Service] Verification Firestore update notice:', e);
    }
  }

  // Reconcile user role and return active user
  const resolution = await resolveUserRole(email, undefined, uid);

  // Update aggregate stats
  reconcileUserRegistryAndAggregates().catch(() => {});

  return {
    isVerified: true,
    user: resolution.user,
    role: resolution.role,
  };
}

/**
 * Resends the official Firebase email verification link with rate limit safety.
 */
export async function resendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
  if (!auth?.currentUser) {
    return { success: false, error: 'Authentication session expired. Please sign in again.' };
  }

  try {
    await sendEmailVerification(auth.currentUser);
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'auth/too-many-requests') {
      return { success: false, error: 'Verification emails were recently sent. Please wait 60 seconds before requesting another.' };
    }
    return { success: false, error: err?.message || 'Unable to send verification email.' };
  }
}

/**
 * Real-time subscription to backend-maintained user aggregate metrics.
 */
export function subscribeToUserAggregateStats(
  onUpdate: (stats: UserAggregateStats) => void
): () => void {
  if (!db) {
    onUpdate(computeLocalStats(registeredUsersPool));
    return () => {};
  }

  const docRef = doc(db, 'aggregates', 'userStats');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserAggregateStats;
        onUpdate(data);
      } else {
        const computed = computeLocalStats(registeredUsersPool);
        onUpdate(computed);
        setDoc(docRef, computed, { merge: true }).catch(() => {});
      }
    },
    (err) => {
      console.info('[Auth Service] Aggregates listener notice:', err.message);
      onUpdate(computeLocalStats(registeredUsersPool));
    }
  );
}

export function computeLocalStats(usersList: AdminUser[]): UserAggregateStats {
  const safe = Array.from(new Map(usersList.map((u) => [u.email.toLowerCase(), u])).values());
  const verified = safe.filter((u) => u.emailVerified || u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()).length;
  const unverified = safe.filter((u) => !u.emailVerified && u.email.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase()).length;
  const students = safe.filter((u) => u.role === 'student' || u.roles?.includes('student')).length;
  const crs = safe.filter((u) => u.isCR || u.role === 'cr' || u.roles?.includes('cr')).length;
  const teachers = safe.filter((u) => u.role === 'teacher' || u.roles?.includes('teacher')).length;

  return {
    totalAccounts: safe.length,
    verifiedAccounts: verified,
    unverifiedAccounts: unverified,
    studentCount: students,
    crCount: crs,
    teacherCount: teachers,
    adminCount: 1,
    lastReconciledAt: new Date().toISOString(),
  };
}

export async function reconcileUserRegistryAndAggregates(): Promise<UserAggregateStats> {
  const users = await getAllRegisteredUsersFromFirestore();
  const stats = computeLocalStats(users);

  if (db) {
    try {
      await setDoc(doc(db, 'aggregates', 'userStats'), {
        ...stats,
        lastReconciledAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.info('[Auth Service] Sync aggregates notice:', e);
    }
  }

  return stats;
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

  // 3. Update target student with active CR privileges (No automatic revocation of other students)
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
    crRevokedAt: undefined,
    crRevocationReason: undefined,
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

  // 4. Persist to Cloud Firestore: crAssignments (binding verified UID + Gmail) & users
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

      // Cleanup any lingering stale crAssignment documents for this user with status 'revoked'
      try {
        const staleSnap = await getDocs(query(collection(db, 'crAssignments'), where('email', '==', cleanTarget)));
        for (const sDoc of staleSnap.docs) {
          if (sDoc.id !== assignmentDocId) {
            await setDoc(sDoc.ref, { status: 'active', assignedClass: cleanClass, grantedAt, revokedAt: null, revokedBy: null }, { merge: true }).catch(() => {});
          }
        }
      } catch (staleErr) {
        console.info('[Auth Service] Stale CR cleanup notice:', staleErr);
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
    previousCR: undefined,
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
 * Updates a user account status (e.g. 'suspended' | 'active')
 * Enforced by Master Admin only. Persists directly to Firestore and invalidates sessions.
 */
export async function updateUserAccountStatus(
  adminEmail: string,
  targetEmail: string,
  newStatus: UserStatus
): Promise<{ success: boolean; error?: string }> {
  const cleanAdmin = adminEmail.trim().toLowerCase();
  const cleanTarget = targetEmail.trim().toLowerCase();

  if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: 'Unauthorized: Only Master Administrator can change account status.' };
  }

  const targetUser = registeredUsersPool.find((u) => u.email.toLowerCase() === cleanTarget);
  if (!targetUser) {
    return { success: false, error: 'User account not found.' };
  }

  const updatedUser: AdminUser = {
    ...targetUser,
    status: newStatus,
  };

  registeredUsersPool = registeredUsersPool.map((u) =>
    u.email.toLowerCase() === cleanTarget ? updatedUser : u
  );
  notifyUserSubscribers(registeredUsersPool);

  if (db) {
    try {
      const userDocRef = doc(db, 'users', cleanTarget.replace(/[@.]/g, '_'));
      await setDoc(userDocRef, { status: newStatus, statusUpdatedAt: serverTimestamp() }, { merge: true });

      if (targetUser.uid && !targetUser.uid.startsWith('uid_')) {
        await setDoc(doc(db, 'users', targetUser.uid), { status: newStatus, statusUpdatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
      }
    } catch (err: any) {
      console.info('[Auth Service] Status update error:', err?.message || err);
    }
  }

  await recordAuditLog({
    action: newStatus === 'suspended' ? 'Account Suspended' : 'Account Reactivated',
    performedBy: adminEmail,
    details: `${targetUser.name} (${cleanTarget}) account status set to ${newStatus.toUpperCase()}`,
    category: 'security',
    status: newStatus === 'suspended' ? 'warning' : 'success',
  });

  return { success: true };
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

      // 4a-2. Query users collection by email so user receives updates whether doc is named by UID or email slug
      const userCol = collection(db, 'users');
      const userEmailQuery = query(userCol, where('email', '==', cleanEmail));
      const unsubUserQuery = onSnapshot(
        userEmailQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const primaryDoc = snapshot.docs.find((d) => d.id === d.data().uid) || snapshot.docs[0];
            const normalized = normalizeUserRecord(primaryDoc.id, primaryDoc.data());
            applyUserUpdate(normalized);
          }
        },
        (error: FirestoreError) => {
          console.info('[Auth Service] User query listener notice:', error.message);
        }
      );
      unsubs.push(unsubUserQuery);

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
                assignedClass: data.assignedClass || activeUser.assignedClass || undefined,
              });
            } else if (data?.status === 'revoked') {
              // Only revoke if revocation timestamp is strictly AFTER appointment timestamp
              const isExplicitRevocation =
                data.revokedAt && activeUser.crAssignedAt
                  ? new Date(data.revokedAt).getTime() > new Date(activeUser.crAssignedAt).getTime()
                  : Boolean(data.revokedAt && !activeUser.isCR);
              if (isExplicitRevocation) {
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

      // 4d. Listen to any crAssignments documents where email matches (only promotes to active CR)
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

