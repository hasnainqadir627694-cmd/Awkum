import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
dotenv.config();

const MASTER_ADMIN_EMAIL = 'hasnainbuilds724656@gmail.com';

async function runAudit() {
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'awku-mardan',
    });
  }

  const adminDb = getFirestore();
  const authAdmin = getAuth();
  console.log('[Audit Script] Initialized Firebase Admin SDK');

  const verifiedAccounts: any[] = [];
  const removedAccounts: any[] = [];

  // 1. Fetch all real Firebase Auth users
  const firebaseAuthUsers = new Map<string, any>(); // email -> authUser
  const authUidSet = new Set<string>(); // set of valid UIDs

  try {
    const listUsersResult = await authAdmin.listUsers(1000);
    listUsersResult.users.forEach((userRecord: any) => {
      if (userRecord.email) {
        const emailLower = userRecord.email.toLowerCase().trim();
        firebaseAuthUsers.set(emailLower, {
          uid: userRecord.uid,
          email: emailLower,
          displayName: userRecord.displayName || '',
          emailVerified: userRecord.emailVerified,
          creationTime: userRecord.metadata?.creationTime,
        });
      }
      authUidSet.add(userRecord.uid);
    });
    console.log(`[Audit Script] Found ${authUidSet.size} registered accounts in Firebase Authentication.`);
  } catch (authErr: any) {
    console.warn('[Audit Script] Notice listing Firebase Auth users:', authErr?.message || authErr);
  }

  // 2. Fetch all Firestore user documents and audit
  try {
    const usersSnap = await adminDb.collection('users').get();
    console.log(`[Audit Script] Auditing ${usersSnap.docs.length} user documents in Firestore 'users' collection.`);

    for (const docSnap of usersSnap.docs) {
      const docId = docSnap.id;
      const data = docSnap.data();
      const docEmail = (data.email || '').trim().toLowerCase();
      const docUid = (data.uid || data.firebaseUid || '').trim();

      // Master admin exception
      if (
        docEmail === MASTER_ADMIN_EMAIL.toLowerCase() ||
        docId === 'master_admin' ||
        docId === 'hasnainbuilds724656_gmail_com'
      ) {
        verifiedAccounts.push({
          id: docId,
          name: data.name || 'Hasnain Qadir',
          email: MASTER_ADMIN_EMAIL,
          uid: docUid || '97DtWk8axhfWOyi3hZfOcWgS0n92',
          role: 'master_admin',
          verificationStatus: 'Verified Master Administrator',
        });
        continue;
      }

      // Check if UID is in Firebase Auth OR if Email matches a real Firebase Auth user
      let matchingAuthUser: any = null;
      if (docUid && authUidSet.has(docUid)) {
        matchingAuthUser = Array.from(firebaseAuthUsers.values()).find((u) => u.uid === docUid);
      }
      if (!matchingAuthUser && docEmail && firebaseAuthUsers.has(docEmail)) {
        matchingAuthUser = firebaseAuthUsers.get(docEmail);
      }

      if (matchingAuthUser) {
        // Account is verified! Update Firestore document with correct Firebase Auth UID
        const correctUid = matchingAuthUser.uid;
        if (data.uid !== correctUid || !data.isFirebaseUser) {
          await docSnap.ref.set({ uid: correctUid, isFirebaseUser: true }, { merge: true });
        }

        verifiedAccounts.push({
          id: docId,
          name: data.name || data.fullName || matchingAuthUser.displayName || 'Registered Student',
          email: docEmail || matchingAuthUser.email,
          uid: correctUid,
          role: data.role || 'student',
          department: data.department || 'Software Engineering',
          assignedClass: data.assignedClass || 'BS SE',
          verificationStatus: 'Verified Firebase Auth User',
        });
      } else {
        // No valid Firebase Auth user found for this document! Remove it from Firestore.
        await docSnap.ref.delete();

        // Clean up orphan crAssignments or teacherAssignments for this email
        if (docEmail) {
          const crSnap = await adminDb.collection('crAssignments').where('email', '==', docEmail).get();
          crSnap.forEach((crDoc: any) => crDoc.ref.delete().catch(() => {}));

          const tSnap = await adminDb.collection('teacherAssignments').where('email', '==', docEmail).get();
          tSnap.forEach((tDoc: any) => tDoc.ref.delete().catch(() => {}));
        }

        removedAccounts.push({
          id: docId,
          name: data.name || data.fullName || 'Unverified Record',
          email: docEmail || 'No Email',
          uid: docUid || 'No UID',
          role: data.role || 'unknown',
          reason: 'No matching account or valid UID found in Firebase Authentication users',
        });
      }
    }
  } catch (dbErr: any) {
    console.error('[Audit Script] Error auditing Firestore users:', dbErr);
  }

  // 3. Ensure any real Firebase Auth user exists in Firestore
  for (const [email, authUser] of firebaseAuthUsers.entries()) {
    if (email === MASTER_ADMIN_EMAIL.toLowerCase()) continue;
    const existsInVerified = verifiedAccounts.some((u) => u.email.toLowerCase() === email);
    if (!existsInVerified) {
      const docId = email.replace(/[@.]/g, '_');
      const newUserDoc = {
        uid: authUser.uid,
        email: email,
        name: authUser.displayName || 'Registered Student',
        role: 'student',
        roles: ['student'],
        status: 'active',
        department: 'Software Engineering',
        semester: '1st Semester',
        isFirebaseUser: true,
        createdAt: new Date().toISOString(),
      };
      await adminDb.collection('users').doc(docId).set(newUserDoc, { merge: true });
      await adminDb.collection('users').doc(authUser.uid).set(newUserDoc, { merge: true });

      verifiedAccounts.push({
        id: docId,
        name: newUserDoc.name,
        email: email,
        uid: authUser.uid,
        role: 'student',
        department: 'Software Engineering',
        assignedClass: 'BS SE',
        verificationStatus: 'Verified & Profile Initialized for Firebase Auth User',
      });
    }
  }

  // De-duplicate verified and removed lists by email/id
  const uniqueVerified = Array.from(
    new Map(verifiedAccounts.map((u) => [u.email.toLowerCase(), u])).values()
  );
  const uniqueRemoved = Array.from(
    new Map(removedAccounts.map((u) => [u.id, u])).values()
  );

  const result = {
    timestamp: new Date().toISOString(),
    summary: {
      totalVerifiedAccounts: uniqueVerified.length,
      totalRemovedAccounts: uniqueRemoved.length,
    },
    verifiedAccounts: uniqueVerified,
    removedAccounts: uniqueRemoved,
  };

  console.log('--- AUDIT RESULT JSON ---');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

runAudit();
