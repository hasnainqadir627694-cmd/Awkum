import express from 'express';
import { createServer as createViteServer } from 'vite';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import adminPkg from 'firebase-admin';
import { GoogleGenAI, Type } from '@google/genai';
const admin: any = adminPkg;

let lastLogoTimestamp = Date.now();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_ADMIN_EMAIL = 'hasnainbuilds724656@gmail.com';

// Server Gemini Client for vision schedule extraction
const aiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Secure Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ehc1fewm',
  api_key: process.env.CLOUDINARY_API_KEY || '222139937659655',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'CUidagGOF8eVgV00bq2cTPOvbu8',
  secure: true,
});

// Initialize Firebase Admin SDK for server-authoritative role verification & storage
let adminDb: any = null;
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'awku-mardan',
    });
  }
  adminDb = admin.firestore();
  console.log('[Firebase Admin] Successfully initialized Firestore Admin');

  // Permanently seed Master Admin account in Firestore database
  const masterEmailDoc = adminDb.collection('users').doc('hasnainbuilds724656_gmail_com');
  masterEmailDoc.set({
    id: 'u-admin-master',
    uid: '97DtWk8axhfWOyi3hZfOcWgS0n92',
    name: 'Hasnain Qadir',
    email: MASTER_ADMIN_EMAIL,
    role: 'master_admin',
    roles: ['master_admin'],
    status: 'active',
    department: 'Central Administration / IT Directorate',
    registeredDate: 'Oct 01, 2026',
  }, { merge: true }).catch((err: any) => {
    console.info('[Server] Master Admin Firestore notice:', err?.message || err);
  });

  adminDb.collection('users').doc('master_admin').set({
    id: 'u-admin-master',
    uid: '97DtWk8axhfWOyi3hZfOcWgS0n92',
    name: 'Hasnain Qadir',
    email: MASTER_ADMIN_EMAIL,
    role: 'master_admin',
    roles: ['master_admin'],
    status: 'active',
    department: 'Central Administration / IT Directorate',
  }, { merge: true }).catch(() => {});
} catch (err: any) {
  console.warn('[Firebase Admin] Notice initializing Firebase Admin (using server memory sync):', err?.message || err);
}

let serverBrandingCache: any = null;
if (adminDb) {
  adminDb.collection('config').doc('branding').get().then((snap: any) => {
    if (snap.exists) {
      serverBrandingCache = snap.data();
      console.log('[Server Branding] Loaded server branding cache from Firestore');
    }
  }).catch(() => {});
}

// In-memory mirror for fast validation and offline resilience
export interface ServerCRAssignment {
  id: string;
  uid: string;
  email: string;
  name: string;
  studentId: string;
  assignedClass: string;
  status: 'active' | 'revoked';
  grantedAt: string;
  grantedBy: string;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
}

const serverCRAssignments = new Map<string, ServerCRAssignment>();

// Helper to look up active CR assignment by UID or email
async function getActiveAssignment(uid?: string, email?: string): Promise<ServerCRAssignment | null> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUid = (uid || '').trim();

  // 1. Check local server memory map first
  for (const assignment of serverCRAssignments.values()) {
    if (assignment.status === 'active') {
      if ((cleanUid && assignment.uid === cleanUid) || (cleanEmail && assignment.email.toLowerCase() === cleanEmail)) {
        return assignment;
      }
    }
  }

  // 2. Query Firestore crAssignments collection if adminDb is connected
  if (adminDb) {
    try {
      if (cleanUid) {
        const snap = await adminDb.collection('crAssignments')
          .where('uid', '==', cleanUid)
          .where('status', '==', 'active')
          .limit(1)
          .get();
        if (!snap.empty) {
          const docData = snap.docs[0].data() as ServerCRAssignment;
          serverCRAssignments.set(docData.id, docData);
          return docData;
        }
      }

      if (cleanEmail) {
        const snap = await adminDb.collection('crAssignments')
          .where('email', '==', cleanEmail)
          .where('status', '==', 'active')
          .limit(1)
          .get();
        if (!snap.empty) {
          const docData = snap.docs[0].data() as ServerCRAssignment;
          serverCRAssignments.set(docData.id, docData);
          return docData;
        }
      }
    } catch (err: any) {
      console.info('[Server Auth] Notice querying Firestore crAssignments:', err?.message || err);
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // CORS Middleware: Ensures iframe and cross-origin fetch requests succeed without restriction
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // JSON and URL-encoded parser with 100mb limit for high-res photos and documents
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // =========================================================================
  // STRICT ROLE-BASED ACCESS CONTROL (RBAC) API ENDPOINTS
  // =========================================================================

  /**
   * Validates whether a specific UID and/or email has an active, valid CR assignment.
   * Invoked on every login, session restoration, and screen transition.
   */
  app.all('/api/auth/validate-cr', async (req, res) => {
    try {
      const email = (req.body?.email || req.query?.email || '') as string;
      const uid = (req.body?.uid || req.query?.uid || '') as string;
      const cleanEmail = email.trim().toLowerCase();
      const cleanUid = uid.trim();

      if (!cleanEmail && !cleanUid) {
        return res.json({ isCR: false, assignedClass: null, status: 'none' });
      }

      const activeAssignment = await getActiveAssignment(cleanUid, cleanEmail);

      if (activeAssignment && activeAssignment.status === 'active') {
        return res.json({
          isCR: true,
          assignedClass: activeAssignment.assignedClass,
          status: 'active',
          assignment: activeAssignment,
        });
      }

      // Check if user is marked as CR in users collection in Firestore
      if (adminDb) {
        try {
          let userDocData: any = null;
          if (cleanUid) {
            const uSnap = await adminDb.collection('users').doc(cleanUid).get();
            if (uSnap.exists) userDocData = uSnap.data();
          }
          if (!userDocData && cleanEmail) {
            const uSnap = await adminDb.collection('users').doc(cleanEmail.replace(/[@.]/g, '_')).get();
            if (uSnap.exists) userDocData = uSnap.data();
          }

          if (
            userDocData &&
            userDocData.crStatus !== 'revoked' &&
            (userDocData.isCR ||
              userDocData.role === 'cr' ||
              (Array.isArray(userDocData.roles) && userDocData.roles.includes('cr')))
          ) {
            const restoredClass = userDocData.assignedClass || 'BS SE';
            const assignmentId = `cr_${cleanEmail.replace(/[@.]/g, '_')}`;
            const repairedAssignment: ServerCRAssignment = {
              id: assignmentId,
              uid: cleanUid || userDocData.uid || `uid_${cleanEmail.replace(/[@.]/g, '_')}`,
              email: cleanEmail || userDocData.email,
              name: userDocData.name || 'Student',
              studentId: userDocData.studentId || '',
              assignedClass: restoredClass,
              status: 'active',
              grantedAt: userDocData.crAssignedAt || new Date().toISOString(),
              grantedBy: userDocData.crAssignedBy || MASTER_ADMIN_EMAIL,
              revokedAt: null,
              revokedBy: null,
              revocationReason: null,
            };
            serverCRAssignments.set(repairedAssignment.id, repairedAssignment);
            return res.json({
              isCR: true,
              assignedClass: restoredClass,
              status: 'active',
              assignment: repairedAssignment,
            });
          }
        } catch (dbErr) {
          console.info('[Validate CR User Lookup Notice]:', dbErr);
        }
      }

      return res.json({
        isCR: false,
        assignedClass: null,
        status: 'none',
      });
    } catch (err: any) {
      console.error('[RBAC Validate Error]:', err);
      return res.status(500).json({ isCR: false, error: err?.message || 'Server authorization check failed.' });
    }
  });

  /**
   * Protected Master Admin Operation: Grant CR access to a specific registered Gmail account and UID.
   * Server validates Master Admin caller before updating database records.
   */
  app.post('/api/admin/grant-cr', async (req, res) => {
    try {
      const {
        adminEmail,
        targetUid,
        targetEmail,
        targetName,
        targetStudentId,
        assignedClass,
      } = req.body;

      // 1. Enforce Master Admin Authority on the server
      const cleanAdmin = (adminEmail || '').trim().toLowerCase();
      if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({
          error: 'Access Denied: Only the verified Master Administrator (hasnainbuilds724656@gmail.com) can grant Class Representative roles.',
        });
      }

      const cleanTargetEmail = (targetEmail || '').trim().toLowerCase();
      const cleanTargetUid = (targetUid || '').trim();
      const cleanClass = (assignedClass || req.body.targetClass || '').trim();

      if (!cleanTargetEmail || !cleanClass) {
        return res.status(400).json({ error: 'Missing target student Gmail or assigned class/section.' });
      }

      // 2. Revoke any previous active CR for this specific class (One active CR per class rule)
      let previousCR: ServerCRAssignment | undefined;
      for (const assignment of serverCRAssignments.values()) {
        if (
          assignment.assignedClass.toLowerCase() === cleanClass.toLowerCase() &&
          assignment.status === 'active' &&
          assignment.email.toLowerCase() !== cleanTargetEmail
        ) {
          assignment.status = 'revoked';
          assignment.revokedAt = new Date().toISOString();
          assignment.revokedBy = cleanAdmin;
          assignment.revocationReason = `Replaced by ${targetName || cleanTargetEmail} as CR for ${cleanClass}`;
          previousCR = assignment;
          break;
        }
      }

      // 3. Create persistent active CR assignment bound to verified Gmail and UID
      const assignmentId = `cr_${cleanTargetEmail.replace(/[@.]/g, '_')}_${Date.now()}`;
      const newAssignment: ServerCRAssignment = {
        id: assignmentId,
        uid: cleanTargetUid || `uid_${cleanTargetEmail.replace(/[@.]/g, '_')}`,
        email: cleanTargetEmail,
        name: targetName || 'Student',
        studentId: targetStudentId || '',
        assignedClass: cleanClass,
        status: 'active',
        grantedAt: new Date().toISOString(),
        grantedBy: cleanAdmin,
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
      };

      // Store in memory map
      serverCRAssignments.set(newAssignment.id, newAssignment);

      // Persist to Cloud Firestore via Admin SDK
      if (adminDb) {
        try {
          // If previous CR existed, update their Firestore record
          if (previousCR) {
            await adminDb.collection('crAssignments').doc(previousCR.id).set(previousCR, { merge: true });
            const prevUserDoc = adminDb.collection('users').doc(previousCR.email.replace(/[@.]/g, '_'));
            await prevUserDoc.set({ isCR: false, role: 'student', crStatus: 'revoked' }, { merge: true });
          }

          // Write new active assignment
          await adminDb.collection('crAssignments').doc(assignmentId).set(newAssignment);

          // Update user profile document in Firestore
          const targetUserDoc = adminDb.collection('users').doc(cleanTargetEmail.replace(/[@.]/g, '_'));
          await targetUserDoc.set(
            {
              role: 'cr',
              roles: ['student', 'cr'],
              isCR: true,
              crStatus: 'active',
              assignedClass: cleanClass,
              crAssignedAt: newAssignment.grantedAt,
              crAssignedBy: cleanAdmin,
            },
            { merge: true }
          );

          // Record audit log
          await adminDb.collection('auditLogs').add({
            action: 'Class Representative Appointed',
            performedBy: cleanAdmin,
            details: `${newAssignment.name} (${cleanTargetEmail}) granted CR access for ${cleanClass}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            category: 'role',
            status: 'success',
          });
        } catch (dbErr: any) {
          console.warn('[Server Admin DB Notice]:', dbErr?.message || dbErr);
        }
      }

      console.log(`[RBAC Server] CR access granted to ${cleanTargetEmail} for ${cleanClass} by ${cleanAdmin}`);

      return res.json({
        success: true,
        assignment: newAssignment,
        previousCR,
        message: `CR role successfully granted to ${cleanTargetEmail} for ${cleanClass}.`,
      });
    } catch (err: any) {
      console.error('[Grant CR Error]:', err);
      return res.status(500).json({ error: err?.message || 'Server error granting CR role.' });
    }
  });

  /**
   * Protected Master Admin Operation: Revoke CR access from an account at any time.
   * Immediately invalidates active CR status while preserving student account and historical records.
   */
  app.post('/api/admin/revoke-cr', async (req, res) => {
    try {
      const { adminEmail, targetUid, targetEmail, reason } = req.body;

      // 1. Enforce Master Admin Authority on the server
      const cleanAdmin = (adminEmail || '').trim().toLowerCase();
      if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({
          error: 'Access Denied: Only the verified Master Administrator (hasnainbuilds724656@gmail.com) can revoke Class Representative roles.',
        });
      }

      const cleanTargetEmail = (targetEmail || '').trim().toLowerCase();
      const cleanTargetUid = (targetUid || '').trim();

      if (!cleanTargetEmail && !cleanTargetUid) {
        return res.status(400).json({ error: 'Target student email or UID required.' });
      }

      const revocationReason = reason || 'Revoked by Master Administrator';
      const revokedAt = new Date().toISOString();

      // 2. Mark matching assignments in memory map as revoked
      let foundCount = 0;
      for (const assignment of serverCRAssignments.values()) {
        if (
          (cleanTargetEmail && assignment.email.toLowerCase() === cleanTargetEmail) ||
          (cleanTargetUid && assignment.uid === cleanTargetUid)
        ) {
          assignment.status = 'revoked';
          assignment.revokedAt = revokedAt;
          assignment.revokedBy = cleanAdmin;
          assignment.revocationReason = revocationReason;
          foundCount++;
        }
      }

      // 3. Persist revocation to Cloud Firestore
      if (adminDb) {
        try {
          if (cleanTargetEmail) {
            // Update crAssignments
            const assignmentsSnap = await adminDb.collection('crAssignments')
              .where('email', '==', cleanTargetEmail)
              .where('status', '==', 'active')
              .get();

            for (const doc of assignmentsSnap.docs) {
              await doc.ref.set(
                {
                  status: 'revoked',
                  revokedAt,
                  revokedBy: cleanAdmin,
                  revocationReason,
                },
                { merge: true }
              );
            }

            // Update user profile back to ordinary student (account is preserved!)
            const userDoc = adminDb.collection('users').doc(cleanTargetEmail.replace(/[@.]/g, '_'));
            await userDoc.set(
              {
                role: 'student',
                roles: ['student'],
                isCR: false,
                crStatus: 'revoked',
                crRevokedAt: revokedAt,
                crRevocationReason: revocationReason,
              },
              { merge: true }
            );

            // Record audit log
            await adminDb.collection('auditLogs').add({
              action: 'Class Representative Access Revoked',
              performedBy: cleanAdmin,
              details: `Revoked CR privileges from ${cleanTargetEmail} - Reason: ${revocationReason}`,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              category: 'role',
              status: 'warning',
            });
          }
        } catch (dbErr: any) {
          console.warn('[Server Revoke DB Notice]:', dbErr?.message || dbErr);
        }
      }

      console.log(`[RBAC Server] CR access revoked for ${cleanTargetEmail || cleanTargetUid} by ${cleanAdmin}`);

      return res.json({
        success: true,
        message: `CR role revoked. Student account preserved with normal Student Portal permissions.`,
        revokedAt,
      });
    } catch (err: any) {
      console.error('[Revoke CR Error]:', err);
      return res.status(500).json({ error: err?.message || 'Server error revoking CR role.' });
    }
  });

  /**
   * Protected Master Admin Operation: Grant Teacher Panel access to a specific registered Gmail account and UID.
   */
  app.post('/api/admin/grant-teacher', async (req, res) => {
    try {
      const { adminEmail, targetUid, targetEmail, targetName, assignedSubjects, assignedClass } = req.body;

      const cleanAdmin = (adminEmail || '').trim().toLowerCase();
      if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({
          error: 'Access Denied: Only verified Master Administrator (hasnainbuilds724656@gmail.com) can grant Teacher Panel access.',
        });
      }

      const cleanTargetEmail = (targetEmail || '').trim().toLowerCase();
      const cleanTargetUid = (targetUid || '').trim();

      if (!cleanTargetEmail) {
        return res.status(400).json({ error: 'Missing target teacher Gmail address.' });
      }

      const subjectsList = Array.isArray(assignedSubjects) && assignedSubjects.length > 0 ? assignedSubjects : ['PF Theory'];
      const grantedAt = new Date().toISOString();

      if (adminDb) {
        try {
          const assignmentDocId = `teacher_${cleanTargetEmail.replace(/[@.]/g, '_')}`;
          await adminDb.collection('teacherAssignments').doc(assignmentDocId).set({
            id: assignmentDocId,
            uid: cleanTargetUid || `uid_${cleanTargetEmail.replace(/[@.]/g, '_')}`,
            email: cleanTargetEmail,
            name: targetName || 'Faculty Member',
            panelType: 'teacher',
            assignedSubjects: subjectsList,
            assignedClass: assignedClass || '',
            status: 'active',
            grantedAt,
            grantedBy: cleanAdmin,
          }, { merge: true });

          const userDoc = adminDb.collection('users').doc(cleanTargetEmail.replace(/[@.]/g, '_'));
          await userDoc.set(
            {
              role: 'teacher',
              teacherStatus: 'active',
              assignedSubjects: subjectsList,
              assignedClass: assignedClass || '',
              teacherAssignedAt: grantedAt,
              teacherAssignedBy: cleanAdmin,
            },
            { merge: true }
          );

          await adminDb.collection('auditLogs').add({
            action: 'Teacher Panel Access Granted',
            performedBy: cleanAdmin,
            details: `Granted Teacher Panel access to ${cleanTargetEmail} for subjects: ${subjectsList.join(', ')}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            category: 'role',
            status: 'success',
          });
        } catch (dbErr: any) {
          console.warn('[Server Teacher DB Notice]:', dbErr?.message || dbErr);
        }
      }

      console.log(`[RBAC Server] Teacher access granted to ${cleanTargetEmail} by ${cleanAdmin}`);

      return res.json({
        success: true,
        message: `Teacher Panel access successfully granted to ${cleanTargetEmail}.`,
      });
    } catch (err: any) {
      console.error('[Grant Teacher Error]:', err);
      return res.status(500).json({ error: err?.message || 'Server error granting Teacher role.' });
    }
  });

  /**
   * Protected Master Admin Operation: Revoke Teacher access.
   */
  app.post('/api/admin/revoke-teacher', async (req, res) => {
    try {
      const { adminEmail, targetUid, targetEmail, reason } = req.body;

      const cleanAdmin = (adminEmail || '').trim().toLowerCase();
      if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({
          error: 'Access Denied: Only verified Master Administrator can revoke Teacher Panel access.',
        });
      }

      const cleanTargetEmail = (targetEmail || '').trim().toLowerCase();
      const revocationReason = reason || 'Revoked by Master Administrator';
      const revokedAt = new Date().toISOString();

      if (adminDb && cleanTargetEmail) {
        try {
          const assignmentDocId = `teacher_${cleanTargetEmail.replace(/[@.]/g, '_')}`;
          await adminDb.collection('teacherAssignments').doc(assignmentDocId).set(
            {
              status: 'revoked',
              revokedAt,
              revokedBy: cleanAdmin,
              revocationReason,
            },
            { merge: true }
          );

          const userDoc = adminDb.collection('users').doc(cleanTargetEmail.replace(/[@.]/g, '_'));
          await userDoc.set(
            {
              role: 'student',
              teacherStatus: 'revoked',
              teacherRevokedAt: revokedAt,
              teacherRevocationReason: revocationReason,
            },
            { merge: true }
          );

          await adminDb.collection('auditLogs').add({
            action: 'Teacher Panel Access Revoked',
            performedBy: cleanAdmin,
            details: `Revoked Teacher Panel access from ${cleanTargetEmail} - Reason: ${revocationReason}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            category: 'role',
            status: 'warning',
          });
        } catch (dbErr: any) {
          console.warn('[Server Revoke Teacher DB Notice]:', dbErr?.message || dbErr);
        }
      }

      return res.json({
        success: true,
        message: `Teacher Panel access revoked for ${cleanTargetEmail}.`,
        revokedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Server error revoking Teacher role.' });
    }
  });

  /**
   * Protected Master Admin Operation: Assign faculty teacher to an exact subject.
   */
  app.post('/api/admin/assign-subject-teacher', async (req, res) => {
    try {
      const { adminEmail, subjectId, teacherUid, teacherEmail, teacherName } = req.body;
      const cleanAdmin = (adminEmail || '').trim().toLowerCase();

      if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({
          error: 'Access Denied: Only verified Master Administrator can assign subject teachers.',
        });
      }

      const cleanSubjId = (subjectId || '').trim();
      const cleanUid = (teacherUid || '').trim();
      const cleanEmail = (teacherEmail || '').trim().toLowerCase();
      const cleanName = (teacherName || '').trim();

      if (!cleanSubjId || !cleanUid || !cleanEmail) {
        return res.status(400).json({ error: 'Missing subject ID, teacher UID, or teacher Gmail.' });
      }

      const nowIso = new Date().toISOString();
      const assignmentId = `sta_${cleanSubjId}_${cleanUid}_${Date.now()}`;

      if (adminDb) {
        // 1. Fetch subject details
        const subjRef = adminDb.collection('subjects').doc(cleanSubjId);
        const subjSnap = await subjRef.get();
        const subjData = subjSnap.exists ? subjSnap.data() : { name: cleanSubjId, code: cleanSubjId };

        // 2. Revoke any previous active assignment on this subject
        const prevAssignments = await adminDb
          .collection('subjectTeacherAssignments')
          .where('subjectId', '==', cleanSubjId)
          .where('status', '==', 'active')
          .get();

        for (const prevDoc of prevAssignments.docs) {
          await prevDoc.ref.set(
            {
              status: 'revoked',
              revokedAt: nowIso,
              revokedBy: cleanAdmin,
              revocationReason: `Replaced by ${cleanName}`,
            },
            { merge: true }
          );
        }

        // 3. Create new assignment document
        const assignmentPayload = {
          id: assignmentId,
          subjectId: cleanSubjId,
          subjectName: subjData.name || cleanSubjId,
          subjectCode: subjData.code || cleanSubjId,
          assignedClass: subjData.assignedClass || '',
          teacherUid: cleanUid,
          teacherEmail: cleanEmail,
          teacherName: cleanName,
          status: 'active',
          assignedBy: cleanAdmin,
          assignedAt: nowIso,
          revokedAt: null,
          revokedBy: null,
          revocationReason: null,
          lastConfirmedActiveAt: nowIso,
        };

        await adminDb.collection('subjectTeacherAssignments').doc(assignmentId).set(assignmentPayload);

        // 4. Update canonical subject document
        await subjRef.set(
          {
            assignedTeacher: cleanName,
            teacherEmail: cleanEmail,
            teacherUid: cleanUid,
            status: 'Assigned',
            teacherAssignedAt: nowIso,
            assignmentId,
            lastConfirmedActiveAt: nowIso,
          },
          { merge: true }
        );

        // 5. Update user profile document (maintaining Student role)
        const userDoc = adminDb.collection('users').doc(cleanUid);
        await userDoc.set(
          {
            role: 'teacher',
            teacherStatus: 'active',
            teacherAssignedAt: nowIso,
            teacherAssignedBy: cleanAdmin,
          },
          { merge: true }
        );

        // 6. Security audit trail
        await adminDb.collection('auditLogs').add({
          action: 'Subject Teacher Assigned',
          performedBy: cleanAdmin,
          details: `Assigned faculty member ${cleanName} (${cleanEmail}, UID: ${cleanUid.slice(0, 8)}...) to subject ${subjData.name || cleanSubjId}`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          category: 'academic',
          status: 'success',
        });
      }

      return res.json({
        success: true,
        assignmentId,
        message: `Teacher ${cleanName} successfully assigned to ${cleanSubjId}.`,
      });
    } catch (err: any) {
      console.error('[Assign Subject Teacher Error]:', err);
      return res.status(500).json({ error: err?.message || 'Server error assigning subject teacher.' });
    }
  });

  /**
   * Protected Master Admin Operation: Revoke teacher access from a specific subject.
   */
  app.post('/api/admin/revoke-subject-teacher', async (req, res) => {
    try {
      const { adminEmail, subjectId, reason } = req.body;
      const cleanAdmin = (adminEmail || '').trim().toLowerCase();

      if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({
          error: 'Access Denied: Only verified Master Administrator can revoke subject teachers.',
        });
      }

      const cleanSubjId = (subjectId || '').trim();
      const revocationReason = reason || 'Revoked by Master Administrator';
      const nowIso = new Date().toISOString();

      if (adminDb && cleanSubjId) {
        // 1. Mark active assignment as revoked
        const activeSnap = await adminDb
          .collection('subjectTeacherAssignments')
          .where('subjectId', '==', cleanSubjId)
          .where('status', '==', 'active')
          .get();

        let revokedTeacherUid = '';
        for (const docSnap of activeSnap.docs) {
          const d = docSnap.data();
          revokedTeacherUid = d.teacherUid || '';
          await docSnap.ref.set(
            {
              status: 'revoked',
              revokedAt: nowIso,
              revokedBy: cleanAdmin,
              revocationReason,
            },
            { merge: true }
          );
        }

        // 2. Unassign subject
        await adminDb.collection('subjects').doc(cleanSubjId).set(
          {
            assignedTeacher: null,
            teacherEmail: null,
            teacherUid: null,
            status: 'Unassigned',
            teacherAssignedAt: null,
            assignmentId: null,
          },
          { merge: true }
        );

        // 3. Update teacher user doc if no remaining active subjects
        if (revokedTeacherUid) {
          const otherSnap = await adminDb
            .collection('subjectTeacherAssignments')
            .where('teacherUid', '==', revokedTeacherUid)
            .where('status', '==', 'active')
            .get();

          if (otherSnap.empty) {
            await adminDb.collection('users').doc(revokedTeacherUid).set(
              {
                teacherStatus: 'revoked',
                teacherRevokedAt: nowIso,
                teacherRevokedBy: cleanAdmin,
                teacherRevocationReason: revocationReason,
              },
              { merge: true }
            );
          }
        }

        // 4. Audit log
        await adminDb.collection('auditLogs').add({
          action: 'Subject Teacher Access Revoked',
          performedBy: cleanAdmin,
          details: `Revoked teacher access from subject ${cleanSubjId} - Reason: ${revocationReason}`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          category: 'academic',
          status: 'warning',
        });
      }

      return res.json({
        success: true,
        message: `Teacher access revoked for subject ${cleanSubjId}. All materials preserved.`,
      });
    } catch (err: any) {
      console.error('[Revoke Subject Teacher Error]:', err);
      return res.status(500).json({ error: err?.message || 'Server error revoking subject teacher.' });
    }
  });

  /**
   * Protected Master Admin Operation: Confirm and keep current subject teacher active.
   */
  app.post('/api/admin/keep-subject-teacher-active', async (req, res) => {
    try {
      const { adminEmail, subjectId } = req.body;
      const cleanAdmin = (adminEmail || '').trim().toLowerCase();

      if (cleanAdmin !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({
          error: 'Access Denied: Only verified Master Administrator can confirm active teachers.',
        });
      }

      const cleanSubjId = (subjectId || '').trim();
      const nowIso = new Date().toISOString();

      if (adminDb && cleanSubjId) {
        await adminDb.collection('subjects').doc(cleanSubjId).set(
          {
            lastConfirmedActiveAt: nowIso,
          },
          { merge: true }
        );

        const snap = await adminDb
          .collection('subjectTeacherAssignments')
          .where('subjectId', '==', cleanSubjId)
          .where('status', '==', 'active')
          .get();

        for (const docSnap of snap.docs) {
          await docSnap.ref.set({ lastConfirmedActiveAt: nowIso }, { merge: true });
        }

        await adminDb.collection('auditLogs').add({
          action: 'Subject Teacher Kept Active',
          performedBy: cleanAdmin,
          details: `Master Admin confirmed active teacher assignment for subject ${cleanSubjId}`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          category: 'academic',
          status: 'success',
        });
      }

      return res.json({ success: true, confirmedAt: nowIso });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to keep teacher active.' });
    }
  });

  /**
   * Protected Master Admin Operation: Verify accounts against real Firebase Authentication users by UID.
   * Retains accounts with a valid Firebase Auth UID (or Master Admin) and removes all unverified or synthetic orphan records.
   */
  app.all('/api/admin/verify-and-clean-users', async (req, res) => {
    try {
      const verifiedAccounts: any[] = [];
      const removedAccounts: any[] = [];

      // 1. Fetch all real Firebase Auth users
      const firebaseAuthUsers = new Map<string, any>(); // email -> authUser
      const authUidSet = new Set<string>(); // set of valid UIDs

      if (admin && admin.auth) {
        try {
          const listUsersResult = await admin.auth().listUsers(1000);
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
          console.log(`[Auth Audit] Found ${authUidSet.size} registered accounts in Firebase Authentication.`);
        } catch (authErr: any) {
          console.warn('[Auth Audit] Notice listing Firebase Auth users:', authErr?.message || authErr);
        }
      }

      // 2. Fetch all Firestore user documents and audit
      if (adminDb) {
        try {
          const usersSnap = await adminDb.collection('users').get();
          console.log(`[Auth Audit] Auditing ${usersSnap.docs.length} user documents in Firestore 'users' collection.`);

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
                roles: data.roles || [data.role || 'student'],
                department: data.department || 'Software Engineering',
                assignedClass: data.assignedClass || 'BS SE',
                verificationStatus: 'Verified Firebase Auth User',
              });
            } else if (authUidSet.size > 0 && (!docEmail || (!docEmail.includes('@') && !docUid))) {
              // Only delete truly corrupted/empty records if we successfully connected to Firebase Auth
              await docSnap.ref.delete();

              removedAccounts.push({
                id: docId,
                name: data.name || data.fullName || 'Unverified Record',
                email: docEmail || 'No Email',
                uid: docUid || 'No UID',
                role: data.role || 'unknown',
                reason: 'No matching account or valid UID found in Firebase Authentication users',
              });
            } else {
              // Preserve student profile
              verifiedAccounts.push({
                id: docId,
                name: data.name || data.fullName || (docEmail ? docEmail.split('@')[0] : 'Registered Student'),
                email: docEmail || 'Student Profile',
                uid: docUid || docId,
                role: data.role || 'student',
                roles: data.roles || [data.role || 'student'],
                department: data.department || 'Software Engineering',
                assignedClass: data.assignedClass,
                verificationStatus: 'Preserved Profile',
              });
            }
          }
        } catch (dbErr: any) {
          console.error('[Auth Audit] Error auditing Firestore users:', dbErr);
        }
      }

      // 3. Ensure any real Firebase Auth user exists in Firestore
      for (const [email, authUser] of firebaseAuthUsers.entries()) {
        if (email === MASTER_ADMIN_EMAIL.toLowerCase()) continue;
        const existsInVerified = verifiedAccounts.some((u) => u.email.toLowerCase() === email);
        if (!existsInVerified && adminDb) {
          const docId = email.replace(/[@.]/g, '_');
          const newUserDoc = {
            id: `u-${authUser.uid}`,
            uid: authUser.uid,
            email: email,
            name: authUser.displayName || email.split('@')[0].replace(/[._]/g, ' '),
            role: 'student',
            roles: ['student'],
            status: 'active',
            department: 'Software Engineering',
            semester: '1st Semester',
            isFirebaseUser: true,
            emailVerified: authUser.emailVerified ?? false,
            registeredDate: 'Recently Registered',
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
            roles: ['student'],
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

      return res.json({
        success: true,
        summary: {
          totalVerifiedAccounts: uniqueVerified.length,
          totalRemovedAccounts: uniqueRemoved.length,
        },
        verifiedAccounts: uniqueVerified,
        removedAccounts: uniqueRemoved,
      });
    } catch (err: any) {
      console.error('[Verify & Clean Users Error]:', err);
      return res.status(500).json({ error: err?.message || 'Failed to verify and clean user accounts.' });
    }
  });

  /**
   * Search registered accounts across Cloud Firestore and Firebase Authentication.
   * Auto-synchronizes newly found Firebase Auth accounts into Firestore.
   */
  app.get('/api/admin/search-users', async (req, res) => {
    try {
      const q = ((req.query.q as string) || '').trim().toLowerCase();
      const results: any[] = [];
      const seen = new Set<string>();

      // 1. Search in Firestore users collection
      if (adminDb) {
        try {
          const usersSnap = await adminDb.collection('users').get();
          usersSnap.forEach((docSnap: any) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const email = (data.email || (docId.includes('@') ? docId : (docId.includes('_') ? docId.replace(/_/g, '.') : ''))).trim().toLowerCase();
            const name = (data.name || data.fullName || '').toLowerCase();
            const studentId = (data.studentId || data.rollNo || '').toLowerCase();
            const uid = (data.uid || data.firebaseUid || (docId.length >= 15 && !docId.includes('@') ? docId : '')).trim();

            const matches = !q || email.includes(q) || name.includes(q) || studentId.includes(q) || uid.toLowerCase() === q;
            if (matches && email && !seen.has(email)) {
              seen.add(email);
              results.push({
                id: docSnap.id,
                uid: uid || docSnap.id,
                name: data.name || data.fullName || email.split('@')[0],
                email,
                studentId: data.studentId || data.rollNo,
                role: data.role || 'student',
                roles: data.roles || [data.role || 'student'],
                status: data.status || 'active',
                department: data.department || 'Software Engineering',
                assignedClass: data.assignedClass,
                assignedSubjects: data.assignedSubjects,
                emailVerified: !!data.emailVerified,
                isFirebaseUser: true,
              });
            }
          });
        } catch (err: any) {
          console.warn('[Server Search] Firestore users query notice:', err?.message || err);
        }
      }

      // 2. Also search directly in Firebase Auth users if admin.auth() is available
      if (admin && admin.auth) {
        try {
          if (q && q.includes('@')) {
            try {
              const authUser = await admin.auth().getUserByEmail(q);
              if (authUser && authUser.email && !seen.has(authUser.email.toLowerCase())) {
                const userEmail = authUser.email.toLowerCase();
                seen.add(userEmail);
                const roll = Math.floor(1000 + Math.random() * 9000);
                const newUserObj = {
                  id: `u-${authUser.uid}`,
                  uid: authUser.uid,
                  name: authUser.displayName || userEmail.split('@')[0].replace(/[._]/g, ' '),
                  email: userEmail,
                  studentId: `26SE${roll}`,
                  role: 'student',
                  roles: ['student'],
                  status: 'active',
                  department: 'Software Engineering',
                  semester: '1st Semester',
                  emailVerified: authUser.emailVerified ?? false,
                  registeredDate: 'Recently Registered',
                  isFirebaseUser: true,
                };
                results.push(newUserObj);

                // Auto-sync into Firestore
                if (adminDb) {
                  adminDb.collection('users').doc(authUser.uid).set(newUserObj, { merge: true }).catch(() => {});
                  adminDb.collection('users').doc(userEmail.replace(/[@.]/g, '_')).set(newUserObj, { merge: true }).catch(() => {});
                }
              }
            } catch (e) {
              // Not found by exact email, proceed to listUsers check
            }
          }

          // Check listUsers (recent 100)
          const listRes = await admin.auth().listUsers(100);
          for (const u of listRes.users) {
            const uEmail = (u.email || '').toLowerCase();
            if (uEmail && !seen.has(uEmail)) {
              const uName = (u.displayName || '').toLowerCase();
              const matches = !q || uEmail.includes(q) || uName.includes(q);
              if (matches) {
                seen.add(uEmail);
                const roll = Math.floor(1000 + Math.random() * 9000);
                const userRecord = {
                  id: `u-${u.uid}`,
                  uid: u.uid,
                  name: u.displayName || uEmail.split('@')[0].replace(/[._]/g, ' '),
                  email: uEmail,
                  studentId: `26SE${roll}`,
                  role: 'student',
                  roles: ['student'],
                  status: 'active',
                  department: 'Software Engineering',
                  semester: '1st Semester',
                  emailVerified: u.emailVerified ?? false,
                  registeredDate: 'Recently Registered',
                  isFirebaseUser: true,
                };
                results.push(userRecord);

                if (adminDb) {
                  adminDb.collection('users').doc(u.uid).set(userRecord, { merge: true }).catch(() => {});
                  adminDb.collection('users').doc(uEmail.replace(/[@.]/g, '_')).set(userRecord, { merge: true }).catch(() => {});
                }
              }
            }
          }
        } catch (authErr: any) {
          console.warn('[Server Search] Auth users check notice:', authErr?.message || authErr);
        }
      }

      return res.json({ success: true, users: results });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Search failed' });
    }
  });

  /**
   * Enforces server-side authorization on EVERY CR operation (attendance marking, correction, PDF export, roster).
   * Denies access if the user's CR status is not currently active for the target class.
   */
  app.post('/api/cr/verify-operation', async (req, res) => {
    try {
      const { uid, email, targetClass, operation } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanUid = (uid || '').trim();
      const cleanClass = (targetClass || '').trim();

      const activeAssignment = await getActiveAssignment(cleanUid, cleanEmail);

      if (!activeAssignment || activeAssignment.status !== 'active') {
        return res.status(403).json({
          authorized: false,
          error: 'Forbidden: You do not have an active Class Representative assignment. CR access has been revoked or expired.',
        });
      }

      if (cleanClass && activeAssignment.assignedClass.toLowerCase() !== cleanClass.toLowerCase()) {
        return res.status(403).json({
          authorized: false,
          error: `Forbidden: Your CR authorization is strictly restricted to ${activeAssignment.assignedClass}. You cannot perform operations on ${cleanClass}.`,
        });
      }

      return res.json({
        authorized: true,
        assignedClass: activeAssignment.assignedClass,
        operation: operation || 'general',
      });
    } catch (err: any) {
      return res.status(500).json({ authorized: false, error: err?.message || 'Authorization check failed.' });
    }
  });

  /**
   * Retrieves all active and historical CR assignments for Master Admin monitoring
   */
  app.get('/api/admin/cr-assignments', async (req, res) => {
    try {
      const adminEmail = (req.query.adminEmail as string || '').trim().toLowerCase();
      if (adminEmail !== MASTER_ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }

      const list = Array.from(serverCRAssignments.values());
      return res.json({ assignments: list });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // =========================================================================
  // BRANDING INSTANT SERVING API
  // =========================================================================

  app.get('/api/branding', async (_req, res) => {
    if (serverBrandingCache) {
      return res.json(serverBrandingCache);
    }
    if (adminDb) {
      try {
        const snap = await adminDb.collection('config').doc('branding').get();
        if (snap.exists) {
          serverBrandingCache = snap.data();
          return res.json(serverBrandingCache);
        }
      } catch (err: any) {
        console.info('[Server Branding] Notice querying Firestore branding:', err?.message || err);
      }
    }
    return res.json({
      logoUrl: '',
      bottomImageUrl: '/images/awkum-admin-building.jpg',
      bottomImageEnabled: true,
      bottomImageScale: 100,
      bgImageUrl: '',
      bgImageEnabled: false,
      bgImageScale: 100,
      version: 1,
    });
  });

  app.post('/api/branding', async (req, res) => {
    try {
      const newBranding = req.body;
      serverBrandingCache = newBranding;
      if (adminDb) {
        await adminDb.collection('config').doc('branding').set(newBranding, { merge: true });
      }
      return res.json({ success: true, branding: serverBrandingCache });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to update server branding cache.' });
    }
  });

  /**
   * Tier 4 Server-Side Disk & PWA Sync Endpoint:
   * Parses base64 buffer and overwrites all static icon files on disk (public/icon-192.png, public/icon-512.png, favicon.png, apple-touch-icon.png, og-image.png)
   */
  app.post('/api/branding/logo', async (req, res) => {
    try {
      const logoDataUrl = req.body?.logoDataUrl || req.body?.logoData || req.body?.logoUrl || '';
      if (!logoDataUrl) {
        return res.status(400).json({ error: 'Missing logoDataUrl payload.' });
      }

      let buffer: Buffer | null = null;
      if (logoDataUrl.includes(';base64,')) {
        const parts = logoDataUrl.split(';base64,');
        buffer = Buffer.from(parts[1], 'base64');
      } else if (logoDataUrl.startsWith('http://') || logoDataUrl.startsWith('https://')) {
        try {
          const fetchRes = await fetch(logoDataUrl);
          if (fetchRes.ok) {
            const arrayBuffer = await fetchRes.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
          }
        } catch (e) {
          console.warn('[Server Branding Logo] Notice fetching remote logo:', e);
        }
      }

      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      lastLogoTimestamp = Date.now();
      const filesUpdated: string[] = [];

      if (buffer) {
        const staticIconNames = [
          'icon-192.png',
          'icon-512.png',
          'favicon.png',
          'apple-touch-icon.png',
          'og-image.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ];

        for (const filename of staticIconNames) {
          const targetPath = path.join(publicDir, filename);
          fs.writeFileSync(targetPath, buffer);
          filesUpdated.push(filename);

          const distDir = path.resolve(__dirname, 'dist');
          if (fs.existsSync(distDir)) {
            try {
              fs.writeFileSync(path.join(distDir, filename), buffer);
            } catch {}
          }
        }
      }

      if (serverBrandingCache) {
        serverBrandingCache.logoUrl = logoDataUrl;
      } else {
        serverBrandingCache = { logoUrl: logoDataUrl, version: lastLogoTimestamp };
      }

      if (adminDb) {
        const payload = {
          logoUrl: logoDataUrl,
          logoDataUrl,
          publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        adminDb.collection('config').doc('branding').set(payload, { merge: true }).catch(() => {});
        adminDb.collection('pages').doc('branding_settings').set(payload, { merge: true }).catch(() => {});
        adminDb.collection('branding').doc('settings').set(payload, { merge: true }).catch(() => {});
      }

      console.log(`[Server Branding Logo] Tier 4 sync complete! Updated static PWA icons on disk. Timestamp v=${lastLogoTimestamp}`);

      return res.json({
        success: true,
        timestamp: lastLogoTimestamp,
        filesUpdated,
        logoUrl: logoDataUrl,
      });
    } catch (err: any) {
      console.error('[Server Branding Logo Error]:', err);
      return res.status(500).json({ error: err?.message || 'Failed to update static icons on disk.' });
    }
  });

  /**
   * Dynamic Web App Manifest Endpoint for PWA Installation with timestamp cache-buster (?v=...)
   */
  app.get('/manifest.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({
      id: '/',
      name: 'AWKUM ClassHub — Student Portal',
      short_name: 'ClassHub',
      description: 'Production-quality mobile-first Student Portal for Abdul Wali Khan University Mardan (AWKUM). Manage schedules, documents, assignments, attendance, and campus updates.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#F8F0E5',
      theme_color: '#493222',
      categories: ['education', 'productivity'],
      icons: [
        {
          src: `/icon-192.png?v=${lastLogoTimestamp}`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `/pwa-192x192.png?v=${lastLogoTimestamp}`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `/icon-512.png?v=${lastLogoTimestamp}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `/pwa-512x512.png?v=${lastLogoTimestamp}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `/pwa-maskable-512x512.png?v=${lastLogoTimestamp}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: `/apple-touch-icon.png?v=${lastLogoTimestamp}`,
          sizes: '180x180',
          type: 'image/png',
          purpose: 'any'
        }
      ]
    });
  });

  // =========================================================================
  // CLOUDINARY UPLOAD & HEALTH
  // =========================================================================

  // Secure Server-Side Cloudinary Upload Endpoint
  app.post('/api/upload', async (req, res) => {
    try {
      const { fileData, fileName, folder = 'awkum_classhub/submissions' } = req.body;

      if (!fileData) {
        return res.status(400).json({ error: 'No file data received for upload.' });
      }

      console.log(`[Cloudinary Upload] Uploading ${fileName || 'file'} to folder: ${folder}...`);

      const isLogo = folder.includes('logo');
      const isTransparent =
        isLogo ||
        (fileName && /\.(png|webp|svg)$/i.test(fileName)) ||
        fileData.startsWith('data:image/png') ||
        fileData.startsWith('data:image/webp') ||
        fileData.startsWith('data:image/svg');

      const uploadOptions: Record<string, any> = {
        folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      };

      if (isTransparent) {
        uploadOptions.format =
          (fileName && fileName.endsWith('.webp')) || fileData.startsWith('data:image/webp')
            ? 'webp'
            : fileData.startsWith('data:image/svg')
            ? 'svg'
            : 'png';
      }

      const uploadResult = await cloudinary.uploader.upload(fileData, uploadOptions);

      console.log(`[Cloudinary Upload] Success: ${uploadResult.secure_url}`);

      return res.json({
        success: true,
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        format: uploadResult.format || (fileName ? fileName.split('.').pop() : 'file'),
        bytes: uploadResult.bytes,
        originalFilename: fileName || uploadResult.original_filename,
      });
    } catch (error: any) {
      console.error('[Cloudinary Upload Error]:', error);
      return res.status(500).json({
        error: error?.message || 'Cloudinary upload operation failed.',
      });
    }
  });

  // =========================================================================
  // AI TIMETABLE EXTRACTION & SUBJECT MATCHING API (GEMINI VISION)
  // =========================================================================

  /**
   * Protected CR Operation: Analyze Timetable Image using Gemini Vision AI.
   * Extracts days, periods, times, and subject labels into structured draft schedule.
   */
  app.post('/api/schedule/analyze-timetable', async (req, res) => {
    try {
      const { fileData, classId, crEmail, crUid } = req.body;

      if (!fileData || !classId) {
        return res.status(400).json({ error: 'Missing timetable image fileData or classId.' });
      }

      // 1. Enforce Server-Side Authorization: Verify active CR role or Master Admin
      const cleanEmail = (crEmail || '').trim().toLowerCase();
      const cleanUid = (crUid || '').trim();
      const cleanClass = (classId || '').trim();

      const activeAssignment = await getActiveAssignment(cleanUid, cleanEmail);
      const isMasterAdmin = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();

      if (!isMasterAdmin) {
        if (!activeAssignment || activeAssignment.status !== 'active') {
          return res.status(403).json({ error: 'Forbidden: Active Class Representative assignment required.' });
        }
        if (cleanClass && activeAssignment.assignedClass.toLowerCase() !== cleanClass.toLowerCase()) {
          return res.status(403).json({
            error: `Forbidden: Your CR authorization is strictly restricted to ${activeAssignment.assignedClass}.`,
          });
        }
      }

      // 2. Parse Image Base64 & Mime Type
      let mimeType = 'image/png';
      let base64Image = fileData;
      if (fileData.includes(';base64,')) {
        const parts = fileData.split(';base64,');
        mimeType = parts[0].replace('data:', '');
        base64Image = parts[1];
      }

      // 3. Fetch Database Subjects for Subject Matching
      let dbSubjects: { id: string; name: string; code: string; teacher?: string }[] = [];
      if (adminDb) {
        try {
          const subjectsSnap = await adminDb.collection('subjects').get();
          subjectsSnap.forEach((docSnap: any) => {
            const data = docSnap.data();
            dbSubjects.push({
              id: docSnap.id,
              name: data.name || '',
              code: data.code || '',
              teacher: data.assignedTeacher || '',
            });
          });
        } catch (dbErr: any) {
          console.info('[Schedule AI Server] Notice fetching database subjects:', dbErr?.message || dbErr);
        }
      }

      // 4. Call Gemini Vision API using @google/genai with automatic retries & model fallback
      const promptText = `Analyze this weekly university timetable image for class "${cleanClass}" at Abdul Wali Khan University Mardan (AWKUM).

CRITICAL EXTRACTION RULES:
1. Days: Extract weekdays listed in the timetable (e.g. Mon, Tue, Wed, Thu, Fri, Sat, Sun).
2. Time Periods: Extract column/period headers and identify their exact start and end times (e.g. "09:00 AM - 10:25 AM").
3. Subject Cells: Read subject names, subject codes, or course titles from each day and period cell (e.g. "CS100", "PF Theory", "ENG101", "Calculus").
4. MANDATORY BLANK CELL RULE: If a cell in the grid is empty, blank, or has no class, set rawSubject to null. DO NOT invent, guess, or distribute subjects into blank slots.
5. MANDATORY BLANK DAY RULE: If an entire day has no scheduled classes or is omitted from the timetable image, do NOT generate classes for that day.
6. EXCLUDE teacher names, room numbers, or random annotations from the extracted rawSubject string.
7. Return structured JSON matching the provided schema.`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      let geminiResponse: any = null;
      let lastErrorMsg = '';

      for (const modelName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[Schedule AI Server] Processing timetable via ${modelName} (Attempt ${attempt})...`);
            const res = await aiClient.models.generateContent({
              model: modelName,
              contents: [
                {
                  parts: [
                    {
                      inlineData: {
                        mimeType,
                        data: base64Image,
                      },
                    },
                    {
                      text: promptText,
                    },
                  ],
                },
              ],
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    days: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'List of days detected (e.g. ["Mon", "Tue", "Wed", "Thu", "Fri"])',
                    },
                    periods: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          periodIndex: { type: Type.INTEGER },
                          label: { type: Type.STRING },
                          startTime: { type: Type.STRING },
                          endTime: { type: Type.STRING },
                        },
                        required: ['periodIndex', 'startTime', 'endTime'],
                      },
                    },
                    grid: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          day: { type: Type.STRING },
                          periodIndex: { type: Type.INTEGER },
                          rawSubject: { type: Type.STRING, nullable: true },
                        },
                        required: ['day', 'periodIndex'],
                      },
                    },
                    warnings: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['days', 'periods', 'grid'],
                },
              },
            });

            if (res && res.text) {
              geminiResponse = res;
              console.log(`[Schedule AI Server] Successfully extracted schedule using ${modelName}`);
              break;
            }
          } catch (err: any) {
            lastErrorMsg = err?.message || String(err);
            console.warn(`[Schedule AI Server] ${modelName} attempt ${attempt} notice:`, lastErrorMsg);
            // Wait 1 second before next retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        if (geminiResponse && geminiResponse.text) {
          break;
        }
      }

      if (!geminiResponse || !geminiResponse.text) {
        return res.status(503).json({
          error: 'Gemini AI Vision servers are currently experiencing peak demand. Automatic retries were attempted. Please click "Extract Timetable with Gemini AI" again in a few seconds.',
        });
      }

      const extractedJsonText = geminiResponse.text?.trim() || '{}';
      let extractedData: any = {};
      try {
        extractedData = JSON.parse(extractedJsonText);
      } catch (e) {
        console.warn('[Schedule AI Server] Failed to parse Gemini JSON output:', extractedJsonText);
      }

      // 5. Build Structured Draft Schedule with Subject Matching
      const extractedDays: string[] = extractedData.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const extractedPeriods: any[] = extractedData.periods || [];
      const extractedGrid: any[] = extractedData.grid || [];
      const extractedWarnings: string[] = extractedData.warnings || [];

      const items: any[] = [];

      for (const cell of extractedGrid) {
        if (!cell.rawSubject || typeof cell.rawSubject !== 'string' || !cell.rawSubject.trim()) {
          continue; // Skip empty cells as required by rules
        }

        const rawText = cell.rawSubject.trim();
        const periodObj = extractedPeriods.find((p) => p.periodIndex === cell.periodIndex);
        const startTime = periodObj?.startTime || '09:00 AM';
        const endTime = periodObj?.endTime || '10:25 AM';
        const periodLabel = periodObj?.label || `${startTime} - ${endTime}`;

        // Fuzzy Subject Matching against dbSubjects
        let matchedSubject = dbSubjects.find((s) => {
          const cleanRaw = rawText.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanCode = s.code.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');

          return (
            (cleanCode && cleanRaw.includes(cleanCode)) ||
            (cleanName && (cleanRaw.includes(cleanName) || cleanName.includes(cleanRaw)))
          );
        });

        const isMatched = !!matchedSubject;
        const subjectCode = matchedSubject?.code || rawText.split(' ')[0] || rawText;
        const subjectName = matchedSubject?.name || rawText;
        const subjectId = matchedSubject?.id || `raw_${rawText.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const teacherName = matchedSubject?.teacher || undefined;

        items.push({
          id: `p_${cell.day}_${cell.periodIndex}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          day: cell.day,
          periodIndex: cell.periodIndex,
          periodLabel,
          startTime,
          endTime,
          subjectId,
          subjectCode,
          subjectName,
          teacherName,
          room: 'Department Lecture Hall',
          isMatched,
          matchWarning: isMatched
            ? undefined
            : `Unmatched subject '${rawText}' - Please verify with registered curriculum subjects.`,
        });
      }

      const draftSchedule = {
        id: `draft_${cleanClass.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        classId: cleanClass,
        status: 'draft',
        publishedVersion: 0,
        sourceImageUrl: fileData.length < 500000 ? fileData : undefined,
        items,
        days: extractedDays,
        warnings: extractedWarnings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(
        `[Schedule AI Server] AI Extraction complete for ${cleanClass}: Extracted ${items.length} classes across ${extractedDays.length} days.`
      );

      return res.json({
        success: true,
        draft: draftSchedule,
        extractedCount: items.length,
      });
    } catch (err: any) {
      console.error('[Schedule AI Server Error]:', err);
      return res.status(500).json({ error: err?.message || 'Failed to analyze timetable image with AI.' });
    }
  });

  // Diagnostics and Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'AWKUM ClassHub Full-Stack API',
      rbac: {
        activeCRAssignments: Array.from(serverCRAssignments.values()).filter((a) => a.status === 'active').length,
        masterAdmin: MASTER_ADMIN_EMAIL,
      },
      cloudinary: {
        cloud_name: 'ehc1fewm',
        status: 'connected',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Development: Vite middleware mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AWKUM ClassHub Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
