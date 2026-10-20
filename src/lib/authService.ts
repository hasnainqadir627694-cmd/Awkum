import { AdminUser, UserRole, UserStatus, INITIAL_USERS, AuditLogItem } from '../data/adminData';
import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

export const MASTER_ADMIN_EMAIL = 'hasnainbuilds724656@gmail.com';

export interface AuthResolutionResult {
  success: boolean;
  user?: AdminUser;
  role?: UserRole;
  error?: string;
  isSuspended?: boolean;
}

export interface StudentRegistrationInput {
  fullName: string;
  fatherName: string;
  email: string;
  password?: string;
  department: string;
}

// In-memory registered users pool, initialized with pre-existing directory
let registeredUsersPool: AdminUser[] = [...INITIAL_USERS];

export function getRegisteredUsers(): AdminUser[] {
  return registeredUsersPool;
}

/**
 * Validates and resolves an authenticating user's role and account status.
 * Unregistered students cannot login unless they are in the database.
 */
export async function resolveUserRole(
  identifier: string,
  _password?: string
): Promise<AuthResolutionResult> {
  const cleanId = identifier.trim().toLowerCase();

  // 1. Initial Master Admin verification
  if (cleanId === MASTER_ADMIN_EMAIL.toLowerCase()) {
    let adminRecord: AdminUser = {
      id: 'u-admin-master',
      name: 'Hasnain Qadir',
      email: MASTER_ADMIN_EMAIL,
      role: 'master_admin',
      status: 'active',
      registeredDate: 'Oct 01, 2026',
      department: 'Central Administration / IT Directorate',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    };

    // If Firestore is available, retrieve or provision the persistent Master Admin document
    if (db) {
      try {
        const userDocRef = doc(db, 'users', 'master_admin');
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'suspended') {
            return {
              success: false,
              isSuspended: true,
              error: 'This administrative account has been suspended. Please contact IT Security.',
            };
          }
          adminRecord = { ...adminRecord, ...data } as AdminUser;
        } else {
          await setDoc(userDocRef, {
            ...adminRecord,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          });
        }
      } catch (err) {
        console.info('[Auth Service] Master Admin Firestore check notice:', err);
      }
    }

    return {
      success: true,
      user: adminRecord,
      role: 'master_admin',
    };
  }

  // 2. Check registered directory in memory
  const matchedUser = registeredUsersPool.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      (u.studentId && u.studentId.toLowerCase() === cleanId)
  );

  if (matchedUser) {
    if (matchedUser.status === 'suspended') {
      return {
        success: false,
        isSuspended: true,
        error: 'Your account has been suspended by the university administration. Please visit the CS Department / IT Center.',
      };
    }

    return {
      success: true,
      user: matchedUser,
      role: matchedUser.role,
    };
  }

  // 3. Check Cloud Firestore if initialized
  if (db && cleanId.includes('@')) {
    try {
      const userDocRef = doc(db, 'users', cleanId.replace(/[@.]/g, '_'));
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const remoteUser = snap.data() as AdminUser;
        if (remoteUser.status === 'suspended') {
          return {
            success: false,
            isSuspended: true,
            error: 'Your account has been suspended by the university administration.',
          };
        }
        return {
          success: true,
          user: remoteUser,
          role: remoteUser.role,
        };
      }
    } catch (err) {
      console.info('[Auth Service] Remote user lookup notice:', err);
    }
  }

  // 4. If student is not registered, strictly prevent login
  return {
    success: false,
    error: 'Account not registered. If you are a new student, please click "Register New Account" below to register for the 1st semester.',
  };
}

/**
 * Registers a new student account:
 * - Collects Full Name, Father's Name, Email, Password, Department (Software Engineering)
 * - Automatically registers the student in 1st Semester (Fall 2026)
 * - Auto-generates Roll Number / Student ID (e.g. 26SE1042)
 */
export async function registerStudentAccount(
  input: StudentRegistrationInput
): Promise<AuthResolutionResult> {
  const cleanEmail = input.email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      success: false,
      error: 'Please enter a valid university or personal email address.',
    };
  }

  if (!input.fullName.trim()) {
    return {
      success: false,
      error: 'Please enter your full name.',
    };
  }

  if (!input.fatherName.trim()) {
    return {
      success: false,
      error: "Please enter your father's name.",
    };
  }

  // Check if account already exists
  const existing = registeredUsersPool.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    return {
      success: false,
      error: 'An account with this email address is already registered. Please sign in.',
    };
  }

  // Auto-generate roll number for 1st Semester Software Engineering
  const randomRoll = Math.floor(1000 + Math.random() * 9000);
  const studentId = `26SE${randomRoll}`;

  const newStudent: AdminUser = {
    id: `u-student-${Date.now()}`,
    name: input.fullName.trim(),
    fatherName: input.fatherName.trim(),
    email: cleanEmail,
    studentId,
    role: 'student',
    status: 'active',
    registeredDate: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    department: input.department || 'Software Engineering',
    semester: '1st Semester',
    assignedClass: 'BSSE 1A',
    avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`,
  };

  // Add to active memory directory
  registeredUsersPool.unshift(newStudent);

  // Persist to Cloud Firestore if connected
  if (db) {
    try {
      const userDocRef = doc(db, 'users', cleanEmail.replace(/[@.]/g, '_'));
      await setDoc(userDocRef, {
        ...newStudent,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.info('[Auth Service] User saved to session. Remote Firestore notice:', err);
    }
  }

  // Record immutable audit log
  await recordAuditLog({
    action: 'New Student Registered',
    performedBy: cleanEmail,
    details: `${newStudent.name} S/D of ${newStudent.fatherName} (${newStudent.studentId}) registered in ${newStudent.department} (1st Semester)`,
    category: 'user',
    status: 'success',
  });

  return {
    success: true,
    user: newStudent,
    role: 'student',
  };
}

/**
 * Dispatches an immutable administrative audit log entry
 */
export async function recordAuditLog(
  item: Omit<AuditLogItem, 'id' | 'timestamp'>
): Promise<void> {
  if (db) {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        ...item,
        timestamp: serverTimestamp(),
        date: new Date().toISOString(),
      });
    } catch (err) {
      console.info('[Audit Service] Firestore audit record notice:', err);
    }
  }
}
