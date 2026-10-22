import { db } from './firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { recordAuditLog } from './authService';

export interface TeacherAlertRecord {
  id: string;
  classId: string;
  subjectName: string;
  teacherName: string;
  teacherEmail: string;
  scheduledTime: string;
  room: string;
  sentByCRName: string;
  sentByCREmail: string;
  sentAt: string;
  status: 'Sent' | 'Delivered' | 'Failed';
  message: string;
  targetDate: string;
}

// In-memory alert cache & cooldown tracking
const alertCache: TeacherAlertRecord[] = [];
const lastAlertTimestamp: Map<string, number> = new Map(); // key -> timestamp ms

/**
 * Checks if a cooldown is currently active for a specific subject (prevents duplicate spam)
 */
export function getAlertCooldownSeconds(classId: string, subjectName: string): number {
  const key = `${classId}_${subjectName}`.toLowerCase();
  const lastTime = lastAlertTimestamp.get(key);
  if (!lastTime) return 0;

  const COOLDOWN_MS = 60 * 1000; // 60 seconds rate limit
  const elapsed = Date.now() - lastTime;
  if (elapsed < COOLDOWN_MS) {
    return Math.ceil((COOLDOWN_MS - elapsed) / 1000);
  }
  return 0;
}

/**
 * Sends a real-time notification alert to the assigned teacher
 */
export async function sendTeacherAlert(params: {
  classId: string;
  subjectName: string;
  teacherName: string;
  teacherEmail: string;
  scheduledTime: string;
  room: string;
  sentByCRName: string;
  sentByCREmail: string;
}): Promise<{ success: boolean; alert?: TeacherAlertRecord; error?: string }> {
  const key = `${params.classId}_${params.subjectName}`.toLowerCase();
  const cooldown = getAlertCooldownSeconds(params.classId, params.subjectName);

  if (cooldown > 0) {
    return {
      success: false,
      error: `Please wait ${cooldown} seconds before sending another reminder for ${params.subjectName}.`,
    };
  }

  const newAlert: TeacherAlertRecord = {
    id: `alert-${Date.now()}`,
    classId: params.classId,
    subjectName: params.subjectName,
    teacherName: params.teacherName,
    teacherEmail: params.teacherEmail,
    scheduledTime: params.scheduledTime,
    room: params.room,
    sentByCRName: params.sentByCRName,
    sentByCREmail: params.sentByCREmail,
    sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
    status: 'Sent',
    message: `Your upcoming ${params.subjectName} class for ${params.classId} (${params.scheduledTime} at ${params.room}) is approaching. Class students are assembled.`,
    targetDate: new Date().toISOString().split('T')[0],
  };

  // Record in memory & set cooldown
  alertCache.unshift(newAlert);
  lastAlertTimestamp.set(key, Date.now());

  // Persist to Cloud Firestore
  if (db) {
    try {
      await addDoc(collection(db, 'teacherAlerts'), {
        ...newAlert,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.info('[Teacher Alert Service] Firestore record notice:', err);
    }
  }

  // Record audit log
  await recordAuditLog({
    action: 'Teacher Notification Dispatched',
    performedBy: params.sentByCREmail,
    details: `Alert sent to ${params.teacherName} (${params.teacherEmail}) for ${params.subjectName} class (${params.classId})`,
    category: 'academic',
    status: 'success',
  });

  return {
    success: true,
    alert: newAlert,
  };
}

/**
 * Returns recent alerts dispatched by the CR for their class
 */
export async function getTeacherAlertHistory(classId: string): Promise<TeacherAlertRecord[]> {
  const local = alertCache.filter((a) => a.classId.toLowerCase() === classId.toLowerCase());

  if (!db) {
    return local;
  }

  try {
    const q = query(
      collection(db, 'teacherAlerts'),
      where('classId', '==', classId)
    );
    const snap = await getDocs(q);
    const remote: TeacherAlertRecord[] = [];
    snap.forEach((d) => {
      remote.push({ id: d.id, ...d.data() } as TeacherAlertRecord);
    });

    if (remote.length > 0) {
      return remote.sort((a, b) => b.id.localeCompare(a.id));
    }
    return local;
  } catch (err) {
    console.info('[Teacher Alert Service] Alert history fetch notice:', err);
    return local;
  }
}
