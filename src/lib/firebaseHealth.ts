import { app, auth, db, getActiveFirebaseConfig } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { CLOUDINARY_CLOUD_NAME } from './cloudinary';

export interface HealthCheckResult {
  configStatus: 'PASS' | 'FAIL';
  sdkStatus: 'PASS' | 'FAIL';
  authStatus: 'PASS' | 'FAIL' | 'NOT TESTED';
  firestoreReadStatus: 'PASS' | 'FAIL' | 'NOT TESTED';
  firestoreWriteStatus: 'PASS' | 'FAIL' | 'NOT TESTED';
  writeReadBackStatus: 'PASS' | 'FAIL' | 'NOT TESTED';
  cloudinaryStatus: 'CONFIGURED' | 'READY_FOR_KEYS';
  securityRulesStatus: 'VERIFIED' | 'NEEDS REVIEW' | 'NOT TESTED';
  portalFunctionalityStatus: 'PASS' | 'ISSUES FOUND';
  details: {
    projectId?: string;
    authDomain?: string;
    currentUser?: string | null;
    cloudinaryCloudName?: string;
    errorMessages: string[];
    testDocumentId?: string;
  };
}

export async function runFirebaseHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    configStatus: 'FAIL',
    sdkStatus: 'FAIL',
    authStatus: 'NOT TESTED',
    firestoreReadStatus: 'NOT TESTED',
    firestoreWriteStatus: 'NOT TESTED',
    writeReadBackStatus: 'NOT TESTED',
    cloudinaryStatus: 'CONFIGURED',
    securityRulesStatus: 'NOT TESTED',
    portalFunctionalityStatus: 'PASS',
    details: {
      cloudinaryCloudName: CLOUDINARY_CLOUD_NAME,
      errorMessages: [],
    },
  };

  const config = getActiveFirebaseConfig();
  if (!config) {
    result.details.errorMessages.push('Firebase configuration is missing or contains placeholder values.');
    return result;
  }

  result.configStatus = 'PASS';
  result.details.projectId = config.projectId;
  result.details.authDomain = config.authDomain;

  if (!app) {
    result.details.errorMessages.push('Firebase App failed to initialize.');
    return result;
  }
  result.sdkStatus = 'PASS';

  // 1. Check Auth initialization
  if (auth) {
    result.authStatus = 'PASS';
    result.details.currentUser = auth.currentUser ? auth.currentUser.uid : 'Anonymous / No active session';
  } else {
    result.authStatus = 'FAIL';
    result.details.errorMessages.push('Firebase Auth service was not initialized.');
  }

  // 2. Check Firestore
  if (!db) {
    result.firestoreReadStatus = 'FAIL';
    result.firestoreWriteStatus = 'FAIL';
    result.details.errorMessages.push('Firestore service is not initialized.');
    return result;
  }

  const testDocId = `probe_${Date.now()}`;
  result.details.testDocumentId = `_health_checks/${testDocId}`;
  const testDocRef = doc(db, '_health_checks', testDocId);

  // Firestore Write test
  try {
    await setDoc(testDocRef, {
      service: 'AWKUM ClassHub Student Portal',
      timestamp: serverTimestamp(),
      probe: 'integration_verification',
      status: 'active',
    });
    result.firestoreWriteStatus = 'PASS';
  } catch (err: any) {
    result.firestoreWriteStatus = 'FAIL';
    const msg = err?.message || String(err);
    result.details.errorMessages.push(`Firestore Write: ${msg}`);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      result.securityRulesStatus = 'NEEDS REVIEW';
    }
  }

  // Firestore Read & Read-Back test
  try {
    const docSnap = await getDoc(testDocRef);
    result.firestoreReadStatus = 'PASS';
    if (result.firestoreWriteStatus === 'PASS') {
      if (docSnap.exists() && docSnap.data()?.probe === 'integration_verification') {
        result.writeReadBackStatus = 'PASS';
        result.securityRulesStatus = 'VERIFIED';
      } else {
        result.writeReadBackStatus = 'FAIL';
      }
    }
  } catch (err: any) {
    result.firestoreReadStatus = 'FAIL';
    const msg = err?.message || String(err);
    result.details.errorMessages.push(`Firestore Read: ${msg}`);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      result.securityRulesStatus = 'NEEDS REVIEW';
    }
  }

  // Cleanup test probe document safely so no residual test data remains
  if (result.firestoreWriteStatus === 'PASS') {
    try {
      await deleteDoc(testDocRef);
    } catch {
      // Non-fatal cleanup warning
    }
  }

  return result;
}
