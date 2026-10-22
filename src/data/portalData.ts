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
  totalMarks: number;
  attachmentName?: string;
  attachmentSize?: string;
  attachedFileName?: string;
  attachedFileUrl?: string;
  allowLate?: boolean;
  status: 'todo' | 'submitted' | 'overdue' | 'graded' | 'active' | 'closed';
  submissionDate?: string;
  submittedContent?: string;
  submittedFileName?: string;
  submittedCount?: number;
  totalStudents?: number;
  grade?: string;
  teacherFeedback?: string;
  createdDate?: string;
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

export const SUBJECTS: SubjectInfo[] = [
  {
    id: 'pf-theory',
    name: 'PF Theory',
    fullName: 'Programming Fundamentals (Theory)',
    code: 'CS-101',
    creditHours: '3 Credit Hours',
    teacher: 'Dr. Ali Khan',
    teacherEmail: 'ali.khan@awkum.edu.pk',
    room: 'Block B - Room 12',
    iconName: 'code',
    color: '#493222',
    totalNotes: 0,
    totalAssignments: 0,
  },
  {
    id: 'pf-lab',
    name: 'PF Lab',
    fullName: 'Programming Fundamentals (Lab)',
    code: 'CS-101L',
    creditHours: '1 Credit Hour',
    teacher: 'Lab Instructor',
    teacherEmail: 'lab.instructor@awkum.edu.pk',
    room: 'Lab Block - Room L3',
    iconName: 'monitor',
    color: '#493222',
    totalNotes: 0,
    totalAssignments: 0,
  },
  {
    id: 'management',
    name: 'Management',
    fullName: 'Principles of Management',
    code: 'MG-201',
    creditHours: '3 Credit Hours',
    teacher: 'Dr. Sara Ahmed',
    teacherEmail: 'sara.ahmed@awkum.edu.pk',
    room: 'Block A - Room 05',
    iconName: 'briefcase',
    color: '#493222',
    totalNotes: 0,
    totalAssignments: 0,
  },
  {
    id: 'english',
    name: 'English',
    fullName: 'Communication & Technical English',
    code: 'EN-102',
    creditHours: '3 Credit Hours',
    teacher: 'Ms. Ayesha',
    teacherEmail: 'ayesha@awkum.edu.pk',
    room: 'Block C - Room 09',
    iconName: 'book',
    color: '#493222',
    totalNotes: 0,
    totalAssignments: 0,
  },
  {
    id: 'maths',
    name: 'Maths',
    fullName: 'Calculus & Analytical Geometry',
    code: 'MT-101',
    creditHours: '3 Credit Hours',
    teacher: 'Dr. Imran',
    teacherEmail: 'imran@awkum.edu.pk',
    room: 'Block B - Room 14',
    iconName: 'calculator',
    color: '#493222',
    totalNotes: 0,
    totalAssignments: 0,
  },
  {
    id: 'physics',
    name: 'Physics',
    fullName: 'Applied Physics & Electromagnetism',
    code: 'PH-101',
    creditHours: '3 Credit Hours',
    teacher: 'Dr. Farhan',
    teacherEmail: 'farhan@awkum.edu.pk',
    room: 'Block A - Room 07',
    iconName: 'atom',
    color: '#493222',
    totalNotes: 0,
    totalAssignments: 0,
  },
];

export const SCHEDULE_ITEMS: ScheduleItem[] = [
  // Wednesday 22 Oct (Today)
  {
    id: 'sch-wed-1',
    subjectId: 'pf-theory',
    subjectName: 'PF Theory',
    time: '10:30 AM - 11:20 AM',
    startTime: '10:30 AM',
    endTime: '11:20 AM',
    room: 'Block B - Room 12',
    day: 'Wed',
    dateNum: 22,
    teacher: 'Dr. Ali Khan',
    status: 'upcoming',
    startsIn: '1h 10m',
  },
  {
    id: 'sch-wed-2',
    subjectId: 'management',
    subjectName: 'Management',
    time: '12:00 PM - 01:00 PM',
    startTime: '12:00 PM',
    endTime: '01:00 PM',
    room: 'Block A - Room 05',
    day: 'Wed',
    dateNum: 22,
    teacher: 'Dr. Sara Ahmed',
    status: 'upcoming',
  },
  {
    id: 'sch-wed-3',
    subjectId: 'english',
    subjectName: 'English',
    time: '01:30 PM - 02:20 PM',
    startTime: '01:30 PM',
    endTime: '02:20 PM',
    room: 'Block C - Room 09',
    day: 'Wed',
    dateNum: 22,
    teacher: 'Ms. Ayesha',
    status: 'upcoming',
  },
  {
    id: 'sch-wed-4',
    subjectId: 'maths',
    subjectName: 'Maths',
    time: '03:00 PM - 03:50 PM',
    startTime: '03:00 PM',
    endTime: '03:50 PM',
    room: 'Block B - Room 14',
    day: 'Wed',
    dateNum: 22,
    teacher: 'Dr. Imran',
    status: 'upcoming',
  },
  {
    id: 'sch-wed-5',
    subjectId: 'physics',
    subjectName: 'Physics',
    time: '04:30 PM - 05:20 PM',
    startTime: '04:30 PM',
    endTime: '05:20 PM',
    room: 'Block A - Room 07',
    day: 'Wed',
    dateNum: 22,
    teacher: 'Dr. Farhan',
    status: 'upcoming',
  },

  // Monday 20 Oct
  {
    id: 'sch-mon-1',
    subjectId: 'english',
    subjectName: 'English',
    time: '09:00 AM - 09:50 AM',
    startTime: '09:00 AM',
    endTime: '09:50 AM',
    room: 'Block C - Room 09',
    day: 'Mon',
    dateNum: 20,
    teacher: 'Ms. Ayesha',
    status: 'completed',
  },
  {
    id: 'sch-mon-2',
    subjectId: 'pf-theory',
    subjectName: 'PF Theory',
    time: '10:30 AM - 11:20 AM',
    startTime: '10:30 AM',
    endTime: '11:20 AM',
    room: 'Block B - Room 12',
    day: 'Mon',
    dateNum: 20,
    teacher: 'Dr. Ali Khan',
    status: 'completed',
  },
  {
    id: 'sch-mon-3',
    subjectId: 'maths',
    subjectName: 'Maths',
    time: '01:30 PM - 02:20 PM',
    startTime: '01:30 PM',
    endTime: '02:20 PM',
    room: 'Block B - Room 14',
    day: 'Mon',
    dateNum: 20,
    teacher: 'Dr. Imran',
    status: 'completed',
  },

  // Tuesday 21 Oct
  {
    id: 'sch-tue-1',
    subjectId: 'management',
    subjectName: 'Management',
    time: '10:00 AM - 10:50 AM',
    startTime: '10:00 AM',
    endTime: '10:50 AM',
    room: 'Block A - Room 05',
    day: 'Tue',
    dateNum: 21,
    teacher: 'Dr. Sara Ahmed',
    status: 'completed',
  },
  {
    id: 'sch-tue-2',
    subjectId: 'physics',
    subjectName: 'Physics',
    time: '11:30 AM - 12:20 PM',
    startTime: '11:30 AM',
    endTime: '12:20 PM',
    room: 'Block A - Room 07',
    day: 'Tue',
    dateNum: 21,
    teacher: 'Dr. Farhan',
    status: 'completed',
  },
  {
    id: 'sch-tue-3',
    subjectId: 'pf-lab',
    subjectName: 'PF Lab',
    time: '02:00 PM - 04:30 PM',
    startTime: '02:00 PM',
    endTime: '04:30 PM',
    room: 'Lab Block - Room L3',
    day: 'Tue',
    dateNum: 21,
    teacher: 'Lab Instructor',
    status: 'completed',
  },

  // Thursday 23 Oct
  {
    id: 'sch-thu-1',
    subjectId: 'pf-theory',
    subjectName: 'PF Theory',
    time: '10:30 AM - 11:20 AM',
    startTime: '10:30 AM',
    endTime: '11:20 AM',
    room: 'Block B - Room 12',
    day: 'Thu',
    dateNum: 23,
    teacher: 'Dr. Ali Khan',
    status: 'upcoming',
  },
  {
    id: 'sch-thu-2',
    subjectId: 'pf-lab',
    subjectName: 'PF Lab',
    time: '02:30 PM - 05:00 PM',
    startTime: '02:30 PM',
    endTime: '05:00 PM',
    room: 'Lab Block - Room L3',
    day: 'Thu',
    dateNum: 23,
    teacher: 'Lab Instructor',
    status: 'upcoming',
  },

  // Friday 24 Oct
  {
    id: 'sch-fri-1',
    subjectId: 'maths',
    subjectName: 'Maths',
    time: '09:00 AM - 09:50 AM',
    startTime: '09:00 AM',
    endTime: '09:50 AM',
    room: 'Block B - Room 14',
    day: 'Fri',
    dateNum: 24,
    teacher: 'Dr. Imran',
    status: 'upcoming',
  },
  {
    id: 'sch-fri-2',
    subjectId: 'english',
    subjectName: 'English',
    time: '10:30 AM - 11:20 AM',
    startTime: '10:30 AM',
    endTime: '11:20 AM',
    room: 'Block C - Room 09',
    day: 'Fri',
    dateNum: 24,
    teacher: 'Ms. Ayesha',
    status: 'upcoming',
  },
];

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
