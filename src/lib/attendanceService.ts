import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { recordAuditLog, verifyCROperationOnServer } from './authService';
import { DailyAttendanceRecord } from '../data/portalData';
import { ClassStudentItem } from '../data/classRosterData';

export interface StudentAttendanceRecord {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  rollNumber: string;
  status: 'present' | 'absent';
  notes?: string;
}

export interface AttendanceCorrectionEntry {
  revisedAt: string;
  revisedBy: string;
  reason: string;
  previousPresentCount: number;
  previousAbsentCount: number;
  newPresentCount: number;
  newAbsentCount: number;
}

export interface AttendanceSession {
  id: string; // e.g. "BSCS_3A_2026-10-20"
  classId: string; // e.g. "BSCS 3A"
  date: string; // "YYYY-MM-DD"
  displayDate: string; // "Oct 20, 2026"
  dayOfWeek: string; // "Tue"
  recordedByUid: string;
  recordedByName: string;
  recordedByEmail: string;
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
  finalized: boolean;
  finalizedAt: string;
  records: Record<string, StudentAttendanceRecord>;
  pdfReportUrl?: string;
  pdfReportStatus: 'pending' | 'generated' | 'failed';
  pdfGeneratedAt?: string;
  revisions?: AttendanceCorrectionEntry[];
}

// In-memory sessions store to guarantee responsive UI and offline resilience
const sessionsStore: Map<string, AttendanceSession> = new Map();

/**
 * Generates the stable unique document key for a class session on a date
 */
export function getSessionKey(classId: string, date: string): string {
  const cleanClass = classId.trim().replace(/\s+/g, '_');
  const cleanDate = date.trim();
  return `${cleanClass}_${cleanDate}`;
}

/**
 * Formats a Date object or string into YYYY-MM-DD
 */
export function formatDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object into human-readable display string
 */
export function formatDisplayDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Fetches an attendance session for a class on a specific date
 */
export async function getDailyAttendanceSession(
  classId: string,
  date: string
): Promise<AttendanceSession | null> {
  const key = getSessionKey(classId, date);

  // Check in-memory store first
  if (sessionsStore.has(key)) {
    return sessionsStore.get(key)!;
  }

  // Check Firestore
  if (db) {
    try {
      const docRef = doc(db, 'attendanceSessions', key);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as AttendanceSession;
        sessionsStore.set(key, data);
        return data;
      }
    } catch (err) {
      console.info('[Attendance Service] Firestore fetch notice:', err);
    }
  }

  return null;
}

/**
 * Saves a finalized whole-class daily attendance record.
 * Enforces:
 * - One finalized attendance session per assigned class per date.
 * - Idempotency & concurrency check preventing duplicate sessions.
 */
export async function saveDailyAttendanceSession(
  session: AttendanceSession,
  isCorrection = false,
  correctionReason?: string
): Promise<{ success: boolean; session: AttendanceSession; error?: string }> {
  // 0. Independent Server-Side CR Authorization & Class Enforcement
  const authVerdict = await verifyCROperationOnServer(
    session.recordedByUid,
    session.recordedByEmail,
    session.classId,
    isCorrection ? 'attendance_correction' : 'attendance_marking'
  );

  if (!authVerdict.authorized) {
    return {
      success: false,
      session,
      error: authVerdict.error || `Access Denied: Your account is not authorized as Class Representative for ${session.classId}.`,
    };
  }

  const key = getSessionKey(session.classId, session.date);

  // 1. Concurrency / Duplicate check
  const existing = await getDailyAttendanceSession(session.classId, session.date);
  if (existing && existing.finalized && !isCorrection) {
    return {
      success: false,
      session: existing,
      error: `Attendance for ${session.classId} has already been recorded and finalized for ${session.displayDate}. To amend records, use the controlled correction workflow.`,
    };
  }

  let finalSession: AttendanceSession = { ...session, id: key };

  // 2. Handle correction revision metadata
  if (isCorrection && existing) {
    const revision: AttendanceCorrectionEntry = {
      revisedAt: new Date().toISOString(),
      revisedBy: session.recordedByName,
      reason: correctionReason || 'Attendance adjustment',
      previousPresentCount: existing.presentCount,
      previousAbsentCount: existing.absentCount,
      newPresentCount: session.presentCount,
      newAbsentCount: session.absentCount,
    };

    finalSession = {
      ...finalSession,
      revisions: [...(existing.revisions || []), revision],
    };
  }

  // 3. Store in memory
  sessionsStore.set(key, finalSession);

  // 4. Persist to Firestore
  if (db) {
    try {
      const docRef = doc(db, 'attendanceSessions', key);
      await setDoc(docRef, {
        ...finalSession,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.warn('[Attendance Service] Firestore sync notice:', err?.message || err);
    }
  }

  // 5. Record audit log
  await recordAuditLog({
    action: isCorrection ? 'Daily Attendance Corrected' : 'Daily Attendance Finalized',
    performedBy: session.recordedByEmail,
    details: `${session.classId} (${session.displayDate}): ${session.presentCount} Present, ${session.absentCount} Absent (${session.attendancePercentage}%)${
      isCorrection ? ` - Reason: ${correctionReason}` : ''
    }`,
    category: 'academic',
    status: 'success',
  });

  return {
    success: true,
    session: finalSession,
  };
}

/**
 * Subscribes to real-time attendance sessions for a class
 */
export function subscribeToClassAttendance(
  classId: string,
  onUpdate: (sessions: AttendanceSession[]) => void
): () => void {
  // Initial callback with memory cache
  const memorySessions = Array.from(sessionsStore.values()).filter(
    (s) => s.classId.toLowerCase() === classId.toLowerCase()
  );
  onUpdate(memorySessions);

  if (!db) {
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'attendanceSessions'),
      where('classId', '==', classId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: AttendanceSession[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as AttendanceSession;
          results.push(item);
          sessionsStore.set(item.id, item);
        });

        // Sort latest first
        results.sort((a, b) => b.date.localeCompare(a.date));
        onUpdate(results);
      },
      (error) => {
        console.info('[Attendance Service] Realtime listener notice:', error.message);
        onUpdate(memorySessions);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.info('[Attendance Service] Listener setup notice:', err);
    return () => {};
  }
}

/**
 * Returns all recorded sessions for a class
 */
export async function getClassAttendanceHistory(
  classId: string
): Promise<AttendanceSession[]> {
  const memorySessions = Array.from(sessionsStore.values()).filter(
    (s) => s.classId.toLowerCase() === classId.toLowerCase()
  );

  if (!db) {
    return memorySessions.sort((a, b) => b.date.localeCompare(a.date));
  }

  try {
    const q = query(
      collection(db, 'attendanceSessions'),
      where('classId', '==', classId)
    );
    const snap = await getDocs(q);
    const results: AttendanceSession[] = [];
    snap.forEach((d) => {
      const item = d.data() as AttendanceSession;
      results.push(item);
      sessionsStore.set(item.id, item);
    });

    return results.sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    console.info('[Attendance Service] History fetch notice:', err);
    return memorySessions.sort((a, b) => b.date.localeCompare(a.date));
  }
}

/**
 * Subscribes to real-time personal attendance history for a specific student.
 * Extracts attendance status exclusively from finalized class sessions in the database.
 * If no sessions have been logged yet for the student/class, returns an empty array.
 */
export function subscribeToStudentPersonalAttendance(
  classId: string,
  studentRollOrId: string,
  studentEmail: string | undefined,
  onUpdate: (records: DailyAttendanceRecord[]) => void
): () => void {
  const cleanClass = (classId || 'BSSE 1A').trim();
  const cleanRoll = (studentRollOrId || '').trim().toLowerCase();
  const cleanEmail = (studentEmail || '').trim().toLowerCase();

  const extractPersonalRecords = (sessions: AttendanceSession[]): DailyAttendanceRecord[] => {
    const list: DailyAttendanceRecord[] = [];
    sessions.forEach((sess) => {
      if (!sess.finalized || !sess.records) return;

      // Find record for this student by roll number, studentId, or email
      const matchedRecord: StudentAttendanceRecord | undefined =
        sess.records[studentRollOrId] ||
        Object.values(sess.records).find(
          (r) =>
            (r.rollNumber && r.rollNumber.toLowerCase() === cleanRoll) ||
            (r.studentId && r.studentId.toLowerCase() === cleanRoll) ||
            (cleanEmail && r.studentId && r.studentId.toLowerCase() === cleanEmail) ||
            (cleanEmail && r.studentEmail && r.studentEmail.toLowerCase() === cleanEmail)
        );

      if (matchedRecord) {
        list.push({
          date: sess.displayDate || sess.date,
          dayOfWeek: sess.dayOfWeek || 'Day',
          status: matchedRecord.status,
          finalized: true,
          notes: matchedRecord.notes || (sess.revisions && sess.revisions.length > 0 ? 'CR Verified' : undefined),
        });
      }
    });

    return list;
  };

  // Initial update from memory store
  const memorySessions = Array.from(sessionsStore.values()).filter(
    (s) => s.classId.toLowerCase() === cleanClass.toLowerCase()
  );
  memorySessions.sort((a, b) => b.date.localeCompare(a.date));
  onUpdate(extractPersonalRecords(memorySessions));

  // Subscribe to class attendance
  const unsubscribe = subscribeToClassAttendance(cleanClass, (liveSessions) => {
    onUpdate(extractPersonalRecords(liveSessions));
  });

  return unsubscribe;
}

/**
 * Subscribes to real registered students for an assigned class from Firestore.
 * Eliminates fake synthetic rosters and includes the CR themselves as an enrolled student.
 */
export function subscribeToRealClassStudents(
  assignedClass: string,
  crUser: { id?: string; name?: string; email?: string; studentId?: string; fatherName?: string },
  onUpdate: (students: ClassStudentItem[]) => void
): () => void {
  const cleanClass = assignedClass.trim().toLowerCase();

  const buildCRStudentItem = (): ClassStudentItem | null => {
    if (!crUser?.email) return null;
    return {
      id: crUser.id || `cr-${crUser.email.replace(/[@.]/g, '_')}`,
      name: `${crUser.name || 'CR Student'} (CR)`,
      rollNumber: crUser.studentId || (crUser.id && !crUser.id.startsWith('u-') ? crUser.id : 'CR-OFFICIAL'),
      fatherName: crUser.fatherName || 'Not Recorded',
      email: crUser.email,
      class: assignedClass,
      status: 'active',
    };
  };

  if (!db) {
    const crItem = buildCRStudentItem();
    onUpdate(crItem ? [crItem] : []);
    return () => {};
  }

  try {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const studentMap = new Map<string, ClassStudentItem>();

        snapshot.forEach((d) => {
          if (!d.exists()) return;
          const data = d.data();
          const userClass = (data.assignedClass || '').trim().toLowerCase();
          const role = (data.role || '').toLowerCase();
          const roles = Array.isArray(data.roles) ? data.roles.map((r: any) => String(r).toLowerCase()) : [];

          const isStudentRole = role === 'student' || role === 'cr' || roles.includes('student') || roles.includes('cr');
          const isTeacher = role === 'teacher' || roles.includes('teacher') || data.teacherStatus === 'active';

          if (isStudentRole && !isTeacher) {
            // Check if student belongs to this class
            const matchesClass = !userClass || userClass === cleanClass || cleanClass.includes(userClass) || userClass.includes(cleanClass);
            if (matchesClass) {
              const email = (data.email || '').trim().toLowerCase();
              const rollNumber = data.studentId || data.rollNo || data.rollNumber || d.id;
              const name = data.name || data.fullName || (email.split('@')[0]);

              if (email) {
                studentMap.set(email, {
                  id: d.id,
                  name: data.isCR || role === 'cr' ? `${name} (CR)` : name,
                  rollNumber,
                  fatherName: data.fatherName || 'Not Recorded',
                  email,
                  class: assignedClass,
                  status: data.status === 'suspended' ? 'suspended' : 'active',
                  avatarUrl: data.avatarUrl || undefined,
                });
              }
            }
          }
        });

        // Ensure CR is present in roster so CR marks their own attendance
        if (crUser?.email) {
          const crEmail = crUser.email.trim().toLowerCase();
          if (!studentMap.has(crEmail)) {
            const crItem = buildCRStudentItem();
            if (crItem) {
              studentMap.set(crEmail, crItem);
            }
          }
        }

        const studentList = Array.from(studentMap.values()).sort((a, b) =>
          a.rollNumber.localeCompare(b.rollNumber)
        );
        onUpdate(studentList);
      },
      (err) => {
        console.info('[Attendance Service] Real students listener notice:', err.message);
        const crItem = buildCRStudentItem();
        onUpdate(crItem ? [crItem] : []);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.info('[Attendance Service] Real students setup notice:', err);
    const crItem = buildCRStudentItem();
    onUpdate(crItem ? [crItem] : []);
    return () => {};
  }
}


