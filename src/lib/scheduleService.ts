import { db } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { recordAuditLog } from './authService';
import {
  RecurringSchedule,
  RecurringScheduleEntry,
  ScheduleOverrideItem,
  WeekdayCode,
  WEEKDAYS_ORDER,
} from './scheduleEngine';

// Backward-compatible interface alias for existing callers
export type WeeklySchedule = RecurringSchedule;
export type SchedulePeriodItem = RecurringScheduleEntry;

export interface ScheduleHistoryRecord {
  id: string;
  scheduleId: string;
  classId: string;
  version: number;
  startDate: string;
  endDate: string;
  publishedAt: string;
  publishedBy: {
    uid: string;
    email: string;
    name: string;
  };
  items: RecurringScheduleEntry[];
  activeDays: WeekdayCode[];
  totalClasses: number;
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
 * Extracts distinct active weekdays that have at least one scheduled class.
 */
export function extractActiveWeekdays(items: RecurringScheduleEntry[]): WeekdayCode[] {
  const set = new Set<WeekdayCode>();
  for (const item of items) {
    if (item.day) set.add(item.day);
  }
  return WEEKDAYS_ORDER.filter((d) => set.has(d));
}

/**
 * Subscribes in real time to the official published recurring schedule for a specific class/section
 */
export function subscribeToPublishedSchedule(
  classId: string,
  onUpdate: (schedule: RecurringSchedule | null) => void
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
            const schedule: RecurringSchedule = {
              id: snapshot.id,
              classId: data.classId || classId,
              semester: data.semester || 'Fall 2026',
              startDate: data.startDate || '2026-09-01',
              endDate: data.endDate || '2027-01-31',
              status: 'published',
              publishedVersion: data.publishedVersion || 1,
              publishedAt: data.publishedAt || new Date().toISOString(),
              publishedBy: data.publishedBy || undefined,
              items: data.items || [],
              activeDays: data.activeDays || extractActiveWeekdays(data.items || []),
              notes: data.notes || '',
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
 * Subscribes in real time to date-specific overrides (cancellations and reschedules) for a class
 */
export function subscribeToScheduleOverrides(
  classId: string,
  onUpdate: (overrides: ScheduleOverrideItem[]) => void
): () => void {
  try {
    const colRef = collection(db, 'scheduleOverrides');
    const q = query(colRef, where('classId', '==', classId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const overrides: ScheduleOverrideItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          overrides.push({
            id: docSnap.id,
            classId: data.classId,
            date: data.date,
            entryId: data.entryId,
            type: data.type,
            rescheduledStartTime: data.rescheduledStartTime,
            rescheduledEndTime: data.rescheduledEndTime,
            rescheduledRoom: data.rescheduledRoom,
            rescheduledTeacher: data.rescheduledTeacher,
            reason: data.reason,
            createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy,
          });
        });
        onUpdate(overrides);
      },
      (err) => {
        console.info('[Schedule Service] Overrides listener notice:', err.message);
        onUpdate([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.info('[Schedule Service] Overrides subscription init notice:', err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Fetches one-shot published schedule for a class
 */
export async function getPublishedSchedule(classId: string): Promise<RecurringSchedule | null> {
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
          semester: data.semester || 'Fall 2026',
          startDate: data.startDate || '2026-09-01',
          endDate: data.endDate || '2027-01-31',
          status: 'published',
          publishedVersion: data.publishedVersion || 1,
          publishedAt: data.publishedAt || new Date().toISOString(),
          publishedBy: data.publishedBy || undefined,
          items: data.items || [],
          activeDays: data.activeDays || extractActiveWeekdays(data.items || []),
          notes: data.notes || '',
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
export async function getScheduleDraft(classId: string): Promise<RecurringSchedule | null> {
  const cleanId = cleanClassId(classId);
  try {
    const docRef = doc(db, 'scheduleDrafts', `draft_${cleanId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        classId: data.classId || classId,
        semester: data.semester || 'Fall 2026',
        startDate: data.startDate || '2026-09-01',
        endDate: data.endDate || '2027-01-31',
        status: 'draft',
        publishedVersion: data.publishedVersion || 0,
        items: data.items || [],
        activeDays: data.activeDays || extractActiveWeekdays(data.items || []),
        notes: data.notes || '',
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
 * Saves or updates a recurring schedule draft in Firestore
 */
export async function saveScheduleDraft(
  draft: RecurringSchedule
): Promise<{ success: boolean; error?: string }> {
  const cleanId = cleanClassId(draft.classId);
  const docId = `draft_${cleanId}`;

  try {
    const activeDays = extractActiveWeekdays(draft.items);

    const payload = sanitizePayload({
      ...draft,
      id: docId,
      status: 'draft',
      activeDays,
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
 * Confirms and publishes a verified recurring weekly timetable for a class/section.
 * Immediately makes it authoritative for all students in real time.
 */
export async function publishSchedule(
  schedule: RecurringSchedule,
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
    const activeDays = extractActiveWeekdays(schedule.items);

    const publishedPayload = sanitizePayload({
      id: scheduleDocId,
      classId: schedule.classId,
      semester: schedule.semester || 'Fall 2026',
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      status: 'published',
      publishedVersion: newVersion,
      publishedAt,
      publishedBy: {
        uid: crUser.uid,
        email: crUser.email,
        name: crUser.name,
      },
      items: schedule.items,
      activeDays,
      notes: schedule.notes || '',
      createdAt: schedule.createdAt || publishedAt,
      updatedAt: publishedAt,
      serverUpdatedAt: serverTimestamp(),
    });

    // 2. Persist authoritative published schedule document
    await setDoc(doc(db, 'schedules', scheduleDocId), publishedPayload);

    // 3. Archive version in scheduleHistory for rollbacks and auditability
    const historyDocId = `${cleanId}_v${newVersion}`;
    const historyPayload = sanitizePayload({
      id: historyDocId,
      scheduleId: scheduleDocId,
      classId: schedule.classId,
      version: newVersion,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      publishedAt,
      publishedBy: {
        uid: crUser.uid,
        email: crUser.email,
        name: crUser.name,
      },
      items: schedule.items,
      activeDays,
      totalClasses: schedule.items.length,
      serverCreatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'scheduleHistory', historyDocId), historyPayload);

    // 4. Update draft to reflect published version
    await setDoc(
      doc(db, 'scheduleDrafts', `draft_${cleanId}`),
      {
        status: 'published',
        publishedVersion: newVersion,
        updatedAt: publishedAt,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
      },
      { merge: true }
    );

    // 5. Record audit log
    await recordAuditLog({
      action: 'Weekly Schedule Published',
      performedBy: crUser.email,
      details: `CR ${crUser.name} published Weekly Timetable v${newVersion} for ${schedule.classId} (${schedule.items.length} classes across ${activeDays.length} days; Valid: ${schedule.startDate} to ${schedule.endDate})`,
      category: 'academic',
      status: 'success',
    });

    return { success: true, version: newVersion };
  } catch (err: any) {
    console.error('[Schedule Service] Publish error:', err);
    return { success: false, error: err?.message || 'Failed to publish official schedule.' };
  }
}

/**
 * Saves a date-specific override (class cancellation or rescheduling) without altering future weeks
 */
export async function saveScheduleOverride(
  override: ScheduleOverrideItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const docId = override.id || `${cleanClassId(override.classId)}_${override.date}_${override.entryId}`;
    const payload = sanitizePayload({
      ...override,
      id: docId,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'scheduleOverrides', docId), payload);

    await recordAuditLog({
      action: override.type === 'cancelled' ? 'Schedule Exception: Class Cancelled' : 'Schedule Exception: Class Rescheduled',
      performedBy: override.createdBy.email,
      details: `CR ${override.createdBy.name} marked class ${override.entryId} on ${override.date} as ${override.type}. Reason: ${override.reason || 'None specified'}.`,
      category: 'academic',
      status: 'success',
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Schedule Service] Save override error:', err);
    return { success: false, error: err?.message || 'Failed to save date-specific schedule exception.' };
  }
}

/**
 * Removes a date-specific override, restoring the default recurring timetable for that date
 */
export async function deleteScheduleOverride(
  overrideId: string,
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'scheduleOverrides', overrideId));

    await recordAuditLog({
      action: 'Schedule Exception Removed',
      performedBy: userEmail,
      details: `Schedule override ${overrideId} removed, restoring default recurring schedule.`,
      category: 'academic',
      status: 'success',
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Schedule Service] Delete override error:', err);
    return { success: false, error: err?.message || 'Failed to delete schedule exception.' };
  }
}

/**
 * Retrieves the published version history for a class/section
 */
export async function getScheduleHistory(classId: string): Promise<ScheduleHistoryRecord[]> {
  try {
    const colRef = collection(db, 'scheduleHistory');
    const q = query(colRef, where('classId', '==', classId));
    const snap = await getDocs(q);

    const history: ScheduleHistoryRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      history.push({
        id: docSnap.id,
        scheduleId: data.scheduleId,
        classId: data.classId,
        version: data.version || 1,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        publishedAt: data.publishedAt || '',
        publishedBy: data.publishedBy || { uid: '', email: '', name: 'System' },
        items: data.items || [],
        activeDays: data.activeDays || [],
        totalClasses: data.totalClasses || (data.items?.length || 0),
      });
    });

    // Sort descending by version
    history.sort((a, b) => b.version - a.version);
    return history;
  } catch (err) {
    console.info('[Schedule Service] Get history notice:', err);
    return [];
  }
}

/**
 * Restores a historical schedule version and publishes it as the new active version
 */
export async function restoreScheduleVersion(
  classId: string,
  versionRecord: ScheduleHistoryRecord,
  crUser: { uid: string; email: string; name: string }
): Promise<{ success: boolean; error?: string }> {
  const scheduleToRestore: RecurringSchedule = {
    id: `schedule_${cleanClassId(classId)}`,
    classId,
    startDate: versionRecord.startDate,
    endDate: versionRecord.endDate,
    status: 'published',
    publishedVersion: versionRecord.version,
    items: versionRecord.items,
    activeDays: versionRecord.activeDays,
    notes: `Restored from version ${versionRecord.version}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return publishSchedule(scheduleToRestore, crUser);
}
