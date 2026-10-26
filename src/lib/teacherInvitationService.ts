import { db, auth } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { recordAuditLog } from './authService';

export interface SubjectInvitation {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  assignedClass?: string;
  creditHours?: number;
  invitationCode: string;
  invitationPassword?: string; // Plaintext shown to admin upon generation/issue
  passwordHash?: string;
  status: 'available' | 'reserved' | 'registration_pending_verification' | 'claimed' | 'revoked';
  teacherUid?: string;
  teacherName?: string;
  teacherEmail?: string;
  createdAt: string;
  createdBy: string;
  claimedAt?: string;
  reservedAt?: string;
  reservedForEmail?: string;
  reservedForUid?: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

// In-memory cache for fast zero-latency invitation checks
let invitationsCache: SubjectInvitation[] = [];
const invitationSubscribers = new Set<(invitations: SubjectInvitation[]) => void>();

function notifySubscribers() {
  const current = [...invitationsCache];
  invitationSubscribers.forEach((cb) => {
    try {
      cb(current);
    } catch (e) {}
  });
}

/**
 * Generates unique teacher invitation credentials for a subject via trusted backend API
 */
export async function generateTeacherInvitation(payload: {
  subjectId: string;
  adminEmail: string;
  subjectName?: string;
  subjectCode?: string;
  creditHours?: number;
  assignedClass?: string;
}): Promise<{
  success: boolean;
  invitationId?: string;
  invitationCode?: string;
  invitationPassword?: string;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  error?: string;
}> {
  const { subjectId, adminEmail, subjectName, subjectCode, creditHours, assignedClass } = payload;
  const cleanSubjId = subjectId.trim();

  if (!cleanSubjId) {
    return { success: false, error: 'Subject ID is required for invitation generation.' };
  }

  try {
    const res = await fetch('/api/teacher-invitations/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subjectId: cleanSubjId,
        adminEmail: adminEmail || 'hasnainbuilds724656@gmail.com',
        subjectName,
        subjectCode,
        creditHours,
        assignedClass,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.invitationCode) {
        const newInv: SubjectInvitation = {
          id: data.invitationId || `inv_${cleanSubjId}_${Date.now()}`,
          subjectId: cleanSubjId,
          subjectName: data.subjectName || subjectName || cleanSubjId,
          subjectCode: data.subjectCode || subjectCode || '',
          invitationCode: data.invitationCode,
          invitationPassword: data.invitationPassword,
          status: 'available',
          createdAt: new Date().toISOString(),
          createdBy: adminEmail || 'hasnainbuilds724656@gmail.com',
        };

        invitationsCache = [newInv, ...invitationsCache.filter((i) => i.subjectId !== cleanSubjId)];
        notifySubscribers();

        return {
          success: true,
          invitationId: newInv.id,
          invitationCode: newInv.invitationCode,
          invitationPassword: data.invitationPassword,
          subjectId: cleanSubjId,
          subjectName: newInv.subjectName,
          subjectCode: newInv.subjectCode,
        };
      }
    }
  } catch (netErr) {
    console.info('[Teacher Invitation Service] Backend call notice, using direct client generation:', netErr);
  }

  // Fallback client-side generation if server endpoint is unreachable
  return generateOrGetSubjectInvitation(cleanSubjId, subjectName || cleanSubjId, adminEmail || 'hasnainbuilds724656@gmail.com');
}

/**
 * Generates or retrieves a secure unique invitation for a curriculum subject
 */
export async function generateOrGetSubjectInvitation(
  subjectId: string,
  subjectName: string,
  adminEmail: string
): Promise<{
  success: boolean;
  invitationId?: string;
  invitationCode?: string;
  invitationPassword?: string;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  error?: string;
}> {
  const cleanSubjId = subjectId.trim();
  const cleanSubjName = subjectName.trim();

  // Generate high-entropy code and password
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const subjPrefix = cleanSubjName.replace(/[^A-Z]/gi, '').substring(0, 4).toUpperCase() || 'SUBJ';
  const invitationCode = `${subjPrefix}-${randomSuffix}`;

  const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let invitationPassword = '';
  for (let i = 0; i < 12; i++) {
    invitationPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const invitationId = `inv_${cleanSubjId}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newInvitation: SubjectInvitation = {
    id: invitationId,
    subjectId: cleanSubjId,
    subjectName: cleanSubjName,
    invitationCode,
    invitationPassword,
    status: 'available',
    createdAt: nowIso,
    createdBy: adminEmail,
  };

  invitationsCache = [newInvitation, ...invitationsCache.filter((i) => i.subjectId !== cleanSubjId)];
  notifySubscribers();

  if (db) {
    try {
      await setDoc(doc(db, 'subjectInvitations', invitationId), {
        ...newInvitation,
        createdAt: serverTimestamp(),
      });

      await recordAuditLog({
        action: 'Subject Teacher Invitation Generated',
        performedBy: adminEmail,
        details: `Generated invitation code ${invitationCode} for subject ${cleanSubjName}`,
        category: 'academic',
        status: 'success',
      });
    } catch (e) {
      console.info('[Invitation Service] Firestore save notice:', e);
    }
  }

  return {
    success: true,
    invitationId,
    invitationCode,
    invitationPassword,
    subjectId: cleanSubjId,
    subjectName: cleanSubjName,
  };
}

/**
 * Subscribes to real-time invitation for a specific subject
 */
export function subscribeToSubjectInvitation(
  subjectId: string,
  onUpdate: (invitation: SubjectInvitation | null) => void
): () => void {
  if (!subjectId) {
    onUpdate(null);
    return () => {};
  }

  const cleanSubjId = subjectId.trim();

  // Check memory cache first
  const cachedMatch = invitationsCache.find((i) => i.subjectId === cleanSubjId);
  if (cachedMatch) {
    onUpdate(cachedMatch);
  } else {
    onUpdate(null);
  }

  if (!db) {
    return () => {};
  }

  try {
    const q = query(collection(db, 'subjectInvitations'), where('subjectId', '==', cleanSubjId));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          // Sort by createdAt descending
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SubjectInvitation));
          docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          const latest = docs[0];

          // Preserve plaintext password if present in memory
          const cachedPass = invitationsCache.find((i) => i.id === latest.id)?.invitationPassword;
          if (cachedPass && !latest.invitationPassword) {
            latest.invitationPassword = cachedPass;
          }

          onUpdate(latest);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.info('[Invitation Service] Subject invitation subscription notice:', err.message);
      }
    );

    return unsubscribe;
  } catch (e) {
    return () => {};
  }
}

/**
 * Subscribes to all subject invitations in real time
 */
export function subscribeToSubjectInvitations(onUpdate: (invitations: SubjectInvitation[]) => void): () => void {
  invitationSubscribers.add(onUpdate);
  onUpdate([...invitationsCache]);

  if (!db) {
    return () => {
      invitationSubscribers.delete(onUpdate);
    };
  }

  try {
    const unsub = onSnapshot(
      collection(db, 'subjectInvitations'),
      (snap) => {
        const list: SubjectInvitation[] = [];
        snap.forEach((d) => {
          if (d.exists()) {
            const data = d.data() as SubjectInvitation;
            const existingCachePass = invitationsCache.find((i) => i.id === d.id)?.invitationPassword;
            list.push({
              id: d.id,
              subjectId: data.subjectId,
              subjectName: data.subjectName || 'Subject',
              subjectCode: data.subjectCode,
              invitationCode: data.invitationCode,
              invitationPassword: data.invitationPassword || existingCachePass,
              status: data.status || 'available',
              teacherUid: data.teacherUid,
              teacherName: data.teacherName,
              teacherEmail: data.teacherEmail,
              createdAt: data.createdAt || 'Recent',
              createdBy: data.createdBy || 'Admin',
              claimedAt: data.claimedAt,
              reservedAt: data.reservedAt,
              reservedForEmail: data.reservedForEmail,
              reservedForUid: data.reservedForUid,
              revokedAt: data.revokedAt,
              revokedBy: data.revokedBy,
              revocationReason: data.revocationReason,
            });
          }
        });
        invitationsCache = list;
        notifySubscribers();
      },
      (err) => {
        console.info('[Invitation Service] All invitations notice:', err.message);
      }
    );

    return () => {
      invitationSubscribers.delete(onUpdate);
      unsub();
    };
  } catch (err) {
    return () => {
      invitationSubscribers.delete(onUpdate);
    };
  }
}

/**
 * Revokes a subject teacher invitation
 */
export async function revokeTeacherInvitation(payload: {
  subjectId: string;
  adminEmail: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { subjectId, adminEmail, reason } = payload;
  const cleanSubjId = subjectId.trim();

  try {
    const res = await fetch('/api/teacher-invitations/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectId: cleanSubjId,
        adminEmail: adminEmail || 'hasnainbuilds724656@gmail.com',
        reason,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        invitationsCache = invitationsCache.map((inv) =>
          inv.subjectId === cleanSubjId
            ? { ...inv, status: 'revoked', revokedAt: new Date().toISOString(), revokedBy: adminEmail }
            : inv
        );
        notifySubscribers();
        return { success: true };
      }
    }
  } catch (err) {
    console.info('[Invitation Service] Revoke backend notice:', err);
  }

  return revokeSubjectTeacherInvitation(cleanSubjId, adminEmail, reason);
}

/**
 * Revokes a subject teacher invitation directly in Firestore / cache
 */
export async function revokeSubjectTeacherInvitation(
  subjectId: string,
  adminEmail: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const revocationReason = reason || 'Revoked by Master Administrator';

  invitationsCache = invitationsCache.map((inv) =>
    inv.subjectId === subjectId
      ? { ...inv, status: 'revoked', revokedAt: nowIso, revokedBy: adminEmail, revocationReason }
      : inv
  );
  notifySubscribers();

  if (db) {
    try {
      const invSnap = await getDocs(
        query(collection(db, 'subjectInvitations'), where('subjectId', '==', subjectId))
      );
      for (const d of invSnap.docs) {
        await setDoc(
          d.ref,
          {
            status: 'revoked',
            revokedAt: nowIso,
            revokedBy: adminEmail,
            revocationReason,
          },
          { merge: true }
        );
      }

      await recordAuditLog({
        action: 'Subject Teacher Invitation Revoked',
        performedBy: adminEmail,
        details: `Revoked teacher invitation for subject ID ${subjectId} - Reason: ${revocationReason}`,
        category: 'academic',
        status: 'warning',
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to revoke invitation.' };
    }
  }

  return { success: true };
}

/**
 * Validates invitation credentials entered into login page Email and Password fields
 */
export async function validateInvitationCredentials(
  code: string,
  password: string
): Promise<{ success: boolean; invitation?: SubjectInvitation; error?: string }> {
  const cleanCode = code.trim().toUpperCase();
  const cleanPassword = password.trim();

  if (!cleanCode || !cleanPassword) {
    return { success: false, error: 'Please enter both Subject Invitation Code and Invitation Password.' };
  }

  // 1. Try server backend endpoint first
  try {
    const res = await fetch('/api/teacher-invitations/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitationCode: cleanCode,
        invitationPassword: cleanPassword,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.subject) {
        const verifiedInv: SubjectInvitation = {
          id: data.invitationId || `inv_${data.subject.id}`,
          subjectId: data.subject.id,
          subjectName: data.subject.name,
          subjectCode: data.subject.code,
          assignedClass: data.subject.assignedClass,
          creditHours: data.subject.creditHours,
          invitationCode: data.invitationCode || cleanCode,
          invitationPassword: cleanPassword,
          status: data.status || 'available',
          createdAt: new Date().toISOString(),
          createdBy: 'Admin',
        };
        return { success: true, invitation: verifiedInv };
      } else if (data.error) {
        return { success: false, error: data.error };
      }
    }
  } catch (netErr) {
    console.info('[Invitation Service] Verify endpoint notice:', netErr);
  }

  // 2. Search in memory cache
  let matched = invitationsCache.find(
    (inv) =>
      inv.invitationCode.toUpperCase() === cleanCode &&
      (inv.status === 'available' || inv.status === 'registration_pending_verification' || inv.status === 'reserved')
  );

  // 3. If not in cache, query Firestore
  if (!matched && db) {
    try {
      const q = query(collection(db, 'subjectInvitations'), where('invitationCode', '==', cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        matched = { id: d.id, ...d.data() } as SubjectInvitation;
      }
    } catch (e) {
      console.info('[Invitation Service] Query notice:', e);
    }
  }

  if (!matched) {
    return { success: false, error: 'Invalid invitation code or invitation already claimed.' };
  }

  if (matched.status === 'claimed') {
    return { success: false, error: 'This invitation has already been claimed and consumed.' };
  }
  if (matched.status === 'revoked') {
    return { success: false, error: 'This invitation has been revoked by department administration.' };
  }

  if (matched.invitationPassword && matched.invitationPassword !== cleanPassword) {
    return { success: false, error: 'Incorrect invitation password.' };
  }

  return { success: true, invitation: matched };
}

/**
 * Registers a teacher using a valid invitation code and password
 */
export async function registerSubjectTeacher(payload: {
  invitationId: string;
  subjectId: string;
  fullName: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; user?: any; error?: string; requiresVerification?: boolean }> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanName = payload.fullName.trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid Gmail or university email address.' };
  }

  if (!payload.password || payload.password.length < 6) {
    return { success: false, error: 'Please choose a password with at least 6 characters.' };
  }

  let firebaseUid = '';

  if (auth) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, payload.password);
      firebaseUid = cred.user.uid;
      await sendEmailVerification(cred.user);
    } catch (authErr: any) {
      if (authErr?.code === 'auth/email-already-in-use') {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, payload.password);
          firebaseUid = cred.user.uid;
          if (!cred.user.emailVerified) {
            await sendEmailVerification(cred.user);
          }
        } catch {
          return {
            success: false,
            error: 'An account with this email address already exists in Firebase Authentication. Please sign in or use a different email.',
          };
        }
      } else {
        return {
          success: false,
          error: authErr?.message || 'Failed to create teacher account in Firebase Authentication.',
        };
      }
    }
  }

  const effectiveUid = firebaseUid || `uid_${cleanEmail.replace(/[@.]/g, '_')}`;
  const nowIso = new Date().toISOString();

  // Reserve invitation on backend
  try {
    await fetch('/api/teacher-invitations/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitationCode: payload.invitationId,
        invitationPassword: payload.password,
        teacherEmail: cleanEmail,
        teacherUid: effectiveUid,
      }),
    });
  } catch (e) {}

  const teacherUserRecord = {
    id: `u-teacher-${effectiveUid}`,
    uid: effectiveUid,
    name: cleanName,
    email: cleanEmail,
    role: 'teacher',
    roles: ['teacher'],
    teacherStatus: 'registration_pending_verification',
    emailVerified: false,
    registeredDate: nowIso,
    department: 'Department of Computer Science & Software Engineering',
    isFirebaseUser: true,
  };

  const invUpdate = {
    status: 'registration_pending_verification' as const,
    teacherUid: effectiveUid,
    teacherName: cleanName,
    teacherEmail: cleanEmail,
  };

  invitationsCache = invitationsCache.map((inv) => (inv.id === payload.invitationId ? { ...inv, ...invUpdate } : inv));
  notifySubscribers();

  if (db) {
    try {
      await setDoc(doc(db, 'subjectInvitations', payload.invitationId), invUpdate, { merge: true });

      // Persist teacher profile in users/{uid} and users/{email}
      await setDoc(doc(db, 'users', effectiveUid), teacherUserRecord, { merge: true });
      await setDoc(doc(db, 'users', cleanEmail.replace(/[@.]/g, '_')), teacherUserRecord, { merge: true });

      await recordAuditLog({
        action: 'Subject Teacher Registration Initiated',
        performedBy: cleanEmail,
        details: `${cleanName} registered for subject ID ${payload.subjectId}. Awaiting email verification.`,
        category: 'user',
        status: 'success',
      });
    } catch (e) {
      console.info('[Invitation Service] Persistence notice:', e);
    }
  }

  return {
    success: true,
    requiresVerification: true,
    user: teacherUserRecord,
  };
}

/**
 * Finalizes teacher assignment and claims invitation after email is verified
 */
export async function finalizeTeacherVerificationAndClaim(
  teacherUid: string,
  email: string,
  subjectId: string,
  invitationId: string,
  invitationCode?: string,
  invitationPassword?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  // Try server claim endpoint
  if (invitationCode && invitationPassword) {
    try {
      const res = await fetch('/api/teacher-invitations/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationCode,
          invitationPassword,
          teacherUid,
          teacherEmail: cleanEmail,
          teacherName: 'Faculty Instructor',
          isEmailVerified: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return { success: true };
        }
      }
    } catch (e) {}
  }

  if (db) {
    try {
      // 1. Mark invitation as claimed
      await setDoc(
        doc(db, 'subjectInvitations', invitationId),
        {
          status: 'claimed',
          claimedAt: nowIso,
          claimedByUid: teacherUid,
          claimedByEmail: cleanEmail,
        },
        { merge: true }
      );

      // 2. Fetch subject details
      const subjSnap = await getDoc(doc(db, 'subjects', subjectId));
      const subjData = subjSnap.exists() ? subjSnap.data() : { name: subjectId, code: subjectId };

      // 3. Create SubjectTeacherAssignment document
      const assignmentId = `sta_${subjectId}_${teacherUid}_${Date.now()}`;
      const assignmentPayload = {
        id: assignmentId,
        subjectId,
        subjectName: subjData.name || subjectId,
        subjectCode: subjData.code || subjectId,
        assignedClass: subjData.assignedClass || '',
        teacherUid,
        teacherEmail: cleanEmail,
        teacherName: subjData.assignedTeacher || 'Faculty Instructor',
        status: 'active',
        assignedBy: 'System Invitation Claim',
        assignedAt: nowIso,
        invitationId,
      };

      await setDoc(doc(db, 'subjectTeacherAssignments', assignmentId), assignmentPayload);

      // 4. Update Subject doc
      await setDoc(
        doc(db, 'subjects', subjectId),
        {
          teacherUid,
          teacherEmail: cleanEmail,
          status: 'Assigned',
          teacherAssignedAt: nowIso,
          assignmentId,
          invitationStatus: 'claimed',
        },
        { merge: true }
      );

      // 5. Update user doc
      const userUpdate = {
        role: 'teacher',
        roles: ['teacher'],
        teacherStatus: 'active',
        emailVerified: true,
        teacherAssignedAt: nowIso,
      };

      await setDoc(doc(db, 'users', teacherUid), userUpdate, { merge: true });
      await setDoc(doc(db, 'users', cleanEmail.replace(/[@.]/g, '_')), userUpdate, { merge: true });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to finalize teacher assignment.' };
    }
  }

  return { success: true };
}

/**
 * Verifies invitation credentials and returns subject info
 */
export async function verifyTeacherInvitation(payload: {
  invitationCode: string;
  invitationPassword: string;
}): Promise<{
  success: boolean;
  invitationId?: string;
  invitationCode?: string;
  status?: string;
  subject?: {
    id: string;
    name: string;
    code: string;
    creditHours: number;
    assignedClass?: string;
  };
  error?: string;
}> {
  const result = await validateInvitationCredentials(payload.invitationCode, payload.invitationPassword);
  if (result.success && result.invitation) {
    return {
      success: true,
      invitationId: result.invitation.id,
      invitationCode: result.invitation.invitationCode,
      status: result.invitation.status,
      subject: {
        id: result.invitation.subjectId,
        name: result.invitation.subjectName || result.invitation.subjectCode || result.invitation.subjectId,
        code: result.invitation.subjectCode || '',
        creditHours: result.invitation.creditHours || 3,
        assignedClass: result.invitation.assignedClass,
      },
    };
  }
  return { success: false, error: result.error || 'Verification failed.' };
}

/**
 * Reserves a teacher invitation during email verification phase
 */
export async function reserveTeacherInvitation(payload: {
  invitationCode: string;
  invitationPassword: string;
  teacherEmail: string;
  teacherUid: string;
  teacherName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/teacher-invitations/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
      return { success: false, error: data.error };
    }
  } catch (e) {}
  return { success: true };
}

/**
 * Claims a teacher invitation after verification
 */
export async function claimTeacherInvitation(payload: {
  invitationCode: string;
  invitationPassword: string;
  teacherUid: string;
  teacherEmail: string;
  teacherName: string;
}): Promise<{ success: boolean; error?: string; subjectId?: string; subjectName?: string }> {
  try {
    const res = await fetch('/api/teacher-invitations/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, isEmailVerified: true }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
      return { success: false, error: data.error };
    }
  } catch (e) {}
  return { success: false, error: 'Server claim call failed.' };
}

/**
 * Fetches invitation for a subject
 */
export async function getSubjectInvitation(subjectId: string): Promise<SubjectInvitation | null> {
  if (!subjectId) return null;
  const cleanSubj = subjectId.trim();
  const cached = invitationsCache.find((i) => i.subjectId === cleanSubj);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/teacher-invitations/by-subject?subjectId=${encodeURIComponent(cleanSubj)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.invitation) {
        return data.invitation;
      }
    }
  } catch (e) {}
  return null;
}
