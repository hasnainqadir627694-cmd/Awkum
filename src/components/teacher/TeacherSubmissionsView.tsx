import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Download,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
  Save,
} from 'lucide-react';
import { AssignmentItem } from '../../data/portalData';
import { SubjectConfig, AdminUser } from '../../data/adminData';
import {
  TeacherSubmissionItem,
  subscribeToAssignmentSubmissions,
  saveStudentGrade,
} from '../../lib/teacherService';
import { ClassStudentItem } from '../../data/classRosterData';

interface TeacherSubmissionsViewProps {
  selectedSubject: SubjectConfig;
  assignment: AssignmentItem;
  teacher: AdminUser;
  roster: ClassStudentItem[];
  onBackToAssignments: () => void;
}

export const TeacherSubmissionsView: React.FC<TeacherSubmissionsViewProps> = ({
  selectedSubject,
  assignment,
  teacher,
  roster,
  onBackToAssignments,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Submitted' | 'Pending'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [submissions, setSubmissions] = useState<TeacherSubmissionItem[]>([]);

  // Selected Submission Modal state for Review & Grading
  const [gradingSubmission, setGradingSubmission] = useState<{
    sub: TeacherSubmissionItem;
    student: ClassStudentItem | null;
  } | null>(null);

  const [inputGrade, setInputGrade] = useState<string>('');
  const [inputFeedback, setInputFeedback] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeSuccess, setGradeSuccess] = useState('');
  const [gradeError, setGradeError] = useState('');

  // Subscribe to submissions for this assignment
  useEffect(() => {
    const unsubscribe = subscribeToAssignmentSubmissions(assignment.id, (subs) => {
      setSubmissions(subs);
    });
    return () => unsubscribe();
  }, [assignment.id]);

  // Combine enrolled roster with real submitted records
  const fullRosterStatus = roster.map((st) => {
    const matchedSub = submissions.find(
      (s) =>
        s.studentId === st.id ||
        (s.studentName && s.studentName.toLowerCase() === st.name.toLowerCase())
    );
    return {
      student: st,
      submission: matchedSub || null,
      isSubmitted: Boolean(matchedSub),
      isGraded: Boolean(matchedSub && matchedSub.grade !== undefined),
    };
  });

  const filteredItems = fullRosterStatus.filter((item) => {
    if (activeTab === 'Submitted' && !item.isSubmitted) return false;
    if (activeTab === 'Pending' && item.isSubmitted) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.student.name.toLowerCase().includes(q) ||
        item.student.rollNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenGrading = (sub: TeacherSubmissionItem | null, student: ClassStudentItem) => {
    const effectiveSub: TeacherSubmissionItem = sub || {
      id: `sub-temp-${student.id}`,
      assignmentId: assignment.id,
      studentId: student.id,
      studentName: student.name,
      status: 'pending',
    };

    setGradingSubmission({ sub: effectiveSub, student });
    setInputGrade(effectiveSub.grade !== undefined ? String(effectiveSub.grade) : '');
    setInputFeedback(effectiveSub.feedback || '');
    setGradeError('');
    setGradeSuccess('');
  };

  const handleSaveGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    setGradeError('');
    setGradeSuccess('');

    const maxMarks = assignment.totalMarks || 10;
    const numGrade = Number(inputGrade);

    if (isNaN(numGrade) || numGrade < 0 || numGrade > maxMarks) {
      setGradeError(`Please enter a valid mark between 0 and ${maxMarks}.`);
      return;
    }

    setIsSavingGrade(true);

    try {
      const res = await saveStudentGrade({
        submissionId: gradingSubmission.sub.id,
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

      setGradeSuccess(`Grade (${numGrade}/${maxMarks}) saved persistently for ${gradingSubmission.student?.name || 'student'}!`);
      setTimeout(() => {
        setGradingSubmission(null);
        setGradeSuccess('');
      }, 1500);
    } catch (err: any) {
      setIsSavingGrade(false);
      setGradeError(err?.message || 'Error occurred while saving grade.');
    }
  };

  const submittedCount = fullRosterStatus.filter((i) => i.isSubmitted).length;
  const pendingCount = fullRosterStatus.filter((i) => !i.isSubmitted).length;

  return (
    <div className="space-y-4">
      {/* 1. Header & Assignment Details */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-3">
        <button
          onClick={onBackToAssignments}
          className="text-xs font-bold text-[#493222] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignments List</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#E6D8C7] pt-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#806A56]">
              Submissions Review · {selectedSubject.name}
            </span>
            <h1 className="text-lg font-bold text-[#38271C]">{assignment.title}</h1>
            <p className="text-xs text-[#806A56] mt-0.5">
              Due Date: {assignment.dueDate} · Total Marks: {assignment.totalMarks || 10}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#EAF2E9] text-[#668064] text-xs font-bold rounded-full border border-[#C5DEC3]">
              {submittedCount} Submitted
            </span>
            <span className="px-3 py-1 bg-[#FDE8E4] text-[#C84B31] text-xs font-bold rounded-full border border-[#F5C2B8]">
              {pendingCount} Pending
            </span>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'All'
                  ? 'bg-[#493222] text-[#FFF9F1]'
                  : 'bg-white text-[#806A56] border border-[#E6D8C7]'
              }`}
            >
              All ({fullRosterStatus.length})
            </button>
            <button
              onClick={() => setActiveTab('Submitted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'Submitted'
                  ? 'bg-[#493222] text-[#FFF9F1]'
                  : 'bg-white text-[#806A56] border border-[#E6D8C7]'
              }`}
            >
              Submitted ({submittedCount})
            </button>
            <button
              onClick={() => setActiveTab('Pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'Pending'
                  ? 'bg-[#493222] text-[#FFF9F1]'
                  : 'bg-white text-[#806A56] border border-[#E6D8C7]'
              }`}
            >
              Pending ({pendingCount})
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#806A56] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name or roll number..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
            />
          </div>
        </div>
      </div>

      {/* 2. Submissions List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl text-center space-y-2">
          <FileText className="w-10 h-10 text-[#806A56] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-[#38271C]">No Submissions Matching Filter</h3>
          <p className="text-xs text-[#806A56]">
            No enrolled student match the current search or tab selection.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map(({ student, submission, isSubmitted, isGraded }) => (
            <div
              key={student.id}
              className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] hover:border-[#D8C7B4] rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#EFE3D3] text-[#493222] font-bold text-xs flex items-center justify-center shrink-0 border border-[#D8C7B4]">
                  {student.name.charAt(0)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-xs sm:text-sm text-[#38271C] truncate">
                      {student.name}
                    </h3>
                    <span className="px-2 py-0.2 bg-[#EFE3D3] text-[#493222] font-mono text-[10px] font-bold rounded">
                      {student.rollNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#806A56] mt-0.5 flex-wrap">
                    {isSubmitted ? (
                      <span className="text-[#668064] font-semibold">
                        Submitted · {submission?.timestamp || 'Recent'}
                      </span>
                    ) : (
                      <span className="text-[#C84B31] font-semibold">
                        Awaiting Student Submission
                      </span>
                    )}
                    {isGraded && submission?.grade !== undefined && (
                      <span className="px-2 py-0.2 bg-[#493222] text-[#FFF9F1] font-bold rounded text-[10px]">
                        Grade: {submission.grade}/{assignment.totalMarks || 10}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenGrading(submission, student)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSubmitted
                    ? 'bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1]'
                    : 'bg-white border border-[#D8C7B4] text-[#806A56] hover:text-[#38271C]'
                }`}
              >
                {isGraded ? 'Update Grade' : isSubmitted ? 'Review & Grade' : 'View Detail'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Review & Grading Modal (Screen 8 in Reference) */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6D8C7] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#38271C]">
                  Review & Grade Submission
                </h3>
                <span className="text-xs text-[#806A56]">
                  {gradingSubmission.student?.name} ({gradingSubmission.student?.rollNumber})
                </span>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1 text-[#806A56] hover:text-[#38271C] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gradeError && (
              <div className="p-3 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{gradeError}</span>
              </div>
            )}

            {gradeSuccess && (
              <div className="p-3 bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064] text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{gradeSuccess}</span>
              </div>
            )}

            {/* Submitted Answer / File Card */}
            <div className="p-4 bg-white border border-[#E6D8C7] rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
                Submitted Student Work
              </span>

              {gradingSubmission.sub.submittedContent ? (
                <div className="p-3 bg-[#F8F0E5] rounded-xl text-xs text-[#38271C] leading-relaxed whitespace-pre-wrap border border-[#E6D8C7]">
                  {gradingSubmission.sub.submittedContent}
                </div>
              ) : (
                <p className="text-xs text-[#806A56] italic">
                  No text response entered.
                </p>
              )}

              {gradingSubmission.sub.fileUrl && (
                <a
                  href={gradingSubmission.sub.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 p-2.5 bg-[#EFE3D3] hover:bg-[#E6D8C7] rounded-xl text-xs font-bold text-[#493222] flex items-center justify-between transition-colors"
                >
                  <span>
                    Attachment: {gradingSubmission.sub.submittedFileName || 'Student_Work_File'}
                  </span>
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Grading Form */}
            <form onSubmit={handleSaveGradeSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Marks Obtained (out of {assignment.totalMarks || 10})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0"
                    max={assignment.totalMarks || 10}
                    value={inputGrade}
                    onChange={(e) => setInputGrade(e.target.value)}
                    placeholder="Enter marks e.g. 8"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-sm font-bold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                  <span className="text-xs font-bold text-[#806A56]">
                    / {assignment.totalMarks || 10}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Teacher Feedback / Remarks
                </label>
                <textarea
                  rows={3}
                  value={inputFeedback}
                  onChange={(e) => setInputFeedback(e.target.value)}
                  placeholder="Provide constructive feedback for student..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGrade}
                  className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingGrade ? 'Saving Grade...' : 'Save Grade'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
