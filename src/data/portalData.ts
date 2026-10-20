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
  category: 'Lecture Notes' | 'Lab Manual' | 'Slides' | 'Past Papers';
  fileType: 'pdf' | 'pptx' | 'docx' | 'zip';
  fileSize: string;
  uploadDate: string;
  uploader: string;
  totalPages?: number;
  description: string;
  previewSnippet: string[];
}

export interface AssignmentItem {
  id: string;
  subjectId: string;
  subjectName: string;
  teacher: string;
  title: string;
  questionPreview: string;
  fullInstructions: string;
  dueDate: string;
  dueTime: string;
  totalMarks: number;
  attachmentName?: string;
  attachmentSize?: string;
  status: 'todo' | 'submitted' | 'overdue' | 'graded';
  submissionDate?: string;
  submittedContent?: string;
  submittedFileName?: string;
  grade?: string;
  teacherFeedback?: string;
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
}

// Initial demonstration data
export const INITIAL_STUDENT: StudentProfile = {
  id: '23SW1234',
  name: 'Hasnain Qadir',
  email: 'hasnain@awkum.edu.pk',
  department: 'Computer Science',
  program: 'BS Software Engineering',
  university: 'Abdul Wali Khan University Mardan',
  session: '2023 – 2027',
  semester: '3rd Semester',
  section: 'B',
  cgpa: 3.74,
  phone: '+92 345 9876543',
  emergencyContact: '+92 300 1234567',
  address: 'Garden Campus, Mardan, Khyber Pakhtunkhwa',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
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
    totalNotes: 5,
    totalAssignments: 2,
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
    totalNotes: 3,
    totalAssignments: 1,
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
    totalNotes: 4,
    totalAssignments: 1,
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
    totalNotes: 4,
    totalAssignments: 1,
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
    totalNotes: 4,
    totalAssignments: 1,
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
    totalNotes: 3,
    totalAssignments: 1,
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

// Single daily attendance records for the class: exactly one per calendar day
// Total 25 finalized dates: 22 Present, 3 Absent -> exactly 88%
export const DAILY_ATTENDANCE_RECORDS: DailyAttendanceRecord[] = [
  { date: 'Oct 18, 2026', dayOfWeek: 'Sat', status: 'present', finalized: true },
  { date: 'Oct 17, 2026', dayOfWeek: 'Fri', status: 'present', finalized: true },
  { date: 'Oct 16, 2026', dayOfWeek: 'Thu', status: 'present', finalized: true },
  { date: 'Oct 15, 2026', dayOfWeek: 'Wed', status: 'present', finalized: true },
  { date: 'Oct 14, 2026', dayOfWeek: 'Tue', status: 'present', finalized: true },
  { date: 'Oct 11, 2026', dayOfWeek: 'Sat', status: 'present', finalized: true },
  { date: 'Oct 10, 2026', dayOfWeek: 'Fri', status: 'present', finalized: true },
  { date: 'Oct 09, 2026', dayOfWeek: 'Thu', status: 'present', finalized: true },
  { date: 'Oct 08, 2026', dayOfWeek: 'Wed', status: 'present', finalized: true },
  { date: 'Oct 07, 2026', dayOfWeek: 'Tue', status: 'present', finalized: true },
  { date: 'Oct 05, 2026', dayOfWeek: 'Sun', status: 'absent', finalized: true, notes: 'Medical Leave Submitted' },
  { date: 'Oct 04, 2026', dayOfWeek: 'Sat', status: 'present', finalized: true },
  { date: 'Oct 03, 2026', dayOfWeek: 'Fri', status: 'present', finalized: true },
  { date: 'Oct 02, 2026', dayOfWeek: 'Thu', status: 'present', finalized: true },
  { date: 'Oct 01, 2026', dayOfWeek: 'Wed', status: 'present', finalized: true },
  { date: 'Sep 30, 2026', dayOfWeek: 'Tue', status: 'absent', finalized: true },
  { date: 'Sep 29, 2026', dayOfWeek: 'Mon', status: 'present', finalized: true },
  { date: 'Sep 28, 2026', dayOfWeek: 'Sun', status: 'present', finalized: true },
  { date: 'Sep 27, 2026', dayOfWeek: 'Sat', status: 'present', finalized: true },
  { date: 'Sep 26, 2026', dayOfWeek: 'Fri', status: 'present', finalized: true },
  { date: 'Sep 25, 2026', dayOfWeek: 'Thu', status: 'present', finalized: true },
  { date: 'Sep 24, 2026', dayOfWeek: 'Wed', status: 'present', finalized: true },
  { date: 'Sep 22, 2026', dayOfWeek: 'Mon', status: 'absent', finalized: true },
  { date: 'Sep 21, 2026', dayOfWeek: 'Sun', status: 'present', finalized: true },
  { date: 'Sep 20, 2026', dayOfWeek: 'Sat', status: 'present', finalized: true },
];

export const ATTENDANCE_WEEKLY_TREND = [
  { label: 'Mon', percentage: 80, present: 4, total: 5 },
  { label: 'Tue', percentage: 100, present: 5, total: 5 },
  { label: 'Wed', percentage: 60, present: 3, total: 5 },
  { label: 'Thu', percentage: 100, present: 5, total: 5 },
  { label: 'Fri', percentage: 80, present: 4, total: 5 },
  { label: 'Sat', percentage: 40, present: 2, total: 5 },
  { label: 'Sun', percentage: 0, present: 0, total: 0, isWeekend: true },
];

export const ATTENDANCE_MONTHLY_TREND = [
  { label: 'Week 1', percentage: 85, present: 5, total: 6 },
  { label: 'Week 2', percentage: 92, present: 6, total: 6 },
  { label: 'Week 3', percentage: 80, present: 5, total: 6 },
  { label: 'Week 4', percentage: 95, present: 6, total: 7 },
];

export const DOCUMENTS: DocumentItem[] = [
  // PF Theory
  {
    id: 'doc-pf-1',
    subjectId: 'pf-theory',
    subjectName: 'PF Theory',
    title: 'Lecture 01 - Introduction to C++ & Algorithms',
    category: 'Lecture Notes',
    fileType: 'pdf',
    fileSize: '2.4 MB',
    uploadDate: 'Oct 10, 2026',
    uploader: 'Dr. Ali Khan',
    totalPages: 24,
    description: 'Foundational introduction to problem-solving, flowchart design, compilation pipeline, and basic syntax structure.',
    previewSnippet: [
      'Abdul Wali Khan University Mardan - Department of Computer Science',
      'CS-101: Programming Fundamentals — Lecture 1',
      'Topics Covered: Algorithms, Pseudocode, Memory Organization, High-Level vs Machine Code',
      'Key Example: Euclid GCD Algorithm and execution stack trace.',
    ],
  },
  {
    id: 'doc-pf-2',
    subjectId: 'pf-theory',
    subjectName: 'PF Theory',
    title: 'Lecture 02 - Data Types, Variables & Operators',
    category: 'Lecture Notes',
    fileType: 'pdf',
    fileSize: '1.8 MB',
    uploadDate: 'Oct 07, 2026',
    uploader: 'Dr. Ali Khan',
    totalPages: 18,
    description: 'Deep dive into fundamental primitive types, bitwise operators, implicit type conversion, and variable scope.',
    previewSnippet: [
      'CS-101 Lecture 2: Primitive Types, Overflow & Expressions',
      'Integer representations, floating-point IEEE-754 standards, arithmetic and logical precedence.',
    ],
  },
  {
    id: 'doc-pf-3',
    subjectId: 'pf-theory',
    subjectName: 'PF Theory',
    title: 'Lecture 03 - Control Structures & Loops',
    category: 'Lecture Notes',
    fileType: 'pdf',
    fileSize: '2.1 MB',
    uploadDate: 'Oct 03, 2026',
    uploader: 'Dr. Ali Khan',
    totalPages: 32,
    description: 'Nested conditionals, switch statements, while/for loops, break and continue logic with dry-run exercises.',
    previewSnippet: [
      'CS-101 Lecture 3: Branching & Iteration',
      'Loop invariants, termination conditions, nested iterations, and sentinel-controlled loops.',
    ],
  },
  {
    id: 'doc-pf-4',
    subjectId: 'pf-theory',
    subjectName: 'PF Theory',
    title: 'Midterm Past Papers Collection (2022 - 2025)',
    category: 'Past Papers',
    fileType: 'pdf',
    fileSize: '4.5 MB',
    uploadDate: 'Oct 12, 2026',
    uploader: 'Dr. Ali Khan',
    totalPages: 16,
    description: 'Compiled past midterm exam papers with solution guidelines for AWKUM Computer Science 3rd semester.',
    previewSnippet: [
      'AWKUM Department of CS - Past Midterm Examination Papers',
      'Section A: 10 MCQs on memory addressing & expression evaluation',
      'Section B: 4 Code writing questions including recursion & pointer manipulation.',
    ],
  },
  {
    id: 'doc-pf-5',
    subjectId: 'pf-theory',
    subjectName: 'PF Theory',
    title: 'Pointers & Dynamic Memory Handout',
    category: 'Slides',
    fileType: 'pptx',
    fileSize: '3.6 MB',
    uploadDate: 'Oct 15, 2026',
    uploader: 'Dr. Ali Khan',
    totalPages: 28,
    description: 'Slide deck on pointer arithmetic, heap allocation via malloc/new, memory leaks, and pointer-to-pointer references.',
    previewSnippet: [
      'Slide 1: Memory Architecture & The Virtual Address Space',
      'Slide 2: Pointer Declaration, Dereferencing, and the & Operator',
      'Slide 3: Heap vs Stack allocation in Modern Operating Systems.',
    ],
  },

  // PF Lab
  {
    id: 'doc-pflab-1',
    subjectId: 'pf-lab',
    subjectName: 'PF Lab',
    title: 'Lab 01 - Setup, GCC Compiler & Basic I/O',
    category: 'Lab Manual',
    fileType: 'pdf',
    fileSize: '3.2 MB',
    uploadDate: 'Sep 28, 2026',
    uploader: 'Lab Instructor',
    totalPages: 12,
    description: 'Instructions on setting up Code::Blocks / VS Code with MinGW on AWKUM Lab machines and writing first programs.',
    previewSnippet: [
      'AWKUM CS Lab L3 Manual — Exercise 1',
      'Compiling with g++ -Wall -Wextra main.cpp -o main',
      'Lab Task 1: Formatted output using <iomanip> and setw.',
    ],
  },
  {
    id: 'doc-pflab-2',
    subjectId: 'pf-lab',
    subjectName: 'PF Lab',
    title: 'Lab 02 - Practice Questions & Array Manipulation',
    category: 'Lab Manual',
    fileType: 'pdf',
    fileSize: '2.9 MB',
    uploadDate: 'Sep 22, 2026',
    uploader: 'Lab Instructor',
    totalPages: 14,
    description: 'Seven programming problems involving single-dimension and multidimensional matrices in C++.',
    previewSnippet: [
      'Lab Task 2.1: Finding max, min and second largest in an array of size N.',
      'Lab Task 2.2: Matrix multiplication with boundary checking.',
    ],
  },

  // Management
  {
    id: 'doc-mgmt-1',
    subjectId: 'management',
    subjectName: 'Management',
    title: 'Chapter 04 - Strategic Planning & Decision Making',
    category: 'Lecture Notes',
    fileType: 'pdf',
    fileSize: '2.7 MB',
    uploadDate: 'Oct 14, 2026',
    uploader: 'Dr. Sara Ahmed',
    totalPages: 22,
    description: 'Strategic vision, SWOT analysis, BCG matrix, and competitive advantage principles for modern organizations.',
    previewSnippet: [
      'Principles of Management — Dr. Sara Ahmed',
      'Chapter 4: Formulating Business Strategies in High-Velocity Tech Markets',
      'Framework: Porter Five Forces and VRIO Resource-based view.',
    ],
  },
  {
    id: 'doc-mgmt-2',
    subjectId: 'management',
    subjectName: 'Management',
    title: 'Organizational Behavior Slide Deck',
    category: 'Slides',
    fileType: 'pptx',
    fileSize: '5.1 MB',
    uploadDate: 'Oct 05, 2026',
    uploader: 'Dr. Sara Ahmed',
    totalPages: 36,
    description: 'Slides explaining motivational theories (Maslow, Herzberg, McClelland) and cross-functional team dynamics.',
    previewSnippet: [
      'Slide: The Psychology of Engineering Teams',
      'Intrinsic vs Extrinsic drivers in agile workplace environments.',
    ],
  },

  // English
  {
    id: 'doc-eng-1',
    subjectId: 'english',
    subjectName: 'English',
    title: 'Technical Report Writing Guidelines',
    category: 'Lecture Notes',
    fileType: 'pdf',
    fileSize: '1.4 MB',
    uploadDate: 'Oct 11, 2026',
    uploader: 'Ms. Ayesha',
    totalPages: 10,
    description: 'Formatting specifications, IEEE citation standard, executive summaries, and concise phrasing for software engineers.',
    previewSnippet: [
      'Department of English — Technical Writing Handbook',
      'Section 1: Structure of a formal software specification report',
      'Active voice versus passive voice in engineering documentation.',
    ],
  },

  // Maths
  {
    id: 'doc-math-1',
    subjectId: 'maths',
    subjectName: 'Maths',
    title: 'Calculus - Integration Techniques & Formulas Sheet',
    category: 'Lecture Notes',
    fileType: 'pdf',
    fileSize: '3.1 MB',
    uploadDate: 'Oct 09, 2026',
    uploader: 'Dr. Imran',
    totalPages: 15,
    description: 'Comprehensive formula cheat sheet covering integration by parts, partial fractions, and trigonometric substitutions.',
    previewSnippet: [
      'Calculus & Analytical Geometry — Reference Sheet',
      'Standard Integrals: Trig, Exponential, Logarithmic',
      'Technique: Reduction formulas and improper integrals.',
    ],
  },

  // Physics
  {
    id: 'doc-phy-1',
    subjectId: 'physics',
    subjectName: 'Physics',
    title: 'Electromagnetism & Maxwell Equations Overview',
    category: 'Lecture Notes',
    fileType: 'pdf',
    fileSize: '3.8 MB',
    uploadDate: 'Oct 08, 2026',
    uploader: 'Dr. Farhan',
    totalPages: 26,
    description: 'Gauss Law, Ampere Law, Faraday Induction and their differential/integral formulations explained with engineering diagrams.',
    previewSnippet: [
      'Applied Physics for Computing — Dr. Farhan',
      'Topic: Maxwell Equations and Wave Propagation',
      'Relationship between electric flux and magnetic induction in semiconductor media.',
    ],
  },
];

export const ASSIGNMENTS: AssignmentItem[] = [
  {
    id: 'asg-pf-1',
    subjectId: 'pf-theory',
    subjectName: 'PF Theory',
    teacher: 'Dr. Ali Khan',
    title: 'Assignment 02: Pointers & Dynamic Memory Allocation',
    questionPreview: 'Implement a dynamic linked list in C++ supporting insertion, deletion, and reverse operations.',
    fullInstructions: `Write a robust C++ program that implements a singly linked list using dynamic memory allocation (new and delete).
Your solution must include the following member functions:
1. insertAtEnd(int value)
2. deleteNode(int value)
3. reverseList()
4. display()

Requirements:
- Prevent any memory leaks. Ensure the destructor frees all allocated nodes.
- Test with at least 15 elements and display the list before and after reversal.
- Submit a clean .cpp file or zip with brief explanation comments.`,
    dueDate: 'Oct 24, 2026',
    dueTime: '11:59 PM',
    totalMarks: 20,
    attachmentName: 'Assignment_02_Guidelines.pdf',
    attachmentSize: '420 KB',
    status: 'todo',
  },
  {
    id: 'asg-mgmt-1',
    subjectId: 'management',
    subjectName: 'Management',
    teacher: 'Dr. Sara Ahmed',
    title: 'Case Study: Modern Leadership in Tech Startups',
    questionPreview: 'Analyze the leadership transition at an AI enterprise and evaluate their decision-making framework.',
    fullInstructions: `Read the assigned case study on agile leadership in fast-growing tech organizations.
Answer the following three analytical questions:
1. Identify the primary leadership style utilized by the founder and compare it with situational leadership.
2. What organizational resistance emerged during restructuring, and how could Lewin's Change Model have mitigated it?
3. Provide three actionable recommendations for improving cross-departmental collaboration.

Maximum length: 1,500 words. APA citation format required.`,
    dueDate: 'Oct 25, 2026',
    dueTime: '05:00 PM',
    totalMarks: 15,
    attachmentName: 'Tech_Leadership_Case_Study.pdf',
    attachmentSize: '1.2 MB',
    status: 'todo',
  },
  {
    id: 'asg-math-1',
    subjectId: 'maths',
    subjectName: 'Maths',
    teacher: 'Dr. Imran',
    title: 'Calculus Problem Set 03: Integration Techniques',
    questionPreview: 'Solve Problems 1 to 12 from Chapter 7 involving trigonometric substitutions and partial fractions.',
    fullInstructions: `Solve each problem showing all intermediate algebraic steps clearly.
Topics evaluated:
- Integration by parts with recurring terms
- Rational functions solved via partial fraction decomposition
- Definite integrals with symmetry exploitation.`,
    dueDate: 'Oct 19, 2026',
    dueTime: '11:59 PM',
    totalMarks: 25,
    status: 'graded',
    submissionDate: 'Oct 18, 2026 at 09:40 PM',
    submittedFileName: 'Hasnain_23SW1234_Math_Set03.pdf',
    submittedContent: 'All 12 problems solved with detailed handwriting scans uploaded in PDF format.',
    grade: '23 / 25',
    teacherFeedback: 'Excellent work Hasnain! Minor sign error on Problem 8, but solid demonstration of techniques.',
  },
  {
    id: 'asg-phy-1',
    subjectId: 'physics',
    subjectName: 'Physics',
    teacher: 'Dr. Farhan',
    title: 'Electromagnetic Induction Lab Report',
    questionPreview: 'Formal lab report documenting Lenz Law experiments and coil voltage measurements.',
    fullInstructions: `Prepare a standardized IEEE-format lab report covering our oscilloscope measurements of induced EMF across varying solenoid turns.
Include graph plots, tabulated percent error calculations, and error analysis.`,
    dueDate: 'Oct 15, 2026',
    dueTime: '11:59 PM',
    totalMarks: 10,
    status: 'submitted',
    submissionDate: 'Oct 15, 2026 at 04:30 PM',
    submittedFileName: 'Faraday_Law_Report_Hasnain.pdf',
    submittedContent: 'Formal laboratory report including calibrated oscilloscope waveform graphs and error discussion.',
  },
  {
    id: 'asg-eng-1',
    subjectId: 'english',
    subjectName: 'English',
    teacher: 'Ms. Ayesha',
    title: 'Essay: Ethics in Artificial Intelligence & Software Engineering',
    questionPreview: 'Write a persuasive essay addressing algorithmic bias and software accountability in modern systems.',
    fullInstructions: `Compose a 1,000-word formal essay addressing the moral responsibilities of software engineers when building automated decision-making software. Include at least 3 peer-reviewed citations.`,
    dueDate: 'Oct 10, 2026',
    dueTime: '05:00 PM',
    totalMarks: 15,
    status: 'overdue',
  },
];

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New document uploaded',
    subject: 'Physics',
    category: 'Uploads',
    message: 'Dr. Farhan uploaded "Chapter 4 Notes & Wave Guides".',
    timestamp: '10 minutes ago',
    read: false,
    actionTarget: {
      tab: 'classes',
      subjectId: 'physics',
      documentId: 'doc-phy-1',
    },
  },
  {
    id: 'notif-2',
    title: 'Class reminder: PF Theory',
    subject: 'PF Theory',
    category: 'Schedule',
    message: 'PF Theory class starts at 10:30 AM in Block B - Room 12.',
    timestamp: '1 hour ago',
    read: false,
    actionTarget: {
      tab: 'schedule',
    },
  },
  {
    id: 'notif-3',
    title: 'Assignment posted: Case Study',
    subject: 'Management',
    category: 'Assignments',
    message: 'Dr. Sara Ahmed published "Modern Leadership in Tech Startups". Due Oct 25.',
    timestamp: '3 hours ago',
    read: false,
    actionTarget: {
      tab: 'assignments',
      assignmentId: 'asg-mgmt-1',
    },
  },
  {
    id: 'notif-4',
    title: 'Schedule change notice',
    subject: 'English',
    category: 'Schedule',
    message: 'English class on Thursday has been rescheduled to 11:30 AM.',
    timestamp: 'Yesterday',
    read: true,
    actionTarget: {
      tab: 'schedule',
    },
  },
  {
    id: 'notif-5',
    title: 'New document uploaded',
    subject: 'Maths',
    category: 'Uploads',
    message: 'Dr. Imran uploaded "Integration Techniques & Formula Sheet".',
    timestamp: '2 days ago',
    read: true,
    actionTarget: {
      tab: 'classes',
      subjectId: 'maths',
      documentId: 'doc-math-1',
    },
  },
  {
    id: 'notif-6',
    title: 'Important Exam Notice',
    category: 'Notices',
    message: 'Mid-Semester Examinations schedule released by Controller of Examinations.',
    timestamp: '3 days ago',
    read: true,
    actionTarget: {
      tab: 'home',
    },
  },
];

export const NOTICES: NoticeItem[] = [
  {
    id: 'notice-1',
    title: 'Fall 2026 Mid-Semester Examination Schedule',
    department: 'Controller of Examinations',
    date: 'Oct 16, 2026',
    urgent: true,
    content: 'All undergraduate students of Abdul Wali Khan University Mardan are informed that Mid-Semester Examinations for Fall 2026 will commence on November 10, 2026. Admit slips will be downloadable from ClassHub starting Nov 1.',
  },
  {
    id: 'notice-2',
    title: 'Library Hours Extended for Research & Midterm Prep',
    department: 'Central Central Library AWKUM',
    date: 'Oct 14, 2026',
    urgent: false,
    content: 'The Central Library reading halls will remain open until 10:00 PM on weekdays with high-speed internet and power backup available for all registered students.',
  },
  {
    id: 'notice-3',
    title: 'Annual Sports Gala 2026 Registration Open',
    department: 'Directorate of Sports',
    date: 'Oct 11, 2026',
    urgent: false,
    content: 'Registrations are invited for Cricket, Football, Table Tennis, and Badminton tournaments. Submit team rosters to your respective department coordinator.',
  },
];
