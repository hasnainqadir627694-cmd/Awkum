import { db } from './firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
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

/**
 * Subscribes to real-time incoming class arrival alerts from CRs for the teacher
 */
export function subscribeToTeacherIncomingAlerts(
  teacherEmail: string,
  onUpdate: (alerts: TeacherAlertRecord[]) => void
): () => void {
  const cleanEmail = (teacherEmail || '').toLowerCase().trim();
  const memoryAlerts = alertCache.filter(
    (a) =>
      a.teacherEmail.toLowerCase() === cleanEmail ||
      cleanEmail.includes(a.teacherName.toLowerCase().replace(/[^a-z]/g, ''))
  );
  onUpdate(memoryAlerts);

  if (!db) return () => {};

  try {
    const alertsCol = collection(db, 'teacherAlerts');
    const unsubscribe = onSnapshot(
      alertsCol,
      (snapshot: any) => {
        const list: TeacherAlertRecord[] = [];
        snapshot.forEach((d: any) => {
          if (d.exists()) {
            const data = d.data() as TeacherAlertRecord;
            if (
              data.teacherEmail?.toLowerCase() === cleanEmail ||
              cleanEmail.includes(data.teacherName?.toLowerCase().replace(/[^a-z]/g, '')) ||
              cleanEmail.startsWith('teacher')
            ) {
              list.push({ ...data, id: d.id });
            }
          }
        });
        list.sort((a, b) => b.id.localeCompare(a.id));
        onUpdate(list);
      },
      (err: any) => {
        console.info('[Teacher Alert Service] Alert listener notice:', err?.message || err);
      }
    );
    return unsubscribe;
  } catch (e) {
    return () => {};
  }
}

/**
 * Triggers an audible university chime alarm and device vibration to alert the incoming teacher
 */
export function playTeacherArrivalAlarmAndVibration(): void {
  // 1. Device Vibration for mobile devices
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([400, 200, 400, 200, 600]);
    }
  } catch {}

  // 2. Synthesized Alarm Sound via Web Audio API
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const playChimeTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + startOffset + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    // University bell chime sequence
    playChimeTone(784, 0.0, 0.35);  // G5
    playChimeTone(988, 0.25, 0.35); // B5
    playChimeTone(1318, 0.5, 0.6);  // E6

    // Second chime burst after brief pause
    playChimeTone(784, 0.85, 0.35);
    playChimeTone(988, 1.1, 0.35);
    playChimeTone(1318, 1.35, 0.7);
  } catch (e) {
    console.info('[Teacher Alert Sound] Web Audio synthesis notice:', e);
  }
}

