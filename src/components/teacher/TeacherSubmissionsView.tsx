import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Download,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
  Save,
  Clock,
  Award,
  ExternalLink,
  MessageSquare,
  FileCheck,
  Calendar,
  Eye,
  UserX,
  Users,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { AssignmentItem } from '../../data/portalData';
import { SubjectConfig, AdminUser } from '../../data/adminData';
import {
  TeacherSubmissionItem,
  subscribeToAssignmentSubmissions,
  saveStudentGrade,
} from '../../lib/teacherService';
import { ClassStudentItem, BASE_CLASS_ROSTERS } from '../../data/classRosterData';
import {
  generateAssignmentReportPDF,
  downloadAssignmentReportPDF,
} from '../../lib/pdfReportService';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface TeacherSubmissionsViewProps {
  selectedSubject: SubjectConfig;
  assignment: AssignmentItem;
  teacher: AdminUser;
  roster?: ClassStudentItem[];
  onBackToAssignments: () => void;
}

export const TeacherSubmissionsView: React.FC<TeacherSubmissionsViewProps> = ({
  selectedSubject,
  assignment,
  teacher,
  roster: initialRoster,
  onBackToAssignments,
}) => {
  type FilterTab = 'All' | 'Submitted' | 'Ungraded' | 'Graded' | 'NotSubmitted';

  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [submissions, setSubmissions] = useState<TeacherSubmissionItem[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<ClassStudentItem[]>(
    initialRoster && initialRoster.length > 0 ? initialRoster : []
  );
  const [isLoading, setIsLoading] = useState(true);

  // Selected Submission Modal state for Review & Grading
  const [gradingSubmission, setGradingSubmission] = useState<TeacherSubmissionItem | null>(null);
  const [inputGrade, setInputGrade] = useState<string>('');
  const [inputFeedback, setInputFeedback] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeSuccess, setGradeSuccess] = useState('');
  const [gradeError, setGradeError] = useState('');

  // PDF Preview Modal state
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // 1. Subscribe strictly to real submissions for this specific assignment
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToAssignmentSubmissions(assignment.id, (subs) => {
      // Sort newest submission first
      const sorted = [...subs].sort((a, b) => {
        const timeA = new Date(a.submittedAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.submittedAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      setSubmissions(sorted);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [assignment.id]);

  // 2. Fetch authoritative eligible roster for assignment targetClass
  useEffect(() => {
    const targetClass = assignment.targetClass || selectedSubject.assignedClass || 'BSSE 1A';
    const baseList = BASE_CLASS_ROSTERS[targetClass] || [];

    if (!db) {
      if (!initialRoster || initialRoster.length === 0) {
        setEligibleStudents(baseList);
      }
      return;
    }

    try {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        const studentMap = new Map<string, ClassStudentItem>();

        // Seed with authentic base roster if available
        baseList.forEach((st) => studentMap.set(st.rollNumber.toLowerCase(), st));

        snapshot.forEach((d) => {
          if (!d.exists()) return;
          const data = d.data();
          const userClass = (data.assignedClass || '').trim().toLowerCase();
          const role = (data.role || '').toLowerCase();
          const roles = Array.isArray(data.roles)
            ? data.roles.map((r: any) => String(r).toLowerCase())
            : [];
          const isStudent =
            role === 'student' || role === 'cr' || roles.includes('student') || roles.includes('cr');
          const isTeacher =
            role === 'teacher' || roles.includes('teacher') || data.teacherStatus === 'active';

          if (isStudent && !isTeacher) {
            const cleanTarget = targetClass.trim().toLowerCase();
            const matches =
              cleanTarget === 'all' ||
              !userClass ||
              userClass === cleanTarget ||
              cleanTarget.includes(userClass) ||
              userClass.includes(cleanTarget);

            if (matches) {
              const roll = data.studentId || data.rollNo || data.rollNumber || d.id;
              const name = data.name || data.fullName || 'Student';
              const email = data.email || '';
              studentMap.set(roll.toLowerCase(), {
                id: d.id,
                name: role === 'cr' || data.isCR ? `${name} (CR)` : name,
                rollNumber: roll,
                fatherName: data.fatherName || 'Not Recorded',
                email,
                class: targetClass,
                status: data.status === 'suspended' ? 'suspended' : 'active',
                avatarUrl: data.avatarUrl || undefined,
              });
            }
          }
        });

        const fullList = Array.from(studentMap.values()).sort((a, b) =>
          a.rollNumber.localeCompare(b.rollNumber)
        );
        setEligibleStudents(fullList);
      });

      return () => unsub();
    } catch (err) {
      console.info('[TeacherSubmissionsView] Roster load notice:', err);
    }
  }, [assignment.targetClass, selectedSubject.assignedClass, initialRoster]);

  // 3. Set of student roll numbers/emails that have submitted
  const submittedKeys = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      if (s.studentId) set.add(s.studentId.trim().toLowerCase());
      if (s.studentEmail) set.add(s.studentEmail.trim().toLowerCase());
    });
    return set;
  }, [submissions]);

  // 4. Eligible students who have NOT submitted
  const notSubmittedList = useMemo(() => {
    return eligibleStudents.filter((st) => {
      const matchRoll = submittedKeys.has(st.rollNumber.trim().toLowerCase());
      const matchEmail = st.email ? submittedKeys.has(st.email.trim().toLowerCase()) : false;
      return !matchRoll && !matchEmail;
    });
  }, [eligibleStudents, submittedKeys]);

  // 5. Computed authoritative metrics
  const totalEligible = eligibleStudents.length > 0 ? eligibleStudents.length : Math.max(submissions.length, 1);
  const totalSubmitted = submissions.length;
  const gradedList = submissions.filter(
    (s) => s.grade !== undefined && s.grade !== null && s.grade !== ''
  );
  const gradedCount = gradedList.length;
  const ungradedCount = totalSubmitted - gradedCount;
  const notSubmittedCount = Math.max(0, totalEligible - totalSubmitted);
  const lateCount = submissions.filter((s) => s.isLate).length;

  const maxMarks = assignment.totalMarks || 10;
  const avgScore =
    gradedCount > 0
      ? (gradedList.reduce((acc, s) => acc + (Number(s.grade) || 0), 0) / gradedCount).toFixed(1)
      : 'N/A';

  // 6. Deadline status check
  const nowEpoch = Date.now();
  let deadlineEpoch = 0;
  if (assignment.deadlineAt) {
    deadlineEpoch = new Date(assignment.deadlineAt).getTime();
  } else if (assignment.dueDate) {
    deadlineEpoch = new Date(`${assignment.dueDate}T23:59:59`).getTime();
  }

  const isPastDeadline = deadlineEpoch > 0 && nowEpoch > deadlineEpoch;
  const isClosed =
    assignment.status === 'closed' || (isPastDeadline && !assignment.allowLate);

  // Time remaining text
  const timeRemainingText = useMemo(() => {
    if (deadlineEpoch === 0) return 'No strict deadline';
    const diff = deadlineEpoch - nowEpoch;
    if (diff <= 0) return 'Deadline Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 1) return `${days} days remaining`;
    if (hours > 0) return `${hours} hours remaining`;
    const mins = Math.floor(diff / (1000 * 60));
    return `${mins} minutes remaining`;
  }, [deadlineEpoch, nowEpoch]);

  // 7. Filtering logic for cards
  const q = searchQuery.toLowerCase().trim();

  const filteredSubmitted = submissions.filter((sub) => {
    if (activeTab === 'Ungraded') {
      const isGraded = sub.grade !== undefined && sub.grade !== null && sub.grade !== '';
      if (isGraded) return false;
    }
    if (activeTab === 'Graded') {
      const isGraded = sub.grade !== undefined && sub.grade !== null && sub.grade !== '';
      if (!isGraded) return false;
    }
    if (activeTab === 'NotSubmitted') return false;

    if (q) {
      const matchName = (sub.studentName || '').toLowerCase().includes(q);
      const matchId = (sub.studentId || '').toLowerCase().includes(q);
      const matchEmail = (sub.studentEmail || '').toLowerCase().includes(q);
      const matchFile = (sub.submittedFileName || '').toLowerCase().includes(q);
      return matchName || matchId || matchEmail || matchFile;
    }
    return true;
  });

  const filteredNotSubmitted = (activeTab === 'All' || activeTab === 'NotSubmitted')
    ? notSubmittedList.filter((st) => {
        if (!q) return true;
        const matchName = st.name.toLowerCase().includes(q);
        const matchRoll = st.rollNumber.toLowerCase().includes(q);
        const matchEmail = st.email.toLowerCase().includes(q);
        return matchName || matchRoll || matchEmail;
      })
    : [];

  const handleOpenGrading = (sub: TeacherSubmissionItem) => {
    setGradingSubmission(sub);
    setInputGrade(sub.grade !== undefined && sub.grade !== null ? String(sub.grade) : '');
    setInputFeedback(sub.feedback || '');
    setGradeError('');
    setGradeSuccess('');
  };

  const handleSaveGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    setGradeError('');
    setGradeSuccess('');

    const numGrade = Number(inputGrade);

    if (isNaN(numGrade) || numGrade < 0 || numGrade > maxMarks) {
      setGradeError(`Please enter a valid mark between 0 and ${maxMarks}.`);
      return;
    }

    setIsSavingGrade(true);

    try {
      const res = await saveStudentGrade({
        submissionId: gradingSubmission.id,
        assignmentId: assignment.id,
        grade: numGrade,
        maxMarks,
        feedback: inputFeedback.trim(),
        teacherEmail: teacher.email,
        teacherName: teacher.name,
      });

      setIsSavingGrade(false);

      if (!res.success) {
        setGradeError(res.error || 'Failed to save grade.');
        return;
      }

      setGradeSuccess(
        `Grade (${numGrade}/${maxMarks}) saved successfully for ${gradingSubmission.studentName}!`
      );
      setTimeout(() => {
        setGradingSubmission(null);
      }, 1000);
    } catch (err: any) {
      setIsSavingGrade(false);
      setGradeError(err?.message || 'Error saving grade.');
    }
  };

  const handlePreviewPdfReport = () => {
    setIsGeneratingPdf(true);
    try {
      const res = generateAssignmentReportPDF({
        assignment,
        subject: selectedSubject,
        teacher,
        eligibleRoster: eligibleStudents,
        submissions,
      });
      setPdfDataUri(res.dataUri);
      setShowPdfPreview(true);
    } catch (err) {
      console.error('Failed to generate PDF preview:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportPdfReport = () => {
    downloadAssignmentReportPDF({
      assignment,
      subject: selectedSubject,
      teacher,
      eligibleRoster: eligibleStudents,
      submissions,
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Bar with Back navigation & Assignment Context */}
      <div className="p-5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToAssignments}
            className="px-3.5 py-1.5 bg-[#FFFDF9] border border-[#E6D8C7] hover:border-[#493222] text-[#493222] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assignments</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#806A56] bg-[#EFE3D3] px-3 py-1 rounded-xl">
              {selectedSubject.name} ({selectedSubject.code})
            </span>
            <span className="text-xs font-bold text-[#493222] bg-[#F8F0E5] border border-[#E6D8C7] px-3 py-1 rounded-xl">
              Class: {assignment.targetClass || selectedSubject.assignedClass || 'BSSE 1A'}
            </span>
            <button
              type="button"
              onClick={handlePreviewPdfReport}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 bg-[#FFFDF9] border border-[#E6D8C7] hover:border-[#493222] text-[#493222] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Report</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdfReport}
              className="px-3.5 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Export Official PDF</span>
            </button>
          </div>
        </div>

        {/* Title and metadata row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#806A56] block">
              Assignment Submission Queue & Evaluation
            </span>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#38271C]">
              {assignment.title}
            </h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-[#806A56] flex-wrap">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#493222]" />
                Due: {assignment.dueDate} {assignment.dueTime ? `(${assignment.dueTime})` : ''}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-[#493222]">
                <Award className="w-3.5 h-3.5 text-[#493222]" />
                Max Marks: {maxMarks} Points
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-[#806A56]" />
                <span className={isPastDeadline ? 'text-[#C84B31] font-bold' : 'text-[#668064] font-bold'}>
                  {timeRemainingText}
                </span>
              </span>
            </div>
          </div>

          {/* Submission status pill */}
          <div>
            {isClosed ? (
              <span className="px-3 py-1 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] text-xs font-bold rounded-xl inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C84B31]" />
                <span>Submissions Closed</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-[#EAF2E9] border border-[#C5DCC3] text-[#668064] text-xs font-bold rounded-xl inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#668064] animate-pulse" />
                <span>Active · Accepting Submissions</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Top Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-[#E6D8C7]">
          <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl text-center shadow-2xs">
            <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
              Total Eligible
            </span>
            <span className="text-base font-extrabold text-[#38271C] font-mono">
              {totalEligible}
            </span>
          </div>

          <div className="p-3 bg-[#EAF2E9] border border-[#C5DCC3] rounded-2xl text-center shadow-2xs">
            <span className="text-[10px] font-bold text-[#4A5B49] uppercase tracking-wider block">
              Submitted
            </span>
            <span className="text-base font-extrabold text-[#668064] font-mono">
              {totalSubmitted}
            </span>
          </div>

          <div className="p-3 bg-[#FFFDF9] border border-[#E6D8C7] rounded-2xl text-center shadow-2xs">
            <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
              Graded
            </span>
            <span className="text-base font-extrabold text-[#493222] font-mono">
              {gradedCount}
            </span>
          </div>

          <div className="p-3 bg-[#FFF9E6] border border-[#F5E2B8] rounded-2xl text-center shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Pending Review
            </span>
            <span className="text-base font-extrabold text-amber-900 font-mono">
              {ungradedCount}
            </span>
          </div>

          <div className="p-3 bg-[#FDE8E4] border border-[#F5C2B8] rounded-2xl text-center shadow-2xs">
            <span className="text-[10px] font-bold text-[#C84B31] uppercase tracking-wider block">
              Not Submitted
            </span>
            <span className="text-base font-extrabold text-[#C84B31] font-mono">
              {notSubmittedCount}
            </span>
          </div>

          <div className="p-3 bg-[#F8F0E5] border border-[#E6D8C7] rounded-2xl text-center shadow-2xs">
            <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
              Avg Marks
            </span>
            <span className="text-base font-extrabold text-[#493222] font-mono">
              {avgScore}
            </span>
          </div>
        </div>

        {/* 3. Filter Tabs & Search Bar */}
        <div className="pt-2 border-t border-[#E6D8C7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { key: 'All', label: 'All Students', count: totalEligible },
                { key: 'Submitted', label: 'Submitted', count: totalSubmitted },
                { key: 'Ungraded', label: 'Pending Review', count: ungradedCount },
                { key: 'Graded', label: 'Graded', count: gradedCount },
                { key: 'NotSubmitted', label: 'Not Submitted', count: notSubmittedCount },
              ] as const
            ).map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    active
                      ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
                      : 'bg-[#FFFDF9] border border-[#E6D8C7] text-[#806A56] hover:text-[#38271C]'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      active ? 'bg-amber-400 text-[#38271C]' : 'bg-[#EFE3D3] text-[#493222]'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, roll, file..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#FFFDF9] border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
            />
          </div>
        </div>
      </div>

      {/* 4. Submissions List View */}
      {isLoading ? (
        <div className="p-8 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl text-center text-xs text-[#806A56]">
          Loading authoritative assignment submissions...
        </div>
      ) : filteredSubmitted.length === 0 && filteredNotSubmitted.length === 0 ? (
        <div className="p-10 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EFE3D3] text-[#493222] flex items-center justify-center mx-auto shadow-2xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#38271C]">
              {searchQuery
                ? 'No Matching Students Found'
                : activeTab === 'Ungraded'
                ? 'No Pending Submissions to Grade'
                : activeTab === 'Graded'
                ? 'No Submissions Graded Yet'
                : activeTab === 'NotSubmitted'
                ? 'All Eligible Students Have Submitted'
                : 'No Submissions Received Yet'}
            </h3>
            <p className="text-xs text-[#806A56] max-w-md mx-auto mt-1 leading-relaxed">
              {searchQuery
                ? `No student records matching "${searchQuery}" were found.`
                : 'When students submit their solutions or responses for this assignment, their real records will appear here in real time for review and grading.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* SECTION A: SUBMITTED STUDENTS (Sorted newest submission first) */}
          {filteredSubmitted.map((sub) => {
            const isGraded = sub.grade !== undefined && sub.grade !== null && sub.grade !== '';

            return (
              <div
                key={sub.id}
                className="p-4.5 bg-[#FFF9F1] border border-[#E6D8C7] hover:border-[#D8C7B4] rounded-3xl shadow-2xs space-y-3 transition-colors"
              >
                {/* Student header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#493222] text-[#FFF9F1] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      {sub.studentName?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#38271C] flex items-center gap-2 flex-wrap">
                        <span>{sub.studentName}</span>
                        {sub.isLate && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                            Late Submission
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-md">
                          Submitted
                        </span>
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-[#806A56] mt-0.5 flex-wrap">
                        <span className="font-mono font-medium">{sub.studentId}</span>
                        {sub.studentEmail && (
                          <>
                            <span>•</span>
                            <span>{sub.studentEmail}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {sub.submittedAt || sub.timestamp || 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grade Pill */}
                  <div>
                    {isGraded ? (
                      <div className="text-right">
                        <span className="px-2.5 py-1 bg-[#EAF2E9] border border-[#C5DCC3] text-[#668064] text-xs font-extrabold rounded-xl inline-flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {sub.grade} / {maxMarks}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl inline-block">
                        Needs Grading
                      </span>
                    )}
                  </div>
                </div>

                {/* Submitted Content Preview */}
                {sub.submittedContent && (
                  <div className="p-3 bg-[#FFFDF9] border border-[#E6D8C7] rounded-2xl text-xs text-[#38271C] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#806A56] block">
                      Student Response / Notes:
                    </span>
                    <p className="leading-relaxed whitespace-pre-line">{sub.submittedContent}</p>
                  </div>
                )}

                {/* Submitted File Link */}
                {sub.submittedFileName && (
                  <div className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl flex items-center justify-between text-xs text-[#493222]">
                    <div className="flex items-center gap-2 font-semibold truncate">
                      <FileCheck className="w-4 h-4 text-[#668064] shrink-0" />
                      <span className="truncate">{sub.submittedFileName}</span>
                    </div>

                    {sub.fileUrl && (
                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Inspect Solution File</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Teacher Feedback Preview (if already graded) */}
                {sub.feedback && (
                  <div className="p-2.5 bg-[#F8F0E5] border border-[#E6D8C7] rounded-xl text-xs text-[#493222] flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-[#806A56] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-bold text-[11px] block">Your Feedback:</span>
                      <span className="text-[11px] text-[#806A56]">{sub.feedback}</span>
                    </div>
                  </div>
                )}

                {/* Bottom Action: Grade / Edit Grade */}
                <div className="flex items-center justify-end pt-2 border-t border-[#E6D8C7]">
                  <button
                    type="button"
                    onClick={() => handleOpenGrading(sub)}
                    className="px-3.5 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isGraded ? 'Update Grade & Feedback' : 'Evaluate & Enter Grade'}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* SECTION B: NOT SUBMITTED ELIGIBLE STUDENTS */}
          {filteredNotSubmitted.map((st) => (
            <div
              key={st.id || st.rollNumber}
              className="p-4 bg-white border border-[#E6D8C7] rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F8F0E5] border border-[#E6D8C7] text-[#806A56] flex items-center justify-center font-bold text-sm shrink-0">
                  {st.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#38271C] flex items-center gap-2">
                    <span>{st.name}</span>
                    <span className="px-2 py-0.5 bg-[#FDE8E4] text-[#C84B31] text-[10px] font-bold rounded-md">
                      Not Submitted
                    </span>
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[#806A56] mt-0.5">
                    <span className="font-mono font-medium">{st.rollNumber}</span>
                    {st.email && (
                      <>
                        <span>•</span>
                        <span>{st.email}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Enrolled in {st.class}</span>
                  </div>
                </div>
              </div>

              <div className="text-right self-end sm:self-auto">
                <span className="text-xs text-[#806A56] italic">
                  Awaiting student submission
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#38271C]">
                  Evaluate Student Submission
                </h3>
                <p className="text-xs text-[#806A56]">
                  {gradingSubmission.studentName} ({gradingSubmission.studentId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="p-1.5 text-[#806A56] hover:text-[#38271C] rounded-xl hover:bg-[#EFE3D3] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {gradeError && (
              <div className="p-3 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{gradeError}</span>
              </div>
            )}

            {gradeSuccess && (
              <div className="p-3 bg-[#EAF2E9] border border-[#C5DCC3] text-[#668064] text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{gradeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveGradeSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Marks Awarded (Out of {maxMarks}) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={maxMarks}
                    required
                    value={inputGrade}
                    onChange={(e) => setInputGrade(e.target.value)}
                    placeholder="e.g. 9"
                    className="w-32 px-3.5 py-2 bg-white border border-[#D8C7B4] rounded-xl text-sm font-bold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                  <span className="text-xs font-bold text-[#806A56]">
                    / {maxMarks} Total Marks
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Feedback & Comments for Student (Optional)
                </label>
                <textarea
                  rows={3}
                  value={inputFeedback}
                  onChange={(e) => setInputFeedback(e.target.value)}
                  placeholder="e.g. Excellent solution structure. Pay attention to edge conditions in boundary cases."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6D8C7]">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 text-xs font-bold text-[#806A56] hover:text-[#38271C] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGrade}
                  className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isSavingGrade ? 'Saving Grade...' : 'Save Grade & Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. PDF Report Preview Modal */}
      {showPdfPreview && pdfDataUri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#E6D8C7] bg-[#F8F0E5]">
              <div>
                <h3 className="text-base font-bold text-[#38271C]">
                  Official Assignment Evaluation PDF Report
                </h3>
                <p className="text-xs text-[#806A56]">
                  {assignment.title} · {selectedSubject.name} ({assignment.targetClass || 'BSSE 1A'})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPdfReport}
                  className="px-3.5 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(false)}
                  className="p-1.5 text-[#806A56] hover:text-[#38271C] rounded-xl hover:bg-[#EFE3D3] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-100 p-2">
              <iframe
                src={pdfDataUri}
                className="w-full h-full rounded-2xl border border-gray-300 bg-white"
                title="Assignment Report Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
