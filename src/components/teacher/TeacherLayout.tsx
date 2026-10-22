import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Bell,
  User,
  LogOut,
  ArrowLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { AdminUser, SubjectConfig, INITIAL_SUBJECTS } from '../../data/adminData';
import { AssignmentItem, DocumentItem, NoticeItem } from '../../data/portalData';
import { AwkumEmblem } from '../common/AwkumLogo';
import { TeacherDashboardView } from './TeacherDashboardView';
import { TeacherStudentsView } from './TeacherStudentsView';
import { TeacherDocumentsView } from './TeacherDocumentsView';
import { TeacherAssignmentsView } from './TeacherAssignmentsView';
import { TeacherSubmissionsView } from './TeacherSubmissionsView';
import { TeacherNoticesView } from './TeacherNoticesView';
import { TeacherProfileView } from './TeacherProfileView';
import {
  subscribeToTeacherAssignments,
  subscribeToTeacherDocuments,
  subscribeToTeacherNotices,
} from '../../lib/teacherService';
import { getEnrolledStudentsForClass, ClassStudentItem } from '../../data/classRosterData';

interface TeacherLayoutProps {
  currentUser: AdminUser;
  onLogout: () => void;
}

export type TeacherTabType =
  | 'dashboard'
  | 'students'
  | 'documents'
  | 'assignments'
  | 'submissions'
  | 'notices'
  | 'profile';

export const TeacherLayout: React.FC<TeacherLayoutProps> = ({
  currentUser,
  onLogout,
}) => {
  // Resolve assigned subjects list for teacher
  const assignedSubjectNames = currentUser.assignedSubjects && currentUser.assignedSubjects.length > 0
    ? currentUser.assignedSubjects
    : ['PF Theory'];

  const assignedSubjectsList: SubjectConfig[] = INITIAL_SUBJECTS.filter((s) =>
    assignedSubjectNames.some(
      (name) => name.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(name.toLowerCase())
    )
  );

  const fallbackSubject: SubjectConfig = assignedSubjectsList[0] || {
    id: 's1',
    name: assignedSubjectNames[0] || 'PF Theory',
    code: 'PF101',
    assignedTeacher: currentUser.name,
    teacherEmail: currentUser.email,
    status: 'Assigned',
    creditHours: 3,
  };

  const [selectedSubject, setSelectedSubject] = useState<SubjectConfig>(fallbackSubject);
  const [activeTab, setActiveTab] = useState<TeacherTabType>('dashboard');
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState<AssignmentItem | null>(null);

  // Modals state
  const [isOpenUploadDocModal, setIsOpenUploadDocModal] = useState(false);
  const [isOpenCreateAsgModal, setIsOpenCreateAsgModal] = useState(false);
  const [isOpenCreateNoticeModal, setIsOpenCreateNoticeModal] = useState(false);

  // Dynamic Real-Time Firestore State
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [roster, setRoster] = useState<ClassStudentItem[]>([]);

  // 1. Subscribe to Assignments for selectedSubject
  useEffect(() => {
    const unsubscribe = subscribeToTeacherAssignments(selectedSubject.name, (asgs) => {
      setAssignments(asgs);
    });
    return () => unsubscribe();
  }, [selectedSubject.name]);

  // 2. Subscribe to Documents for selectedSubject
  useEffect(() => {
    const unsubscribe = subscribeToTeacherDocuments(selectedSubject.name, (docs) => {
      setDocuments(docs);
    });
    return () => unsubscribe();
  }, [selectedSubject.name]);

  // 3. Subscribe to Notices for selectedSubject
  useEffect(() => {
    const unsubscribe = subscribeToTeacherNotices(selectedSubject.name, (nots) => {
      setNotices(nots);
    });
    return () => unsubscribe();
  }, [selectedSubject.name]);

  // 4. Fetch roster for class (e.g. BSSE 1A / BSCS 3A)
  useEffect(() => {
    const targetClass = currentUser.assignedClass || 'BSSE 1A';
    const students = getEnrolledStudentsForClass(targetClass);
    setRoster(students);
  }, [currentUser.assignedClass]);

  const handleOpenSubmissions = (asg: AssignmentItem) => {
    setSelectedAssignmentForSubmissions(asg);
    setActiveTab('submissions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8F0E5] text-[#38271C] flex flex-col justify-between selection:bg-[#493222] selection:text-[#FFF9F1]">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col pb-24">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6D8C7] px-4 py-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            {/* Left: AWKUM Teacher Brand */}
            <div className="flex items-center gap-2">
              <AwkumEmblem size={32} />
              <div className="flex flex-col leading-tight">
                <span className="font-serif font-bold text-sm tracking-wide text-[#38271C]">
                  AWKUM ClassHub
                </span>
                <span className="text-[10px] font-semibold text-[#806A56]">
                  Teacher Portal · {selectedSubject.name}
                </span>
              </div>
            </div>

            {/* Right: Teacher Profile Avatar & Sign Out */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#F3E9DD] transition-colors cursor-pointer"
                title="View Teacher Profile"
              >
                <div className="w-8 h-8 rounded-full bg-[#493222] text-[#FFF9F1] font-bold text-xs flex items-center justify-center border border-[#D8C7B4]">
                  {currentUser.name ? currentUser.name.charAt(0) : 'T'}
                </div>
                <div className="hidden sm:flex flex-col text-right leading-tight">
                  <span className="font-bold text-xs text-[#38271C]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-[#668064] font-semibold">Faculty</span>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="p-2 text-[#806A56] hover:text-[#C84B31] hover:bg-[#FDE8E4] rounded-xl transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content View Container */}
        <main className="p-4 flex-1">
          {activeTab === 'dashboard' && (
            <TeacherDashboardView
              teacher={currentUser}
              assignedSubjectsList={assignedSubjectsList}
              selectedSubject={selectedSubject}
              onSelectSubject={(subj) => setSelectedSubject(subj)}
              assignments={assignments}
              documents={documents}
              notices={notices}
              totalEnrolledStudents={roster.length}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenCreateAssignment={() => setIsOpenCreateAsgModal(true)}
              onOpenUploadDocument={() => setIsOpenUploadDocModal(true)}
              onOpenCreateNotice={() => setIsOpenCreateNoticeModal(true)}
              onSelectAssignmentForSubmissions={handleOpenSubmissions}
            />
          )}

          {activeTab === 'students' && (
            <TeacherStudentsView
              selectedSubject={selectedSubject}
              roster={roster}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'documents' && (
            <TeacherDocumentsView
              selectedSubject={selectedSubject}
              teacher={currentUser}
              documents={documents}
              isOpenUploadModal={isOpenUploadDocModal}
              onCloseUploadModal={() => setIsOpenUploadDocModal(false)}
              onOpenUploadModal={() => setIsOpenUploadDocModal(true)}
            />
          )}

          {activeTab === 'assignments' && (
            <TeacherAssignmentsView
              selectedSubject={selectedSubject}
              teacher={currentUser}
              assignments={assignments}
              isOpenCreateModal={isOpenCreateAsgModal}
              onCloseCreateModal={() => setIsOpenCreateAsgModal(false)}
              onOpenCreateModal={() => setIsOpenCreateAsgModal(true)}
              onSelectAssignmentForSubmissions={handleOpenSubmissions}
            />
          )}

          {activeTab === 'submissions' && selectedAssignmentForSubmissions && (
            <TeacherSubmissionsView
              selectedSubject={selectedSubject}
              assignment={selectedAssignmentForSubmissions}
              teacher={currentUser}
              roster={roster}
              onBackToAssignments={() => setActiveTab('assignments')}
            />
          )}

          {activeTab === 'notices' && (
            <TeacherNoticesView
              selectedSubject={selectedSubject}
              teacher={currentUser}
              notices={notices}
              isOpenNoticeModal={isOpenCreateNoticeModal}
              onCloseNoticeModal={() => setIsOpenCreateNoticeModal(false)}
              onOpenNoticeModal={() => setIsOpenCreateNoticeModal(true)}
            />
          )}

          {activeTab === 'profile' && (
            <TeacherProfileView
              teacher={currentUser}
              assignedSubjectsList={assignedSubjectsList}
              onLogout={onLogout}
            />
          )}
        </main>
      </div>

      {/* Docked Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E6D8C7] py-2 px-3 shadow-lg max-w-2xl mx-auto">
        <div className="flex items-center justify-around">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('students');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'students' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'students' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Students</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('documents');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'documents' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === 'documents' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Documents</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('assignments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'assignments' || activeTab === 'submissions' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <ClipboardList className={`w-5 h-5 ${activeTab === 'assignments' || activeTab === 'submissions' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Tasks</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('notices');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'notices' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <Bell className={`w-5 h-5 ${activeTab === 'notices' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Notices</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
