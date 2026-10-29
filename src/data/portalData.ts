export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  program: string;
  university: string;
  session: string;
  semester: string;
  section: string;
  cgpa: number;
  phone: string;
  emergencyContact: string;
  address: string;
  avatarUrl: string;
  fatherName?: string;
}

export interface SubjectInfo {
  id: string;
  name: string;
  fullName: string;
  code: string;
  creditHours: string;
  teacher: string;
  teacherEmail: string;
  room: string;
  iconName: 'code' | 'terminal' | 'monitor' | 'briefcase' | 'book' | 'calculator' | 'atom';
  color: string;
  totalNotes: number;
  totalAssignments: number;
}

export interface ScheduleItem {
  id: string;
  subjectId: string;
  subjectName: string;
  time: string;
  startTime: string; // e.g. "10:30"
  endTime: string;   // e.g. "11:20"
  room: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  dateNum: number;
  teacher: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  startsIn?: string;
}

export interface DailyAttendanceRecord {
  date: string;
  dayOfWeek: string;
  status: 'present' | 'absent';
  finalized: boolean;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  category: 'Lecture Notes' | 'Lab Manual' | 'Slides' | 'Past Papers' | 'Lectures' | 'Lab Work' | 'Others' | string;
  fileType: 'pdf' | 'pptx' | 'docx' | 'zip' | 'ppt' | 'doc' | string;
  fileSize: string;
  uploadDate: string;
  uploader: string;
  uploadedBy?: string;
  fileName?: string;
  fileUrl?: string;
  totalPages?: number;
  description: string;
  previewSnippet: string[];
  date?: string;
}

export interface AssignmentItem {
  id: string;
  subjectId: string;
  subjectName: string;
  teacher: string;
  title: string;
  questionPreview: string;
  fullInstructions: string;
  description?: string;
  dueDate: string;
  dueTime: string;
  deadlineAt?: string; // ISO 8601 string for server-level deadline checks
  totalMarks: number;
  attachmentName?: string;
  attachmentSize?: string;
  attachedFileName?: string;
  attachedFileUrl?: string;
  attachedFileSize?: string;
  voiceInstructionUrl?: string;
  voiceInstructionDuration?: number; // duration in seconds
  voiceInstructionDurationFormatted?: string; // e.g. "01:25"
  allowLate?: boolean;
  status: 'todo' | 'submitted' | 'overdue' | 'graded' | 'active' | 'closed';
  submissionDate?: string;
  submittedContent?: string;
  submittedFileName?: string;
  submittedFileUrl?: string;
  submittedCount?: number;
  totalStudents?: number;
  grade?: string | number;
  teacherFeedback?: string;
  createdDate?: string;
  teacherEmail?: string;
  teacherUid?: string;
  targetClass?: string;
  isLate?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  subject?: string;
  category: 'Assignments' | 'Uploads' | 'Schedule' | 'Notices';
  message: string;
  timestamp: string;
  read: boolean;
  actionTarget: {
    tab: 'home' | 'schedule' | 'classes' | 'assignments' | 'progress';
    subjectId?: string;
    documentId?: string;
    assignmentId?: string;
  };
}

export interface NoticeItem {
  id: string;
  title: string;
  subjectId?: string;
  subjectName?: string;
  department: string;
  date: string;
  urgent: boolean;
  content: string;
  postedBy?: string;
}

// Clean initial student baseline for new enrollments
export const INITIAL_STUDENT: StudentProfile = {
  id: '26SE1001',
  name: 'Registered Student',
  email: 'student@awkum.edu.pk',
  department: 'Software Engineering',
  program: 'BS Software Engineering',
  university: 'Abdul Wali Khan University Mardan',
  session: '2026 – 2030',
  semester: '1st Semester',
  section: '1A',
  cgpa: 0.0,
  phone: '',
  emergencyContact: '',
  address: 'Garden Campus, Mardan, Khyber Pakhtunkhwa',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400',
};

// Dynamic subjects baseline - populated from Master Admin curriculum in Firestore
export const SUBJECTS: SubjectInfo[] = [];

// Dynamic schedule items baseline - populated from official university schedules
export const SCHEDULE_ITEMS: ScheduleItem[] = [];

// Single daily attendance records for the class: initialized clean from initial stage
export const DAILY_ATTENDANCE_RECORDS: DailyAttendanceRecord[] = [];

export const ATTENDANCE_WEEKLY_TREND = [
  { label: 'Mon', percentage: 0, present: 0, total: 0 },
  { label: 'Tue', percentage: 0, present: 0, total: 0 },
  { label: 'Wed', percentage: 0, present: 0, total: 0 },
  { label: 'Thu', percentage: 0, present: 0, total: 0 },
  { label: 'Fri', percentage: 0, present: 0, total: 0 },
  { label: 'Sat', percentage: 0, present: 0, total: 0 },
  { label: 'Sun', percentage: 0, present: 0, total: 0, isWeekend: true },
];

export const ATTENDANCE_MONTHLY_TREND = [
  { label: 'Week 1', percentage: 0, present: 0, total: 0 },
  { label: 'Week 2', percentage: 0, present: 0, total: 0 },
  { label: 'Week 3', percentage: 0, present: 0, total: 0 },
  { label: 'Week 4', percentage: 0, present: 0, total: 0 },
];

// Clean real-time document materials (populated from Firestore documents)
export const DOCUMENTS: DocumentItem[] = [];

// Clean real-time assignments (populated from Firestore assignments)
export const ASSIGNMENTS: AssignmentItem[] = [];

// Clean real-time notifications (generated dynamically per student / Firestore alerts)
export const NOTIFICATIONS: NotificationItem[] = [];

// Clean announcements and notices (populated from Firestore announcements)
export const NOTICES: NoticeItem[] = [];
