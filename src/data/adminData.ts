export type UserRole = 'master_admin' | 'teacher' | 'cr' | 'student';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface AdminUser {
  id: string;
  uid?: string; // Verified Firebase Authentication UID
  name: string;
  email: string;
  studentId?: string;
  role: UserRole;
  roles?: UserRole[]; // Supports combined roles: ['student', 'cr']
  isCR?: boolean;
  crStatus?: 'active' | 'revoked' | 'none';
  status: UserStatus;
  registeredDate: string;
  lastLogin?: string;
  avatarUrl?: string;
  assignedSubjects?: string[]; // e.g. ['PF Theory', 'PF Lab']
  assignedClass?: string; // e.g. 'BSCS 3A'
  phone?: string;
  department?: string;
  fatherName?: string;
  semester?: string;
  crAssignedAt?: string;
  crAssignedBy?: string;
  crRevokedAt?: string;
  crRevocationReason?: string;
  crAcknowledged?: boolean;
  teacherStatus?: 'active' | 'revoked' | 'none';
  teacherAssignedAt?: string;
  teacherAssignedBy?: string;
  teacherRevokedAt?: string;
  teacherRevocationReason?: string;
  isFirebaseUser?: boolean;
  emailVerified?: boolean;
  verifiedAt?: string;
}

export interface UserAggregateStats {
  totalAccounts: number;
  verifiedAccounts: number;
  unverifiedAccounts: number;
  studentCount: number;
  crCount: number;
  teacherCount: number;
  adminCount: number;
  lastReconciledAt: string;
}

export function isUserCR(user: AdminUser | null | undefined): boolean {
  if (!user) return false;
  if (user.crStatus === 'revoked') return false;
  return user.role === 'cr' || !!user.isCR || (user.roles?.includes('cr') ?? false);
}

export interface ClassSection {
  id: string;
  class: string; // e.g. 'BSCS'
  section: string; // e.g. '3A'
  totalStudents: number;
  assignedCR: string | null; // e.g. 'Hamza Malik'
  assignedCREmail?: string;
  status: 'Active' | 'Inactive';
}

export interface SubjectConfig {
  id: string;
  name: string;
  code: string;
  assignedTeacher: string | null;
  teacherEmail?: string | null;
  teacherUid?: string | null;
  status: 'Assigned' | 'Unassigned';
  creditHours: number;
  assignedClass?: string;
  description?: string;
  isActive?: boolean;
  teacherAssignedAt?: string | null;
  assignmentId?: string | null;
  lastConfirmedActiveAt?: string | null;
}

export interface SubjectTeacherAssignment {
  id: string; // e.g. "sta_subj_pf_uid123"
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  assignedClass?: string;
  teacherUid: string;
  teacherEmail: string;
  teacherName: string;
  status: 'active' | 'revoked';
  assignedBy: string;
  assignedAt: string;
  revokedBy?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
  lastConfirmedActiveAt?: string | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
  category: 'role' | 'user' | 'branding' | 'academic' | 'security';
  status: 'success' | 'warning' | 'error';
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'students' | 'teachers' | 'crs';
  postedBy: string;
  date: string;
  urgent?: boolean;
}

export interface BrandingConfig {
  logoUrl: string;
  bottomImageUrl: string;
  bottomImageEnabled?: boolean;
  bottomImageScale?: number;
  bgImageUrl?: string;
  bgImageEnabled?: boolean;
  bgImageScale?: number;
  lastUpdated: string;
  updatedBy: string;
  version: number;
  previousLogoUrl?: string;
  previousBottomImageUrl?: string;
  previousBottomImageEnabled?: boolean;
  previousBottomImageScale?: number;
  previousBgImageUrl?: string;
  previousBgImageEnabled?: boolean;
  previousBgImageScale?: number;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: '/favicon.png',
  bottomImageUrl: '',
  bottomImageEnabled: false,
  bottomImageScale: 100,
  bgImageUrl: '',
  bgImageEnabled: false,
  bgImageScale: 100,
  lastUpdated: 'Oct 24, 2026',
  updatedBy: 'System',
  version: 1,
};

// Official Subjects Catalog (Purely empty baseline - Master Admin dynamically configures subjects)
export const OFFICIAL_SUBJECTS: readonly string[] = [];

// Initial Classes & Sections (Purely empty baseline - Master Admin dynamically configures classes)
export const INITIAL_CLASSES: ClassSection[] = [];

// Initial Subject Management Data (Purely empty baseline - Master Admin dynamically configures curriculum)
export const INITIAL_SUBJECTS: SubjectConfig[] = [];

// Initial Users List (Clean, born new with master admin)
export const INITIAL_USERS: AdminUser[] = [
  {
    id: 'u-admin-1',
    name: 'Hasnain Qadir',
    email: 'hasnainbuilds724656@gmail.com',
    role: 'master_admin',
    status: 'active',
    registeredDate: 'Oct 01, 2026',
    department: 'Central Administration / IT Directorate',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  },
];

// Initial Audit Logs (Empty - born fresh)
export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];

// Initial Announcements (Empty - born fresh)
export const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [];
