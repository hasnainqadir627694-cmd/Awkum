import { db } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { recordAuditLog } from './authService';

export interface SchedulePeriodItem {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  periodIndex: number;
  periodLabel: string; // e.g. "09:00 AM - 10:25 AM"
  startTime: string;   // e.g. "09:00 AM"
  endTime: string;     // e.g. "10:25 AM"
  subjectId: string;   // canonical subject ID if matched, or raw string
  subjectCode: string; // e.g. "CS100"
  subjectName: string; // e.g. "Programming Fundamentals"
  teacherName?: string;
  room?: string;
  isMatched: boolean;
  matchWarning?: string;
}

export interface WeeklySchedule {
  id: string;
  classId: string;
  semester?: string;
  effectiveWeek?: string;
  status: 'draft' | 'published';
  publishedVersion: number;
  publishedAt?: string;
  publishedBy?: {
    uid: string;
    email: string;
    name: string;
  };
  sourceImageUrl?: string;
  items: SchedulePeriodItem[];
  days: string[];
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

function cleanClassId(classId: string): string {
  return classId.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Strips undefined values for safe Firestore mutations
 */
function sanitizePayload(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = sanitizePayload(val);
    }
  }
  return cleaned;
}

/**
 * Subscribes in real time to the official published schedule for a specific class/section
 */
export function subscribeToPublishedSchedule(
  classId: string,
  onUpdate: (schedule: WeeklySchedule | null) => void
): () => void {
  const cleanId = cleanClassId(classId);
  const docRef = doc(db, 'schedules', `schedule_${cleanId}`);

  try {
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.status === 'published' && Array.isArray(data.items)) {
            const schedule: WeeklySchedule = {
              id: snapshot.id,
              classId: data.classId || classId,
              semester: data.semester || '',
              effectiveWeek: data.effectiveWeek || '',
              status: 'published',
              publishedVersion: data.publishedVersion || 1,
              publishedAt: data.publishedAt || new Date().toISOString(),
              publishedBy: data.publishedBy || undefined,
              sourceImageUrl: data.sourceImageUrl || '',
              items: data.items || [],
              days: data.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
              warnings: data.warnings || [],
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
            onUpdate(schedule);
            return;
          }
        }
        onUpdate(null);
      },
      (error) => {
        console.info('[Schedule Service] Real-time subscription notice:', error.message);
        onUpdate(null);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.info('[Schedule Service] Subscription init notice:', err);
    onUpdate(null);
    return () => {};
  }
}

/**
 * Fetches one-shot published schedule for a class
 */
export async function getPublishedSchedule(classId: string): Promise<WeeklySchedule | null> {
  const cleanId = cleanClassId(classId);
  try {
    const docRef = doc(db, 'schedules', `schedule_${cleanId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.status === 'published') {
        return {
          id: snap.id,
          classId: data.classId || classId,
          semester: data.semester || '',
          effectiveWeek: data.effectiveWeek || '',
          status: 'published',
          publishedVersion: data.publishedVersion || 1,
          publishedAt: data.publishedAt || new Date().toISOString(),
          publishedBy: data.publishedBy || undefined,
          sourceImageUrl: data.sourceImageUrl || '',
          items: data.items || [],
          days: data.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          warnings: data.warnings || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.info('[Schedule Service] Fetch published notice:', err);
  }
  return null;
}

/**
 * Fetches current draft schedule for CR review
 */
export async function getScheduleDraft(classId: string): Promise<WeeklySchedule | null> {
  const cleanId = cleanClassId(classId);
  try {
    const docRef = doc(db, 'scheduleDrafts', `draft_${cleanId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        classId: data.classId || classId,
        semester: data.semester || '',
        effectiveWeek: data.effectiveWeek || '',
        status: 'draft',
        publishedVersion: data.publishedVersion || 0,
        sourceImageUrl: data.sourceImageUrl || '',
        items: data.items || [],
        days: data.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        warnings: data.warnings || [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.info('[Schedule Service] Fetch draft notice:', err);
  }
  return null;
}

/**
 * Saves or updates a schedule draft in Firestore
 */
export async function saveScheduleDraft(
  draft: WeeklySchedule
): Promise<{ success: boolean; error?: string }> {
  const cleanId = cleanClassId(draft.classId);
  const docId = `draft_${cleanId}`;

  try {
    const payload = sanitizePayload({
      ...draft,
      id: docId,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'scheduleDrafts', docId), payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('[Schedule Service] Save draft error:', err);
    return { success: false, error: err?.message || 'Failed to save schedule draft.' };
  }
}

/**
 * Confirms and publishes a verified weekly schedule for a class/section.
 * Immediately makes it authoritative for all students in real time.
 */
export async function publishSchedule(
  schedule: WeeklySchedule,
  crUser: { uid: string; email: string; name: string }
): Promise<{ success: boolean; version?: number; error?: string }> {
  const cleanId = cleanClassId(schedule.classId);
  const scheduleDocId = `schedule_${cleanId}`;

  try {
    // 1. Get current version if schedule doc exists
    let newVersion = 1;
    const currentSnap = await getDoc(doc(db, 'schedules', scheduleDocId));
    if (currentSnap.exists()) {
      const currData = currentSnap.data();
      if (currData.publishedVersion && typeof currData.publishedVersion === 'number') {
        newVersion = currData.publishedVersion + 1;
      }
    }

    const publishedAt = new Date().toISOString();

    const publishedPayload = sanitizePayload({
      id: scheduleDocId,
      classId: schedule.classId,
      semester: schedule.semester || 'Spring 2026',
      effectiveWeek: schedule.effectiveWeek || 'Current Semester',
      status: 'published',
      publishedVersion: newVersion,
      publishedAt,
      publishedBy: {
        uid: crUser.uid,
        email: crUser.email,
        name: crUser.name,
      },
      sourceImageUrl: schedule.sourceImageUrl || '',
      items: schedule.items,
      days: schedule.days,
      warnings: schedule.warnings || [],
      createdAt: schedule.createdAt || publishedAt,
      updatedAt: publishedAt,
      serverUpdatedAt: serverTimestamp(),
    });

    // 2. Persist authoritative published schedule document
    await setDoc(doc(db, 'schedules', scheduleDocId), publishedPayload);

    // 3. Clear draft status or update draft to published
    await setDoc(
      doc(db, 'scheduleDrafts', `draft_${cleanId}`),
      { status: 'published', publishedVersion: newVersion, updatedAt: publishedAt },
      { merge: true }
    );

    // 4. Record audit log for security audit
    await recordAuditLog({
      action: 'Weekly Schedule Published',
      performedBy: crUser.email,
      details: `Class Representative ${crUser.name} published Weekly Timetable v${newVersion} for ${schedule.classId} (${schedule.items.length} periods)`,
      category: 'academic',
      status: 'success',
    });

    return { success: true, version: newVersion };
  } catch (err: any) {
    console.error('[Schedule Service] Publish error:', err);
    return { success: false, error: err?.message || 'Failed to publish official schedule.' };
  }
}
