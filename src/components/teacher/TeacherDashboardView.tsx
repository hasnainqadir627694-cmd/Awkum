import { Plus, Upload, Bell, ChevronRight, FileText, CheckCircle2, Clock } from 'lucide-react';
import { AdminUser, SubjectConfig } from '../../data/adminData';
import { AssignmentItem, NoticeItem, DocumentItem } from '../../data/portalData';

interface TeacherDashboardViewProps {
  teacher: AdminUser;
  assignedSubjectsList: SubjectConfig[];
  selectedSubject: SubjectConfig;
  onSelectSubject: (subj: SubjectConfig) => void;
  assignments: AssignmentItem[];
  documents: DocumentItem[];
  notices: NoticeItem[];
  totalEnrolledStudents: number;
  onNavigateTab: (tab: 'dashboard' | 'students' | 'documents' | 'assignments' | 'notices' | 'profile') => void;
  onOpenCreateAssignment: () => void;
  onOpenUploadDocument: () => void;
  onOpenCreateNotice: () => void;
  onSelectAssignmentForSubmissions: (asg: AssignmentItem) => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  teacher,
  assignedSubjectsList,
  selectedSubject,
  onSelectSubject,
  assignments,
  documents,
  notices,
  totalEnrolledStudents,
  onNavigateTab,
  onOpenCreateAssignment,
  onOpenUploadDocument,
  onOpenCreateNotice,
  onSelectAssignmentForSubmissions,
}) => {
  const activeAssignments = assignments.filter((a) => a.status === 'active' || a.status === 'todo');
  const subjectDocsCount = documents.length;
  const subjectNoticesCount = notices.length;

  return (
    <div className="space-y-5">
      {/* 1. Header Greeting & Subject Selector Banner */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-[#806A56]">Welcome Back</span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">
              {teacher.name || 'Subject Teacher'}
            </h1>
            <p className="text-xs text-[#806A56] mt-0.5">
              {teacher.department || 'Department of Computer Science'} · AWKUM Mardan
            </p>
          </div>

          {/* Subject Switcher Pills if teacher manages multiple subjects */}
          {assignedSubjectsList.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {assignedSubjectsList.map((subj) => {
                const isSelected = selectedSubject.id === subj.id;
                return (
                  <button
                    key={subj.id}
                    onClick={() => onSelectSubject(subj)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
                        : 'bg-white text-[#806A56] border border-[#E6D8C7] hover:text-[#38271C]'
                    }`}
                  >
                    {subj.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Subject Banner Card (Matching Screen 2 in Reference) */}
        <div className="p-4 bg-[#493222] text-[#FFF9F1] rounded-2xl flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-mono font-bold text-lg shrink-0 border border-amber-400/30">
              {selectedSubject.code.slice(0, 2)}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 block">
                Active Subject Workspace
              </span>
              <h2 className="text-base sm:text-lg font-bold tracking-wide">
                {selectedSubject.name}
              </h2>
              <span className="text-xs text-[#E6D8C7] block">
                {selectedSubject.code} · BS Software Engineering / CS
              </span>
            </div>
          </div>

          <div className="text-right shrink-0 hidden sm:block">
            <span className="px-2.5 py-1 bg-amber-400/20 text-amber-300 text-xs font-bold rounded-lg border border-amber-400/30">
              {selectedSubject.creditHours} Credit Hours
            </span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid (Screen 2 in Reference) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Total Enrolled */}
        <div
          onClick={() => onNavigateTab('students')}
          className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-2xs hover:border-[#493222] transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-bold text-[#806A56] uppercase tracking-wider block">
            Total Students
          </span>
          <div className="text-2xl font-bold text-[#38271C] mt-1">
            {totalEnrolledStudents}
          </div>
          <span className="text-[10px] text-[#668064] font-medium block mt-1">
            Enrolled Roster
          </span>
        </div>

        {/* Metric 2: Active Assignments */}
        <div
          onClick={() => onNavigateTab('assignments')}
          className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-2xs hover:border-[#493222] transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-bold text-[#806A56] uppercase tracking-wider block">
            Assignments
          </span>
          <div className="text-2xl font-bold text-[#38271C] mt-1">
            {assignments.length}
          </div>
          <span className="text-[10px] text-[#668064] font-medium block mt-1">
            {activeAssignments.length} Active Work
          </span>
        </div>

        {/* Metric 3: Documents Library */}
        <div
          onClick={() => onNavigateTab('documents')}
          className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-2xs hover:border-[#493222] transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-bold text-[#806A56] uppercase tracking-wider block">
            Documents
          </span>
          <div className="text-2xl font-bold text-[#38271C] mt-1">
            {subjectDocsCount}
          </div>
          <span className="text-[10px] text-[#806A56] font-medium block mt-1">
            Uploaded Files
          </span>
        </div>

        {/* Metric 4: Notices */}
        <div
          onClick={() => onNavigateTab('notices')}
          className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-2xs hover:border-[#493222] transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-bold text-[#806A56] uppercase tracking-wider block">
            Notices
          </span>
          <div className="text-2xl font-bold text-[#38271C] mt-1">
            {subjectNoticesCount}
          </div>
          <span className="text-[10px] text-[#806A56] font-medium block mt-1">
            Announcements
          </span>
        </div>
      </div>

      {/* 3. Quick Action Buttons Bar */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={onOpenCreateAssignment}
          className="p-3 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>New Task</span>
        </button>

        <button
          onClick={onOpenUploadDocument}
          className="p-3 bg-[#FFF9F1] hover:bg-[#F8F0E5] border border-[#E6D8C7] text-[#38271C] rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Upload className="w-4 h-4 text-[#493222]" />
          <span>Upload File</span>
        </button>

        <button
          onClick={onOpenCreateNotice}
          className="p-3 bg-[#FFF9F1] hover:bg-[#F8F0E5] border border-[#E6D8C7] text-[#38271C] rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Bell className="w-4 h-4 text-[#493222]" />
          <span>Post Notice</span>
        </button>
      </div>

      {/* 4. Upcoming / Active Assignments Queue */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#493222]" />
            <h2 className="text-sm font-bold text-[#38271C]">
              Active Subject Assignments
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('assignments')}
            className="text-xs font-bold text-[#493222] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({assignments.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="p-6 bg-white border border-[#E6D8C7] rounded-2xl text-center space-y-2">
            <Clock className="w-8 h-8 text-[#806A56] mx-auto opacity-50" />
            <span className="font-bold text-xs text-[#38271C] block">
              No Assignments Published Yet
            </span>
            <p className="text-[11px] text-[#806A56]">
              Click "+ New Task" above to publish a course assignment for your students.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {assignments.slice(0, 3).map((asg) => (
              <div
                key={asg.id}
                className="p-3.5 bg-white border border-[#E6D8C7] hover:border-[#D8C7B4] rounded-2xl flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                      {asg.status.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-medium text-[#806A56]">
                      Due: {asg.dueDate}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-[#38271C] truncate">
                    {asg.title}
                  </h3>
                  <p className="text-[11px] text-[#806A56] line-clamp-1 mt-0.5">
                    {asg.description || 'Subject assignment for enrolled students.'}
                  </p>
                </div>

                <button
                  onClick={() => onSelectAssignmentForSubmissions(asg)}
                  className="px-3.5 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  Submissions
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
