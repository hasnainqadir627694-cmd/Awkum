import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { ClassSection } from '../data/adminData';
import { recordAuditLog } from './authService';

let classesCache: ClassSection[] = [];

export function getCachedClasses(): ClassSection[] {
  return classesCache;
}

/**
 * Subscribes to real-time academic classes and sections from Cloud Firestore.
 * Does NOT auto-seed default classes; begins with an empty array if none exist.
 */
export function subscribeToClasses(
  onUpdate: (classes: ClassSection[]) => void
): () => void {
  onUpdate([...classesCache]);

  if (!db) {
    return () => {};
  }

  try {
    const classesCol = collection(db, 'classes');
    const unsubscribe = onSnapshot(
      classesCol,
      (snapshot) => {
        const list: ClassSection[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            list.push({
              id: d.id,
              class: data.class || '',
              section: data.section || '',
              totalStudents: Number(data.totalStudents) || 0,
              assignedCR: data.assignedCR || null,
              assignedCREmail: data.assignedCREmail || undefined,
              status: data.status === 'Inactive' ? 'Inactive' : 'Active',
            });
          }
        });

        // Sort by class name, then section
        list.sort((a, b) => `${a.class} ${a.section}`.localeCompare(`${b.class} ${b.section}`));
        classesCache = list;
        onUpdate(list);
      },
      (error) => {
        console.info('[Class Service] Classes listener notice:', error.message);
        onUpdate([...classesCache]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.info('[Class Service] Subscribe notice:', err);
    return () => {};
  }
}

/**
 * Strips any undefined fields, guaranteeing Firestore setDoc never throws:
 * 'Unsupported field value: undefined'.
 */
function cleanPayloadForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      continue;
    }
    cleaned[key] = val;
  }
  return cleaned;
}

/**
 * Creates or updates an official academic Class/Section in Cloud Firestore
 */
export async function saveClassSection(
  classItem: ClassSection,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  const cleanClass = classItem.class.trim().toUpperCase();
  const cleanSection = classItem.section.trim().toUpperCase();

  if (!cleanClass || !cleanSection) {
    return { success: false, error: 'Class name and section code are required.' };
  }

  const docId = classItem.id || `cls_${cleanClass.toLowerCase()}_${cleanSection.toLowerCase()}`;
  const itemToSave: ClassSection = {
    id: docId,
    class: cleanClass,
    section: cleanSection,
    totalStudents: Number(classItem.totalStudents) || 0,
    assignedCR: classItem.assignedCR || null,
    assignedCREmail: classItem.assignedCREmail || undefined,
    status: classItem.status === 'Inactive' ? 'Inactive' : 'Active',
  };

  // Update memory cache immediately
  const existingIdx = classesCache.findIndex((c) => c.id === docId);
  if (existingIdx >= 0) {
    classesCache[existingIdx] = itemToSave;
  } else {
    classesCache.push(itemToSave);
  }

  if (db) {
    try {
      const firestorePayload = cleanPayloadForFirestore({
        id: docId,
        class: cleanClass,
        section: cleanSection,
        totalStudents: Number(classItem.totalStudents) || 0,
        assignedCR: classItem.assignedCR || null,
        assignedCREmail: classItem.assignedCREmail || null,
        status: classItem.status === 'Inactive' ? 'Inactive' : 'Active',
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'classes', docId), firestorePayload, { merge: true });

      await recordAuditLog({
        action: 'Academic Class Configured',
        performedBy: adminEmail,
        details: `Configured class ${cleanClass} Section ${cleanSection} (${itemToSave.status})`,
        category: 'academic',
        status: 'success',
      });

      return { success: true };
    } catch (err: any) {
      console.info('[Class Service] Save class error:', err?.message || err);
      return { success: false, error: err?.message || 'Failed to persist class to database.' };
    }
  }

  return { success: true };
}

/**
 * Safely deactivates or removes a class section if no dependent academic records exist
 */
export async function removeClassSection(
  classId: string,
  adminEmail: string,
  enrolledStudentsCount = 0
): Promise<{ success: boolean; error?: string }> {
  if (enrolledStudentsCount > 0) {
    // If students are enrolled, soft-deactivate instead of destructive deletion to preserve academic integrity
    const existing = classesCache.find((c) => c.id === classId);
    if (existing) {
      existing.status = 'Inactive';
      if (db) {
        await setDoc(doc(db, 'classes', classId), { status: 'Inactive', updatedAt: serverTimestamp() }, { merge: true });
      }
      await recordAuditLog({
        action: 'Class Deactivated',
        performedBy: adminEmail,
        details: `Class ${existing.class} ${existing.section} marked Inactive (${enrolledStudentsCount} enrolled students preserved)`,
        category: 'academic',
        status: 'warning',
      });
      return { success: true };
    }
  }

  // If no enrolled students, remove document
  classesCache = classesCache.filter((c) => c.id !== classId);
  if (db) {
    try {
      await deleteDoc(doc(db, 'classes', classId));
      await recordAuditLog({
        action: 'Class Removed',
        performedBy: adminEmail,
        details: `Removed unused class ID ${classId}`,
        category: 'academic',
        status: 'warning',
      });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete class.' };
    }
  }

  return { success: true };
}
