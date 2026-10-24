import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { SubjectConfig, SubjectTeacherAssignment } from '../data/adminData';
import { recordAuditLog } from './authService';

// In-memory cache for zero-latency retrieval (Starts completely empty)
let subjectsCache: SubjectConfig[] = [];
const subjectSubscribers = new Set<(subjects: SubjectConfig[]) => void>();

function notifySubjectSubscribers() {
  const current = [...subjectsCache];
  subjectSubscribers.forEach((cb) => {
    try {
      cb(current);
    } catch (e) {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('classhub_subjects_changed', { detail: current }));
  }
}

export function getCachedSubjects(): SubjectConfig[] {
  return subjectsCache;
}

/**
 * Direct one-shot fetch for curriculum subjects from Cloud Firestore
 */
export async function getAllSubjectsFromFirestore(): Promise<SubjectConfig[]> {
  if (!db) return [...subjectsCache];
  try {
    const snap = await Promise.race([
      getDocs(collection(db, 'subjects')),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (!snap) {
      return [...subjectsCache];
    }
    const list: SubjectConfig[] = [];
    snap.forEach((d) => {
      if (d.exists()) {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || 'Subject',
          code: data.code || '',
          creditHours: Number(data.creditHours) || 3,
          assignedTeacher: data.assignedTeacher || null,
          teacherEmail: data.teacherEmail || undefined,
          teacherUid: data.teacherUid || undefined,
          status: data.status || (data.assignedTeacher ? 'Assigned' : 'Unassigned'),
          assignedClass: data.assignedClass || undefined,
          description: data.description || undefined,
          isActive: data.isActive !== false,
        });
      }
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    subjectsCache = list;
    notifySubjectSubscribers();
    return list;
  } catch (err) {
    console.info('[Subject Service] Direct fetch error:', err);
    return [...subjectsCache];
  }
}

/**
 * Subscribes to real-time curriculum subjects from Cloud Firestore.
 * Does NOT auto-seed default subjects. If empty, it stays genuinely empty.
 */
export function subscribeToCurriculumSubjects(
  onUpdate: (subjects: SubjectConfig[]) => void
): () => void {
  subjectSubscribers.add(onUpdate);
  onUpdate([...subjectsCache]);

  if (!db) {
    return () => {
      subjectSubscribers.delete(onUpdate);
    };
  }

  try {
    const subjectsCol = collection(db, 'subjects');
    const unsubscribe = onSnapshot(
      subjectsCol,
      (snapshot) => {
        const list: SubjectConfig[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            list.push({
              id: d.id,
              name: data.name || 'Subject',
              code: data.code || '',
              creditHours: Number(data.creditHours) || 3,
              assignedTeacher: data.assignedTeacher || null,
              teacherEmail: data.teacherEmail || undefined,
              teacherUid: data.teacherUid || undefined,
              status: data.status || (data.assignedTeacher ? 'Assigned' : 'Unassigned'),
              assignedClass: data.assignedClass || undefined,
              description: data.description || undefined,
              isActive: data.isActive !== false,
            });
          }
        });

        // Sort alphabetically by subject name
        list.sort((a, b) => a.name.localeCompare(b.name));
        subjectsCache = list;
        notifySubjectSubscribers();
      },
      (error) => {
        console.info('[Subject Service] Subjects listener notice:', error.message);
        onUpdate([...subjectsCache]);
      }
    );

    return () => {
      subjectSubscribers.delete(onUpdate);
      unsubscribe();
    };
  } catch (err) {
    console.info('[Subject Service] Subscribe notice:', err);
    return () => {
      subjectSubscribers.delete(onUpdate);
    };
  }
}

/**
 * Strips any undefined fields and recursively converts undefined or omits them,
 * guaranteeing Firestore setDoc never throws: 'Unsupported field value: undefined'.
 */
function cleanPayloadForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      continue;
    }
    if (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      !(val instanceof Date) &&
      !(val?.constructor?.name === 'FieldValue')
    ) {
      cleaned[key] = cleanPayloadForFirestore(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

/**
 * Creates or updates an official curriculum subject in Firestore
 */
export async function saveCurriculumSubject(
  subject: SubjectConfig,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  const cleanName = subject.name.trim();
  const cleanCode = subject.code.toUpperCase().trim();

  if (!cleanName || !cleanCode) {
    return { success: false, error: 'Subject name and course code are required.' };
  }

  const docId = subject.id || `subj_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  const itemToSave: SubjectConfig = {
    id: docId,
    name: cleanName,
    code: cleanCode,
    creditHours: Number(subject.creditHours) || 3,
    status: subject.assignedTeacher ? 'Assigned' : 'Unassigned',
    assignedTeacher: subject.assignedTeacher || null,
    teacherEmail: subject.teacherEmail || undefined,
    teacherUid: subject.teacherUid || undefined,
    assignedClass: subject.assignedClass || undefined,
    description: subject.description ? subject.description.trim() : undefined,
    isActive: subject.isActive !== false,
  };

  // Update memory cache
  const existingIdx = subjectsCache.findIndex((s) => s.id === docId);
  if (existingIdx >= 0) {
    subjectsCache[existingIdx] = itemToSave;
  } else {
    subjectsCache.push(itemToSave);
  }
  notifySubjectSubscribers();

  if (db) {
    try {
      // Build an explicit Firestore payload where no property is undefined
      const firestorePayload = cleanPayloadForFirestore({
        id: docId,
        name: cleanName,
        code: cleanCode,
        creditHours: Number(subject.creditHours) || 3,
        status: subject.assignedTeacher ? 'Assigned' : 'Unassigned',
        assignedTeacher: subject.assignedTeacher || null,
        teacherEmail: subject.teacherEmail || null,
        teacherUid: subject.teacherUid || null,
        assignedClass: subject.assignedClass || null,
        description: subject.description ? subject.description.trim() : null,
        isActive: subject.isActive !== false,
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'subjects', docId), firestorePayload, { merge: true });

      await recordAuditLog({
        action: 'Curriculum Subject Configured',
        performedBy: adminEmail,
        details: `Subject ${itemToSave.name} (${itemToSave.code}) configured - ${itemToSave.creditHours} Credit Hours`,
        category: 'academic',
        status: 'success',
      });

      return { success: true };
    } catch (err: any) {
      console.info('[Subject Service] Save error:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to save subject to Firestore.' };
    }
  }

  return { success: true };
}

/**
 * Explicitly assigns a verified faculty teacher to a specific custom subject
/**
 * Explicitly assigns a verified faculty teacher to a specific custom subject.
 * Creates an authoritative SubjectTeacherAssignment record, updates the Subject doc,
 * sets active teacher status, and updates user roles while preserving existing roles.
 */
export async function assignSubjectTeacher(payload: {
  subjectId: string;
  teacher: {
    name: string;
    email: string;
    uid: string;
    department?: string;
    studentId?: string;
  };
  adminEmail: string;
}): Promise<{ success: boolean; error?: string; assignmentId?: string }> {
  const { subjectId, teacher, adminEmail } = payload;
  let subject = subjectsCache.find((s) => s.id === subjectId);

  // If not in cache, try fetching from Firestore
  if (!subject && db) {
    try {
      const snap = await getDocs(query(collection(db, 'subjects'), where('__name__', '==', subjectId)));
      if (!snap.empty) {
        const d = snap.docs[0];
        subject = { id: d.id, ...d.data() } as SubjectConfig;
      }
    } catch (e) {}
  }

  if (!subject) {
    return { success: false, error: 'Subject not found in curriculum registry.' };
  }

  const cleanTeacherEmail = teacher.email.trim().toLowerCase();
  const cleanTeacherName = teacher.name.trim();
  const cleanTeacherUid = teacher.uid.trim();

  if (!cleanTeacherUid || cleanTeacherUid.startsWith('uid_')) {
    return { success: false, error: 'Target teacher must have a verified Firebase Authentication UID.' };
  }

  const assignmentDocId = `sta_${subject.id}_${cleanTeacherUid}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newAssignment: SubjectTeacherAssignment = {
    id: assignmentDocId,
    subjectId: subject.id,
    subjectName: subject.name,
    subjectCode: subject.code,
    assignedClass: subject.assignedClass || '',
    teacherUid: cleanTeacherUid,
    teacherEmail: cleanTeacherEmail,
    teacherName: cleanTeacherName,
    status: 'active',
    assignedBy: adminEmail,
    assignedAt: nowIso,
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
    lastConfirmedActiveAt: nowIso,
  };

  const updatedSubject: SubjectConfig = {
    ...subject,
    assignedTeacher: cleanTeacherName,
    teacherEmail: cleanTeacherEmail,
    teacherUid: cleanTeacherUid,
    status: 'Assigned',
    teacherAssignedAt: nowIso,
    assignmentId: assignmentDocId,
    lastConfirmedActiveAt: nowIso,
  };

  // Update memory cache immediately
  const idx = subjectsCache.findIndex((s) => s.id === subjectId);
  if (idx >= 0) {
    subjectsCache[idx] = updatedSubject;
  }
  notifySubjectSubscribers();

  if (db) {
    try {
      // 1. Revoke any prior active assignment for this exact subject
      try {
        const prevSnap = await getDocs(
          query(
            collection(db, 'subjectTeacherAssignments'),
            where('subjectId', '==', subjectId),
            where('status', '==', 'active')
          )
        );
        for (const prevDoc of prevSnap.docs) {
          await setDoc(
            doc(db, 'subjectTeacherAssignments', prevDoc.id),
            {
              status: 'revoked',
              revokedAt: nowIso,
              revokedBy: adminEmail,
              revocationReason: `Replaced by ${cleanTeacherName}`,
            },
            { merge: true }
          );
        }
      } catch (prevErr) {
        console.info('[Subject Service] Notice revoking prior assignment:', prevErr);
      }

      // 2. Persist new SubjectTeacherAssignment document
      await setDoc(doc(db, 'subjectTeacherAssignments', assignmentDocId), newAssignment);

      // 3. Update canonical Subject document
      await setDoc(
        doc(db, 'subjects', subjectId),
        cleanPayloadForFirestore({
          assignedTeacher: cleanTeacherName,
          teacherEmail: cleanTeacherEmail,
          teacherUid: cleanTeacherUid,
          status: 'Assigned',
          teacherAssignedAt: nowIso,
          assignmentId: assignmentDocId,
          lastConfirmedActiveAt: nowIso,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );

      // 4. Update Teacher's user profile: maintain role array preserving Student or CR roles
      const userRefUid = doc(db, 'users', cleanTeacherUid);
      const userRefEmail = doc(db, 'users', cleanTeacherEmail.replace(/[@.]/g, '_'));

      const userUpdatePayload = {
        role: 'teacher',
        teacherStatus: 'active',
        teacherAssignedAt: nowIso,
        teacherAssignedBy: adminEmail,
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRefUid, userUpdatePayload, { merge: true }).catch(() => {});
      await setDoc(userRefEmail, userUpdatePayload, { merge: true }).catch(() => {});

      // 5. Record immutable security audit log
      await recordAuditLog({
        action: 'Subject Teacher Assigned',
        performedBy: adminEmail,
        details: `Assigned faculty member ${cleanTeacherName} (${cleanTeacherEmail}, UID: ${cleanTeacherUid.slice(0, 8)}...) to subject ${subject.name} (${subject.code})`,
        category: 'academic',
        status: 'success',
      });

      return { success: true, assignmentId: assignmentDocId };
    } catch (err: any) {
      console.error('[Subject Service] Assign subject teacher error:', err);
      return { success: false, error: err?.message || 'Failed to persist subject teacher assignment.' };
    }
  }

  return { success: true, assignmentId: assignmentDocId };
}

/**
 * Backward compatibility alias for existing callers
 */
export async function assignTeacherToSubject(
  subjectId: string,
  teacher: { name: string; email: string; uid?: string },
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  return assignSubjectTeacher({
    subjectId,
    teacher: {
      name: teacher.name,
      email: teacher.email,
      uid: teacher.uid || '',
    },
    adminEmail,
  });
}

/**
 * Explicitly revokes teacher access from a specific subject.
 * Preserves the subject, student enrollments, attendance history, assignments, documents, and submissions.
 */
export async function revokeSubjectTeacher(payload: {
  subjectId: string;
  adminEmail: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { subjectId, adminEmail, reason } = payload;
  const subject = subjectsCache.find((s) => s.id === subjectId);
  const nowIso = new Date().toISOString();
  const revocationReason = reason || 'Revoked by Master Administrator';

  const updatedSubject: SubjectConfig = {
    ...(subject || { id: subjectId, name: 'Subject', code: 'SUBJ', creditHours: 3 }),
    assignedTeacher: null,
    teacherEmail: null,
    teacherUid: null,
    status: 'Unassigned',
    teacherAssignedAt: null,
    assignmentId: null,
  };

  const idx = subjectsCache.findIndex((s) => s.id === subjectId);
  if (idx >= 0) {
    subjectsCache[idx] = updatedSubject;
  }
  notifySubjectSubscribers();

  if (db) {
    try {
      // 1. Mark active assignments in subjectTeacherAssignments as revoked
      const snap = await getDocs(
        query(
          collection(db, 'subjectTeacherAssignments'),
          where('subjectId', '==', subjectId),
          where('status', '==', 'active')
        )
      );

      let revokedTeacherUid = '';
      let revokedTeacherEmail = '';
      let revokedTeacherName = '';

      for (const d of snap.docs) {
        const data = d.data();
        revokedTeacherUid = data.teacherUid || '';
        revokedTeacherEmail = data.teacherEmail || '';
        revokedTeacherName = data.teacherName || '';

        await setDoc(
          doc(db, 'subjectTeacherAssignments', d.id),
          {
            status: 'revoked',
            revokedAt: nowIso,
            revokedBy: adminEmail,
            revocationReason,
          },
          { merge: true }
        );
      }

      // 2. Update canonical Subject doc to unassigned
      await setDoc(
        doc(db, 'subjects', subjectId),
        {
          assignedTeacher: null,
          teacherEmail: null,
          teacherUid: null,
          status: 'Unassigned',
          teacherAssignedAt: null,
          assignmentId: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3. Update teacher user doc: check if they have any other active subjects
      if (revokedTeacherUid) {
        const otherSnap = await getDocs(
          query(
            collection(db, 'subjectTeacherAssignments'),
            where('teacherUid', '==', revokedTeacherUid),
            where('status', '==', 'active')
          )
        );

        if (otherSnap.empty) {
          // No more active subjects for this teacher -> set teacherStatus: 'revoked'
          await setDoc(
            doc(db, 'users', revokedTeacherUid),
            {
              teacherStatus: 'revoked',
              teacherRevokedAt: nowIso,
              teacherRevokedBy: adminEmail,
              teacherRevocationReason: revocationReason,
            },
            { merge: true }
          ).catch(() => {});

          if (revokedTeacherEmail) {
            await setDoc(
              doc(db, 'users', revokedTeacherEmail.replace(/[@.]/g, '_')),
              {
                teacherStatus: 'revoked',
                teacherRevokedAt: nowIso,
                teacherRevokedBy: adminEmail,
                teacherRevocationReason: revocationReason,
              },
              { merge: true }
            ).catch(() => {});
          }
        }
      }

      // 4. Record audit log
      await recordAuditLog({
        action: 'Subject Teacher Access Revoked',
        performedBy: adminEmail,
        details: `Revoked teacher access from subject ${subject?.name || subjectId} (${subject?.code || ''}) - Teacher: ${revokedTeacherName || revokedTeacherEmail || 'None'} - Reason: ${revocationReason}`,
        category: 'academic',
        status: 'warning',
      });

      return { success: true };
    } catch (err: any) {
      console.error('[Subject Service] Revoke subject teacher error:', err);
      return { success: false, error: err?.message || 'Failed to revoke subject teacher access.' };
    }
  }

  return { success: true };
}

/**
 * Confirms and keeps the current teacher active without recreating the assignment.
 */
export async function keepSubjectTeacherActive(payload: {
  subjectId: string;
  adminEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  const { subjectId, adminEmail } = payload;
  const subject = subjectsCache.find((s) => s.id === subjectId);
  const nowIso = new Date().toISOString();

  if (subject) {
    subject.lastConfirmedActiveAt = nowIso;
    notifySubjectSubscribers();
  }

  if (db) {
    try {
      await setDoc(
        doc(db, 'subjects', subjectId),
        {
          lastConfirmedActiveAt: nowIso,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const snap = await getDocs(
        query(
          collection(db, 'subjectTeacherAssignments'),
          where('subjectId', '==', subjectId),
          where('status', '==', 'active')
        )
      );

      for (const d of snap.docs) {
        await setDoc(
          doc(db, 'subjectTeacherAssignments', d.id),
          {
            lastConfirmedActiveAt: nowIso,
          },
          { merge: true }
        );
      }

      await recordAuditLog({
        action: 'Subject Teacher Kept Active',
        performedBy: adminEmail,
        details: `Master Admin confirmed active teacher status for ${subject?.name || subjectId} (${subject?.code || ''}) - Teacher: ${subject?.assignedTeacher || 'Active'}`,
        category: 'academic',
        status: 'success',
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to confirm active teacher status.' };
    }
  }

  return { success: true };
}

/**
 * Subscribes to real-time active assignment for a given subject
 */
export function subscribeToSubjectTeacherAssignment(
  subjectId: string,
  onUpdate: (assignment: SubjectTeacherAssignment | null) => void
): () => void {
  if (!db || !subjectId) {
    onUpdate(null);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'subjectTeacherAssignments'),
      where('subjectId', '==', subjectId),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const docData = snap.docs[0].data() as SubjectTeacherAssignment;
          onUpdate(docData);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.info('[Subject Service] Subject teacher assignment notice:', err.message);
        onUpdate(null);
      }
    );

    return unsubscribe;
  } catch (e) {
    onUpdate(null);
    return () => {};
  }
}

/**
 * Subscribes to all subjects assigned to a given teacher by UID or Email
 */
export function subscribeToTeacherAssignedSubjects(
  teacherIdentifier: string | { uid?: string; email?: string },
  onUpdate: (subjects: SubjectConfig[]) => void
): () => void {
  const cleanUid = (
    typeof teacherIdentifier === 'object' ? teacherIdentifier.uid : teacherIdentifier
  )?.trim().toLowerCase() || '';
  const cleanEmail = (
    typeof teacherIdentifier === 'object' ? teacherIdentifier.email : teacherIdentifier
  )?.trim().toLowerCase() || '';

  const getFilteredLocal = () =>
    subjectsCache.filter((s) => {
      if (s.status !== 'Assigned') return false;
      const sUid = (s.teacherUid || '').trim().toLowerCase();
      const sEmail = (s.teacherEmail || '').trim().toLowerCase();
      return (cleanUid && sUid === cleanUid) || (cleanEmail && sEmail === cleanEmail);
    });

  onUpdate(getFilteredLocal());

  if (!db || (!cleanUid && !cleanEmail)) {
    return () => {};
  }

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'subjects'),
      (snap) => {
        const list: SubjectConfig[] = [];
        snap.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            const dUid = (data.teacherUid || '').trim().toLowerCase();
            const dEmail = (data.teacherEmail || '').trim().toLowerCase();
            const matchesUid = cleanUid && dUid && dUid === cleanUid;
            const matchesEmail = cleanEmail && dEmail && dEmail === cleanEmail;
            if ((matchesUid || matchesEmail) && data.status === 'Assigned') {
              list.push({
                id: d.id,
                name: data.name || 'Subject',
                code: data.code || '',
                creditHours: Number(data.creditHours) || 3,
                assignedTeacher: data.assignedTeacher || null,
                teacherEmail: data.teacherEmail || undefined,
                teacherUid: data.teacherUid || undefined,
                status: 'Assigned',
                assignedClass: data.assignedClass || undefined,
                description: data.description || undefined,
                isActive: data.isActive !== false,
                teacherAssignedAt: data.teacherAssignedAt || undefined,
                assignmentId: data.assignmentId || undefined,
                lastConfirmedActiveAt: data.lastConfirmedActiveAt || undefined,
              });
            }
          }
        });
        onUpdate(list);
      },
      (err) => {
        console.info('[Subject Service] Teacher assigned subjects listener notice:', err.message);
        onUpdate(getFilteredLocal());
      }
    );

    return unsubscribe;
  } catch (e) {
    onUpdate(getFilteredLocal());
    return () => {};
  }
}

/**
 * Safely removes or unassigns a subject from curriculum.
 * Checks for historical dependencies (assignments, documents).
 */
export async function removeCurriculumSubject(
  subjectId: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  const subject = subjectsCache.find((s) => s.id === subjectId);
  if (!subject) {
    return { success: false, error: 'Subject not found.' };
  }

  if (db) {
    try {
      // Check if dependent assignments exist
      const asgSnap = await getDocs(
        query(collection(db, 'assignments'), where('subjectId', '==', subjectId))
      );

      // Check if dependent course documents exist
      const docSnap = await getDocs(
        query(collection(db, 'documents'), where('subjectId', '==', subjectId))
      );

      const hasDependencies = !asgSnap.empty || !docSnap.empty;

      if (hasDependencies) {
        // Soft deactivate to preserve academic history & referential integrity
        await setDoc(
          doc(db, 'subjects', subjectId),
          { status: 'Unassigned', assignedTeacher: null, teacherEmail: null, deactivated: true, updatedAt: serverTimestamp() },
          { merge: true }
        );

        await recordAuditLog({
          action: 'Subject Deactivated',
          performedBy: adminEmail,
          details: `Subject ${subject.name} (${subject.code}) deactivated. Historical assignments (${asgSnap.size}) and documents (${docSnap.size}) preserved.`,
          category: 'academic',
          status: 'warning',
        });

        // Update local cache
        subjectsCache = subjectsCache.map((s) =>
          s.id === subjectId ? { ...s, status: 'Unassigned', assignedTeacher: null, teacherEmail: undefined } : s
        );
        notifySubjectSubscribers();
        return { success: true };
      }

      // No dependencies: safely delete doc
      await deleteDoc(doc(db, 'subjects', subjectId));
      subjectsCache = subjectsCache.filter((s) => s.id !== subjectId);
      notifySubjectSubscribers();

      await recordAuditLog({
        action: 'Subject Removed',
        performedBy: adminEmail,
        details: `Removed subject ${subject.name} (${subject.code})`,
        category: 'academic',
        status: 'warning',
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to remove subject.' };
    }
  }

  subjectsCache = subjectsCache.filter((s) => s.id !== subjectId);
  notifySubjectSubscribers();
  return { success: true };
}
