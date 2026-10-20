import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from './firebaseConfig';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

export const getActiveFirebaseConfig = (): FirebaseWebConfig => {
  return FIREBASE_CONFIG;
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.error('[Firebase] Error initializing Firebase services:', err);
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
export const isFirebaseConfigured = true;
