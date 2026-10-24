import { db } from './firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { MASTER_ADMIN_EMAIL } from './authService';
import { UserAggregateStats } from '../data/adminData';

export interface MigrationAuditResult {
  dryRun: boolean;
  timestamp: string;
  totalScanned: number;
  validCount: number;
  orphanedCount: number;
  duplicateCount: number;
  backedUpCount: number;
  purgedCount: number;
  validAccounts: { id: string; email: string; uid?: string; role: string; emailVerified?: boolean }[];
  orphanedAccounts: { id: string; email: string; reason: string }[];
  backupArchiveCollection: string;
}

/**
 * Safely inspects, backs up, and reconciles user records in Firestore.
 * Matches legitimate records by Firebase UID first.
 * Never deletes legitimate Firebase Authentication users or shared academic data.
 */
export async function executeUserMigration(dryRun = true): Promise<MigrationAuditResult> {
  const result: MigrationAuditResult = {
    dryRun,
    timestamp: new Date().toISOString(),
    totalScanned: 0,
    validCount: 0,
    orphanedCount: 0,
    duplicateCount: 0,
    backedUpCount: 0,
    purgedCount: 0,
    validAccounts: [],
    orphanedAccounts: [],
    backupArchiveCollection: 'users_backup_archive',
  };

  if (!db) {
    return result;
  }

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    result.totalScanned = usersSnap.docs.length;

    const seenUids = new Set<string>();
    const seenEmails = new Set<string>();

    const legitimateDocs: { docId: string; data: any }[] = [];
    const orphanDocs: { docId: string; data: any; reason: string }[] = [];

    for (const docSnap of usersSnap.docs) {
      const docId = docSnap.id;
      const data = docSnap.data();
      const email = (data.email || (docId.includes('_') ? docId.replace(/_/g, '.') : docId)).trim().toLowerCase();
      const uid = (data.uid || data.firebaseUid || '').trim();

      const isMasterAdmin =
        email === MASTER_ADMIN_EMAIL.toLowerCase() ||
        docId === 'master_admin' ||
        docId === 'hasnainbuilds724656_gmail_com';

      // 1. Master Administrator check
      if (isMasterAdmin) {
        legitimateDocs.push({ docId, data });
        result.validAccounts.push({
          id: docId,
          email: MASTER_ADMIN_EMAIL,
          uid: uid || '97DtWk8axhfWOyi3hZfOcWgS0n92',
          role: 'master_admin',
          emailVerified: true,
        });
        continue;
      }

      // 2. Validate Firebase UID format (standard Firebase Auth UIDs are >= 20 characters alphanumeric)
      const hasAuthenticUid = Boolean(
        uid &&
        !uid.startsWith('uid_') &&
        uid.length >= 15 &&
        !uid.includes('@')
      );

      if (hasAuthenticUid) {
        // Check for duplicates
        if (seenUids.has(uid) && docId !== uid) {
          orphanDocs.push({
            docId,
            data,
            reason: `Duplicate secondary profile document for UID ${uid}. Primary is users/${uid}.`,
          });
          result.duplicateCount++;
        } else {
          seenUids.add(uid);
          seenEmails.add(email);
          legitimateDocs.push({ docId, data });
          result.validAccounts.push({
            id: docId,
            email,
            uid,
            role: data.role || 'student',
            emailVerified: !!data.emailVerified,
          });
        }
      } else {
        // Document lacks a valid Firebase Authentication UID
        orphanDocs.push({
          docId,
          data,
          reason: 'Legacy or synthetic profile missing verified Firebase Authentication UID.',
        });
        result.orphanedAccounts.push({
          id: docId,
          email: email || 'Unknown',
          reason: 'Missing verified Firebase Auth UID',
        });
      }
    }

    result.validCount = legitimateDocs.length;
    result.orphanedCount = orphanDocs.length;

    // If NOT a dry run, perform safe backup and archive before deletion
    if (!dryRun) {
      for (const orphan of orphanDocs) {
        try {
          // A. Back up to users_backup_archive collection with full audit trail
          const backupRef = doc(db, 'users_backup_archive', orphan.docId);
          await setDoc(backupRef, {
            ...orphan.data,
            archivedAt: serverTimestamp(),
            originalDocId: orphan.docId,
            migrationTimestamp: result.timestamp,
            archiveReason: orphan.reason,
            restorationEligible: false,
          });
          result.backedUpCount++;

          // B. Delete orphaned document from active users collection
          await deleteDoc(doc(db, 'users', orphan.docId));
          result.purgedCount++;
        } catch (err: any) {
          console.warn(`[Migration] Error archiving orphan ${orphan.docId}:`, err?.message || err);
        }
      }

      // Reconcile aggregate metrics
      const verifiedCount = result.validAccounts.filter((a) => a.emailVerified || a.role === 'master_admin').length;
      const unverifiedCount = result.validAccounts.length - verifiedCount;
      const studentCount = result.validAccounts.filter((a) => a.role === 'student').length;
      const crCount = result.validAccounts.filter((a) => a.role === 'cr').length;
      const teacherCount = result.validAccounts.filter((a) => a.role === 'teacher').length;

      const updatedStats: UserAggregateStats = {
        totalAccounts: result.validAccounts.length,
        verifiedAccounts: verifiedCount,
        unverifiedAccounts: unverifiedCount,
        studentCount,
        crCount,
        teacherCount,
        adminCount: 1,
        lastReconciledAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'aggregates', 'userStats'), {
        ...updatedStats,
        lastReconciledAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }

    return result;
  } catch (err: any) {
    console.error('[Migration] Error executing user migration:', err);
    throw err;
  }
}
