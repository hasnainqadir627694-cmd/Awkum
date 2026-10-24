import { db } from './firebase';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { AssignmentItem, DocumentItem, NoticeItem } from '../data/portalData';
import { uploadToCloudinary, fileToDataUrl } from './cloudinary';

export interface TeacherSubmissionItem {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedContent?: string;
  submittedFileName?: string;
  fileUrl?: string;
  timestamp?: string;
  submittedAt?: string;
  grade?: number | string;
  maxMarks?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  status: 'submitted' | 'graded' | 'pending';
}

/**
 * Subscribes to real-time assignments for an assigned subject
 */
export function subscribeToTeacherAssignments(
  subjectIdentifier: string | { id?: string; name?: string },
  onUpdate: (assignments: AssignmentItem[]) => void
): () => void {
  const targetId = typeof subjectIdentifier === 'object' ? (subjectIdentifier.id || '') : (subjectIdentifier || '');
  const targetName = typeof subjectIdentifier === 'object' ? (subjectIdentifier.name || '') : '';
  const isAll = targetId === 'all';

  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const asgCol = collection(db, 'assignments');
    const unsubscribe = onSnapshot(
      asgCol,
      (snapshot) => {
        const list: AssignmentItem[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            const sId = (data.subjectId || '').trim().toLowerCase();
            const sSubj = (data.subject || '').trim().toLowerCase();
            const sName = (data.subjectName || '').trim().toLowerCase();
            const tId = targetId.trim().toLowerCase();
            const tName = targetName.trim().toLowerCase();

            const matches =
              isAll ||
              (tId && (sId === tId || sSubj === tId || sName === tId)) ||
              (tName && (sId === tName || sSubj === tName || sName === tName || sName.includes(tName) || tName.includes(sName)));

            if (matches) {
              list.push({
                id: d.id,
                title: data.title || 'Subject Assignment',
                subjectName: data.subjectName || data.subject || targetName || targetId || 'Subject Assignment',
                subjectId: data.subjectId || targetId || 's-assigned',
                teacher: data.authorName || data.teacher || 'Subject Instructor',
                questionPreview: data.description || data.questionPreview || 'Course assignment',
                fullInstructions: data.description || data.fullInstructions || '',
                dueDate: data.dueDate || 'No Due Date',
                dueTime: data.dueTime || '11:59 PM',
                status: data.status || 'active',
                submittedCount: data.submittedCount || 0,
                totalStudents: data.totalStudents || 45,
                description: data.description || '',
                totalMarks: data.totalMarks || 10,
                allowLate: !!data.allowLate,
                attachedFileName: data.attachedFileName || undefined,
                attachedFileUrl: data.attachedFileUrl || undefined,
                createdDate: data.createdDate || 'Recent',
              });
            }
          }
        });
        onUpdate(list);
      },
      (error) => {
        console.info('[Teacher Service] Assignments listener notice:', error.message);
        onUpdate([]);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.info('[Teacher Service] Assignments subscription notice:', err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Subscribes to student submissions for a specific assignment
 */
export function subscribeToAssignmentSubmissions(
  assignmentId: string,
  onUpdate: (submissions: TeacherSubmissionItem[]) => void
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const subCol = collection(db, 'submissions');
    const unsubscribe = onSnapshot(
      subCol,
      (snapshot) => {
        const list: TeacherSubmissionItem[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            if (data.assignmentId === assignmentId || assignmentId === 'all') {
              list.push({
                id: d.id,
                assignmentId: data.assignmentId,
                studentId: data.studentId || 'st-unknown',
                studentName: data.studentName || 'Enrolled Student',
                submittedContent: data.submittedContent || data.submittedText || '',
                submittedFileName: data.submittedFileName || data.fileName || '',
                fileUrl: data.fileUrl || undefined,
                timestamp: data.timestamp?.toDate
                  ? data.timestamp.toDate().toLocaleString()
                  : data.submittedAt || 'Recent',
                submittedAt: data.submittedAt || 'Recently',
                grade: data.grade !== undefined ? data.grade : undefined,
                maxMarks: data.maxMarks || 10,
                feedback: data.feedback || '',
                gradedAt: data.gradedAt || undefined,
                gradedBy: data.gradedBy || undefined,
                status: data.grade !== undefined ? 'graded' : 'submitted',
              });
            }
          }
        });
        onUpdate(list);
      },
      (error) => {
        console.info('[Teacher Service] Submissions listener notice:', error.message);
        onUpdate([]);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.info('[Teacher Service] Submissions subscription notice:', err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Creates and publishes a new student assignment to Cloud Firestore
 */
export async function createTeacherAssignment(payload: {
  subjectId: string;
  subjectName: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  allowLate: boolean;
  attachedFile?: File | null;
  teacherEmail: string;
  teacherName: string;
  targetClass?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  let attachedFileUrl = '';
  let attachedFileName = '';

  if (payload.attachedFile) {
    attachedFileName = payload.attachedFile.name;
    try {
      const uploadRes = await uploadToCloudinary(payload.attachedFile, 'awkum_classhub/assignments');
      attachedFileUrl = uploadRes.secureUrl || uploadRes.url;
    } catch (e) {
      console.info('[Teacher Service] File upload notice:', e);
      try {
        attachedFileUrl = await fileToDataUrl(payload.attachedFile);
      } catch (err) {}
    }
  }

  const createdDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const assignmentDoc = {
    subjectId: payload.subjectId,
    subjectName: payload.subjectName,
    subject: payload.subjectName,
    title: payload.title.trim(),
    description: payload.description.trim(),
    dueDate: payload.dueDate,
    totalMarks: Number(payload.totalMarks) || 10,
    allowLate: payload.allowLate,
    attachedFileName,
    attachedFileUrl,
    createdDate,
    status: 'active',
    authorEmail: payload.teacherEmail,
    authorName: payload.teacherName,
    targetClass: payload.targetClass || 'BSSE 1A',
    submittedCount: 0,
    timestamp: serverTimestamp(),
  };

  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'assignments'), assignmentDoc);
      return { success: true, id: docRef.id };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save assignment to database.' };
    }
  }

  return { success: true, id: `asg-${Date.now()}` };
}

/**
 * Subscribes to submissions for a specific student across all assignments
 * Allows students to see their own submission statuses, grades, and teacher feedback in real time
 */
export function subscribeToStudentSubmissions(
  studentIdentifier: string,
  onUpdate: (submissions: TeacherSubmissionItem[]) => void
): () => void {
  if (!db || !studentIdentifier) {
    onUpdate([]);
    return () => {};
  }

  const cleanId = studentIdentifier.trim().toLowerCase();

  try {
    const subCol = collection(db, 'submissions');
    const unsubscribe = onSnapshot(
      subCol,
      (snapshot) => {
        const list: TeacherSubmissionItem[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            const matchesStudent =
              (data.studentId && data.studentId.toLowerCase() === cleanId) ||
              (data.studentEmail && data.studentEmail.toLowerCase() === cleanId) ||
              (data.uid && data.uid === studentIdentifier);

            if (matchesStudent) {
              list.push({
                id: d.id,
                assignmentId: data.assignmentId,
                studentId: data.studentId || studentIdentifier,
                studentName: data.studentName || 'Student',
                submittedContent: data.submittedContent || data.submittedText || '',
                submittedFileName: data.submittedFileName || data.fileName || '',
                fileUrl: data.fileUrl || undefined,
                timestamp: data.timestamp?.toDate
                  ? data.timestamp.toDate().toLocaleString()
                  : data.submittedAt || 'Recent',
                submittedAt: data.submittedAt || 'Recently',
                grade: data.grade !== undefined ? data.grade : undefined,
                maxMarks: data.maxMarks || 10,
                feedback: data.feedback || '',
                gradedAt: data.gradedAt || undefined,
                gradedBy: data.gradedBy || undefined,
                status: data.grade !== undefined ? 'graded' : 'submitted',
              });
            }
          }
        });
        onUpdate(list);
      },
      (error) => {
        console.info('[Teacher Service] Student submissions subscription notice:', error.message);
        onUpdate([]);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.info('[Teacher Service] Student submissions subscription error:', err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Saves or updates student grade and feedback for a submission
 */
export async function saveStudentGrade(payload: {
  submissionId: string;
  assignmentId: string;
  grade: number | string;
  maxMarks: number;
  feedback: string;
  teacherEmail: string;
  teacherName: string;
}): Promise<{ success: boolean; error?: string }> {
  if (db && payload.submissionId) {
    try {
      const subDocRef = doc(db, 'submissions', payload.submissionId);
      await setDoc(
        subDocRef,
        {
          assignmentId: payload.assignmentId,
          grade: Number(payload.grade),
          maxMarks: Number(payload.maxMarks),
          feedback: payload.feedback,
          gradedAt: new Date().toISOString(),
          gradedBy: payload.teacherName,
          status: 'graded',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return { success: true };
    } catch (err: any) {
      console.info('[Teacher Service] Save grade notice:', err);
      return { success: false, error: err?.message || 'Failed to save grade.' };
    }
  }

  return { success: true };
}

/**
 * Uploads a document to subject document library
 */
export async function uploadTeacherDocument(payload: {
  subjectId: string;
  subjectName: string;
  title: string;
  category: 'Lectures' | 'Lab Work' | 'Others' | string;
  file: File;
  teacherEmail: string;
  teacherName: string;
  targetClass?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  let fileUrl = '';
  try {
    const uploadRes = await uploadToCloudinary(payload.file, 'awkum_classhub/documents');
    fileUrl = uploadRes.secureUrl || uploadRes.url;
  } catch (e) {
    console.info('[Teacher Service] File upload notice:', e);
    try {
      fileUrl = await fileToDataUrl(payload.file);
    } catch (err) {}
  }

  const ext = payload.file.name.split('.').pop()?.toLowerCase() || '';
  const fileType = ['pdf', 'ppt', 'pptx', 'doc', 'docx'].includes(ext)
    ? ext.startsWith('ppt')
      ? 'ppt'
      : ext.startsWith('pdf')
      ? 'pdf'
      : 'doc'
    : 'pdf';

  const sizeKb = Math.round(payload.file.size / 1024);
  const fileSize = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

  const uploadDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const docData = {
    subjectId: payload.subjectId,
    subjectName: payload.subjectName,
    subject: payload.subjectName,
    title: payload.title.trim(),
    category: payload.category,
    fileName: payload.file.name,
    fileUrl,
    fileType,
    fileSize,
    uploadDate,
    uploadedBy: payload.teacherName,
    teacherEmail: payload.teacherEmail,
    targetClass: payload.targetClass || undefined,
    timestamp: serverTimestamp(),
  };

  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'documents'), docData);
      return { success: true, id: docRef.id };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to persist document to Firestore.' };
    }
  }

  return { success: true, id: `doc-${Date.now()}` };
}

/**
 * Publishes an official announcement for an assigned subject
 */
export async function createTeacherNotice(payload: {
  subjectId: string;
  subjectName: string;
  title: string;
  content: string;
  urgent: boolean;
  teacherEmail: string;
  teacherName: string;
  targetClass?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const noticeData = {
    subjectId: payload.subjectId,
    subjectName: payload.subjectName,
    title: payload.title.trim(),
    message: payload.content.trim(),
    content: payload.content.trim(),
    urgent: payload.urgent,
    department: 'Department of Computer Science / SE',
    targetClass: payload.targetClass || undefined,
    date: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    postedBy: payload.teacherName,
    authorEmail: payload.teacherEmail,
    timestamp: serverTimestamp(),
  };

  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'announcements'), noticeData);
      return { success: true, id: docRef.id };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save notice to Firestore.' };
    }
  }

  return { success: true, id: `notice-${Date.now()}` };
}

/**
 * Subscribes to real-time documents for an assigned subject
 */
export function subscribeToTeacherDocuments(
  subjectIdentifier: string | { id?: string; name?: string },
  onUpdate: (documents: DocumentItem[]) => void
): () => void {
  const targetId = typeof subjectIdentifier === 'object' ? (subjectIdentifier.id || '') : (subjectIdentifier || '');
  const targetName = typeof subjectIdentifier === 'object' ? (subjectIdentifier.name || '') : '';
  const isAll = targetId === 'all';

  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const docCol = collection(db, 'documents');
    const unsubscribe = onSnapshot(
      docCol,
      (snapshot) => {
        const list: DocumentItem[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            const sId = (data.subjectId || '').trim().toLowerCase();
            const sSubj = (data.subject || '').trim().toLowerCase();
            const sName = (data.subjectName || '').trim().toLowerCase();
            const tId = targetId.trim().toLowerCase();
            const tName = targetName.trim().toLowerCase();

            const matches =
              isAll ||
              (tId && (sId === tId || sSubj === tId || sName === tId)) ||
              (tName && (sId === tName || sSubj === tName || sName === tName || sName.includes(tName) || tName.includes(sName)));

            if (matches) {
              list.push({
                id: d.id,
                subjectId: data.subjectId || targetId,
                subjectName: data.subjectName || data.subject || targetName || 'Course Document',
                title: data.title || 'Course Document',
                category: data.category || 'Lectures',
                fileType: data.fileType || 'pdf',
                fileSize: data.fileSize || '1.0 MB',
                uploadDate: data.uploadDate || 'Recent',
                uploader: data.uploadedBy || data.uploader || 'Subject Faculty',
                uploadedBy: data.uploadedBy || data.uploader || 'Subject Faculty',
                fileName: data.fileName || data.title,
                fileUrl: data.fileUrl || undefined,
                description: data.description || '',
                previewSnippet: Array.isArray(data.previewSnippet) ? data.previewSnippet : [],
              });
            }
          }
        });
        onUpdate(list);
      },
      (error) => {
        console.info('[Teacher Service] Documents listener notice:', error.message);
        onUpdate([]);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.info('[Teacher Service] Documents subscription notice:', err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Subscribes to real-time announcements for an assigned subject
 */
export function subscribeToTeacherNotices(
  subjectIdentifier: string | { id?: string; name?: string },
  onUpdate: (notices: NoticeItem[]) => void
): () => void {
  const targetId = typeof subjectIdentifier === 'object' ? (subjectIdentifier.id || '') : (subjectIdentifier || '');
  const targetName = typeof subjectIdentifier === 'object' ? (subjectIdentifier.name || '') : '';
  const isAll = targetId === 'all';

  if (!db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const notCol = collection(db, 'announcements');
    const unsubscribe = onSnapshot(
      notCol,
      (snapshot) => {
        const list: NoticeItem[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            const sId = (data.subjectId || '').trim().toLowerCase();
            const sSubj = (data.subject || '').trim().toLowerCase();
            const sName = (data.subjectName || '').trim().toLowerCase();
            const tId = targetId.trim().toLowerCase();
            const tName = targetName.trim().toLowerCase();

            const matches =
              isAll ||
              (tId && (sId === tId || sSubj === tId || sName === tId)) ||
              (tName && (sId === tName || sSubj === tName || sName === tName || sName.includes(tName) || tName.includes(sName)));

            if (matches) {
              list.push({
                id: d.id,
                title: data.title || 'Subject Announcement',
                subjectId: data.subjectId || targetId,
                subjectName: data.subjectName || targetName || 'Subject Announcement',
                department: data.department || 'Department of Computer Science',
                date: data.date || 'Recent',
                urgent: !!data.urgent,
                content: data.content || data.message || '',
                postedBy: data.postedBy || 'Subject Instructor',
              });
            }
          }
        });
        onUpdate(list);
      },
      (error) => {
        console.info('[Teacher Service] Notices listener notice:', error.message);
        onUpdate([]);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.info('[Teacher Service] Notices subscription notice:', err);
    onUpdate([]);
    return () => {};
  }
}
