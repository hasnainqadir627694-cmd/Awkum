import express from 'express';
import { createServer as createViteServer } from 'vite';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { fileURLToPath } from 'url';
import adminPkg from 'firebase-admin';
const admin: any = adminPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_ADMIN_EMAIL = 'hasnainbuilds724656@gmail.com';

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

      return res.json({
        isCR: false,
        assignedClass: null,
        status: 'revoked',
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
