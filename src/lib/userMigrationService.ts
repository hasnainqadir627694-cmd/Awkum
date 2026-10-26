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

    interface ScannedDoc {
      docId: string;
      data: any;
      cleanEmail: string;
      cleanUid: string;
      isMasterAdmin: boolean;
      hasAuthenticUid: boolean;
    }

    const scannedDocs: ScannedDoc[] = [];

    for (const docSnap of usersSnap.docs) {
      const docId = docSnap.id;
      const data = docSnap.data();
      const rawEmail = (
        data.email ||
        data.studentEmail ||
        (docId.includes('@') ? docId : (docId.includes('_') ? docId.replace(/_/g, '.') : ''))
      ).trim().toLowerCase();
      const cleanEmail = rawEmail.includes('@') ? rawEmail : (docId === 'master_admin' ? MASTER_ADMIN_EMAIL.toLowerCase() : rawEmail);
      const cleanUid = (
        data.uid ||
        data.firebaseUid ||
        (docId.length >= 15 && !docId.includes('@') && !docId.includes('_') ? docId : '')
      ).trim();

      const isMasterAdmin =
        cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase() ||
        docId === 'master_admin' ||
        docId === 'hasnainbuilds724656_gmail_com';

      const hasAuthenticUid = Boolean(
        isMasterAdmin || (
          cleanUid &&
          !cleanUid.startsWith('uid_') &&
          cleanUid.length >= 15 &&
          !cleanUid.includes('@')
        )
      );

      scannedDocs.push({
        docId,
        data,
        cleanEmail: isMasterAdmin ? MASTER_ADMIN_EMAIL.toLowerCase() : cleanEmail,
        cleanUid: isMasterAdmin ? (cleanUid || '97DtWk8axhfWOyi3hZfOcWgS0n92') : cleanUid,
        isMasterAdmin,
        hasAuthenticUid,
      });
    }

    // Group documents by canonical user key (email if valid, else authentic UID)
    const userGroups = new Map<string, ScannedDoc[]>();
    const orphanDocs: { docId: string; data: any; reason: string }[] = [];

    for (const docItem of scannedDocs) {
      if (docItem.isMasterAdmin) {
        const group = userGroups.get(MASTER_ADMIN_EMAIL.toLowerCase()) || [];
        group.push(docItem);
        userGroups.set(MASTER_ADMIN_EMAIL.toLowerCase(), group);
        continue;
      }

      if (!docItem.hasAuthenticUid && (!docItem.cleanEmail || !docItem.cleanEmail.includes('@'))) {
        orphanDocs.push({
          docId: docItem.docId,
          data: docItem.data,
          reason: 'Legacy or synthetic profile missing verified Firebase Authentication UID.',
        });
        result.orphanedAccounts.push({
          id: docItem.docId,
          email: docItem.cleanEmail || 'Unknown',
          reason: 'Missing verified Firebase Auth UID',
        });
        continue;
      }

      const key = docItem.cleanEmail || docItem.cleanUid;
      const group = userGroups.get(key) || [];
      group.push(docItem);
      userGroups.set(key, group);
    }

    // For each authentic user identity, establish EXACTLY ONE primary document and flag duplicate secondary documents
    for (const [, docs] of userGroups.entries()) {
      if (docs.length === 0) continue;

      // Primary selection rule:
      // 1. If docId matches the authentic UID, that is the primary document
      // 2. Otherwise, prefer document with richest populated fields or earliest registration
      docs.sort((a, b) => {
        if (a.docId === a.cleanUid && b.docId !== b.cleanUid) return -1;
        if (b.docId === b.cleanUid && a.docId !== a.cleanUid) return 1;
        return (b.data?.registeredDate ? 1 : 0) - (a.data?.registeredDate ? 1 : 0);
      });

      const primary = docs[0];
      const duplicates = docs.slice(1);

      // Add exactly ONE verified entry to validAccounts (Zero duplicates)
      result.validAccounts.push({
        id: primary.docId,
        email: primary.cleanEmail,
        uid: primary.cleanUid,
        role: primary.isMasterAdmin ? 'master_admin' : (primary.data.role || 'student'),
        emailVerified: primary.isMasterAdmin || Boolean(primary.data.emailVerified),
      });

      // Mark any extra secondary documents as duplicates to be reconciled / archived
      for (const dup of duplicates) {
        orphanDocs.push({
          docId: dup.docId,
          data: dup.data,
          reason: `Duplicate secondary profile document for ${dup.cleanEmail}. Primary is users/${primary.docId}.`,
        });
        result.duplicateCount++;
        result.orphanedAccounts.push({
          id: dup.docId,
          email: dup.cleanEmail,
          reason: `Duplicate secondary profile (Primary: users/${primary.docId})`,
        });
      }
    }

    result.validCount = result.validAccounts.length;
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
