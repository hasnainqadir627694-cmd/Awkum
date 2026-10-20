export type UserRole = 'master_admin' | 'teacher' | 'cr' | 'student';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  role: UserRole;
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
  teacherEmail?: string;
  status: 'Assigned' | 'Unassigned';
  creditHours: number;
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
  logoUrl: '',
  bottomImageUrl: '',
  bottomImageEnabled: true,
  bottomImageScale: 100,
  bgImageUrl: '',
  bgImageEnabled: false,
  bgImageScale: 100,
  lastUpdated: 'Oct 19, 2026',
  updatedBy: 'System',
  version: 1,
};

// 6 Official AWKUM Semester Subjects
export const OFFICIAL_SUBJECTS = [
  'PF Theory',
  'PF Lab',
  'Management',
  'English',
  'Maths',
  'Physics',
] as const;

// Initial Classes & Sections (Matching Mockup 5)
export const INITIAL_CLASSES: ClassSection[] = [
  { id: 'c1', class: 'BSCS', section: '1A', totalStudents: 42, assignedCR: null, status: 'Active' },
  { id: 'c2', class: 'BSCS', section: '1B', totalStudents: 38, assignedCR: null, status: 'Active' },
  { id: 'c3', class: 'BSCS', section: '2A', totalStudents: 45, assignedCR: 'Hamza Malik', assignedCREmail: 'hamza.cr@gmail.com', status: 'Active' },
  { id: 'c4', class: 'BSCS', section: '2B', totalStudents: 40, assignedCR: null, status: 'Active' },
  { id: 'c5', class: 'BSCS', section: '3A', totalStudents: 36, assignedCR: 'Ayesha Noor', assignedCREmail: 'ayesha123@gmail.com', status: 'Active' },
  { id: 'c6', class: 'BSCS', section: '3B', totalStudents: 32, assignedCR: null, status: 'Active' },
  { id: 'c7', class: 'BSCS', section: '4A', totalStudents: 28, assignedCR: null, status: 'Active' },
];

// Initial Subject Management Data (Matching Mockup 6)
export const INITIAL_SUBJECTS: SubjectConfig[] = [
  { id: 's1', name: 'PF Theory', code: 'PF101', assignedTeacher: 'Dr. Ali Khan', teacherEmail: 'ali.khan123@gmail.com', status: 'Assigned', creditHours: 3 },
  { id: 's2', name: 'PF Lab', code: 'PF102', assignedTeacher: 'Ms. Sara Ahmed', teacherEmail: 'sara.teacher@awkum.edu.pk', status: 'Assigned', creditHours: 1 },
  { id: 's3', name: 'Management', code: 'MG103', assignedTeacher: 'Dr. Usman Ghani', teacherEmail: 'usman.mgt@awkum.edu.pk', status: 'Assigned', creditHours: 3 },
  { id: 's4', name: 'English', code: 'EN104', assignedTeacher: 'Ms. Ayesha', teacherEmail: 'ayesha.eng@awkum.edu.pk', status: 'Assigned', creditHours: 3 },
  { id: 's5', name: 'Maths', code: 'MA105', assignedTeacher: 'Dr. Imran', teacherEmail: 'imran.maths@awkum.edu.pk', status: 'Assigned', creditHours: 3 },
  { id: 's6', name: 'Physics', code: 'PH106', assignedTeacher: 'Dr. Farhan', teacherEmail: 'farhan.physics@awkum.edu.pk', status: 'Assigned', creditHours: 3 },
];

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
