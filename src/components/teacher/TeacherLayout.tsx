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
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Mail,
  Building,
} from 'lucide-react';
import { AdminUser, SubjectConfig } from '../../data/adminData';
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
import {
  subscribeToTeacherIncomingAlerts,
  TeacherAlertRecord,
} from '../../lib/teacherAlertService';
import { subscribeToTeacherAssignedSubjects } from '../../lib/subjectService';
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
  // Real-time subjects dynamically queried from Firestore for this teacher
  const [assignedSubjectsList, setAssignedSubjectsList] = useState<SubjectConfig[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(true);
  const [selectedSubject, setSelectedSubject] = useState<SubjectConfig | null>(null);

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
  const [incomingAlerts, setIncomingAlerts] = useState<TeacherAlertRecord[]>([]);

  // 1. Subscribe to teacher's assigned subjects dynamically from Cloud Firestore
  useEffect(() => {
    setIsLoadingSubjects(true);
    const unsubscribe = subscribeToTeacherAssignedSubjects(
      { uid: currentUser.uid, email: currentUser.email },
      (subjects) => {
        setAssignedSubjectsList(subjects);
        setIsLoadingSubjects(false);
        setSelectedSubject((prev) => {
          if (!prev) return subjects[0] || null;
          const stillAssigned = subjects.find((s) => s.id === prev.id);
          return stillAssigned || subjects[0] || null;
        });
      }
    );
    return () => unsubscribe();
  }, [currentUser.uid, currentUser.email]);

  // 2. Subscribe to Assignments for selectedSubject
  useEffect(() => {
    if (!selectedSubject) {
      setAssignments([]);
      return;
    }
    const unsubscribe = subscribeToTeacherAssignments(
      { id: selectedSubject.id, name: selectedSubject.name },
      (asgs) => {
        setAssignments(asgs);
      }
    );
    return () => unsubscribe();
  }, [selectedSubject?.id, selectedSubject?.name]);

  // 3. Subscribe to Documents for selectedSubject
  useEffect(() => {
    if (!selectedSubject) {
      setDocuments([]);
      return;
    }
    const unsubscribe = subscribeToTeacherDocuments(
      { id: selectedSubject.id, name: selectedSubject.name },
      (docs) => {
        setDocuments(docs);
      }
    );
    return () => unsubscribe();
  }, [selectedSubject?.id, selectedSubject?.name]);

  // 4. Subscribe to Notices for selectedSubject
  useEffect(() => {
    if (!selectedSubject) {
      setNotices([]);
      return;
    }
    const unsubscribe = subscribeToTeacherNotices(
      { id: selectedSubject.id, name: selectedSubject.name },
      (nots) => {
        setNotices(nots);
      }
    );
    return () => unsubscribe();
  }, [selectedSubject?.id, selectedSubject?.name]);

  // 5. Fetch roster for class (e.g. BSSE 1A / BSCS 3A)
  useEffect(() => {
    const targetClass = selectedSubject?.assignedClass || currentUser.assignedClass || 'BSSE 1A';
    const students = getEnrolledStudentsForClass(targetClass);
    setRoster(students);
  }, [selectedSubject?.assignedClass, currentUser.assignedClass]);

  // 6. Subscribe to CR arrival reminder alerts
  useEffect(() => {
    if (!currentUser.email) return;
    const unsubscribe = subscribeToTeacherIncomingAlerts(currentUser.email, (alerts) => {
      setIncomingAlerts(alerts);
    });
    return () => unsubscribe();
  }, [currentUser.email]);

  const handleOpenSubmissions = (asg: AssignmentItem) => {
    setSelectedAssignmentForSubmissions(asg);
    setActiveTab('submissions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading Screen while resolving faculty subjects
  if (isLoadingSubjects) {
    return (
      <div className="min-h-screen bg-[#F8F0E5] text-[#38271C] flex items-center justify-center p-4">
        <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-8 max-w-sm w-full text-center shadow-sm space-y-3">
          <AwkumEmblem size={44} className="mx-auto animate-pulse" />
          <h2 className="font-serif font-bold text-base text-[#38271C]">AWKUM ClassHub</h2>
          <p className="text-xs text-[#806A56] font-medium">
            Verifying faculty credentials and retrieving assigned subjects...
          </p>
        </div>
      </div>
    );
  }

  // Empty State: Authenticated faculty without any assigned subjects yet
  if (!selectedSubject || assignedSubjectsList.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F0E5] text-[#38271C] flex flex-col justify-between selection:bg-[#493222] selection:text-[#FFF9F1]">
        <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col pb-12">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6D8C7] px-4 py-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AwkumEmblem size={32} />
                <div className="flex flex-col leading-tight">
                  <span className="font-serif font-bold text-sm tracking-wide text-[#38271C]">
                    AWKUM ClassHub
                  </span>
                  <span className="text-[10px] font-semibold text-[#806A56]">
                    Teacher Portal · Faculty Verification
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 bg-[#FFF9F1] border border-[#E6D8C7] text-[#C84B31] hover:bg-[#FDE8E4] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </header>

          {/* Empty State Banner */}
          <main className="p-4 flex-1 flex flex-col justify-center">
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-sm space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
                <BookOpen className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-[11px] font-bold">
                  <span>Faculty Verified · Awaiting Subject Allocation</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#38271C] pt-2">
                  No Active Subject Assigned
                </h1>
                <p className="text-xs text-[#806A56] max-w-md mx-auto leading-relaxed">
                  Your university faculty account is authenticated and verified, but the Master Admin has not assigned you to teach any subject yet.
                </p>
              </div>

              {/* Faculty Credentials Card */}
              <div className="bg-white border border-[#E6D8C7] rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#806A56]">Faculty Name:</span>
                  <span className="font-bold text-[#38271C]">{currentUser.name || 'Faculty Member'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#806A56]">Registered Gmail:</span>
                  <span className="font-mono font-bold text-[#38271C]">{currentUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#806A56]">Firebase UID:</span>
                  <span className="font-mono text-[10px] text-[#493222] bg-[#EFE3D3] px-2 py-0.5 rounded">
                    {currentUser.uid || 'Synced with Auth'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#806A56]">Department:</span>
                  <span className="font-medium text-[#38271C]">
                    {currentUser.department || 'Department of Computer Science / SE'}
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-[#EFE3D3]/60 border border-[#E6D8C7] rounded-2xl p-4 text-left text-xs text-[#493222] space-y-2">
                <span className="font-bold block text-[11px] uppercase tracking-wider text-[#38271C]">
                  How to activate your workspace:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#806A56]">
                  <li>Provide your verified Gmail (<span className="font-mono text-[#38271C]">{currentUser.email}</span>) to the Master Admin.</li>
                  <li>Master Admin assigns you to your curriculum subjects in the Admin Portal.</li>
                  <li>This dashboard will automatically unlock in real-time without requiring a re-login.</li>
                </ol>
                <div className="pt-1 text-[10px] text-[#806A56] font-medium border-t border-[#D8C7B4]/50">
                  Master Admin: <span className="font-mono font-bold text-[#38271C]">hasnainbuilds724656@gmail.com</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check For Updates</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white border border-[#E6D8C7] hover:bg-[#F3E9DD] text-[#38271C] text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Switch Account
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F0E5] text-[#38271C] flex flex-col justify-between selection:bg-[#493222] selection:text-[#FFF9F1]">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col pb-24">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6D8C7] px-4 py-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            {/* Left: AWKUM Teacher Brand */}
            <div className="flex items-center gap-2 min-w-0">
              <AwkumEmblem size={32} />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-serif font-bold text-sm tracking-wide text-[#38271C]">
                  AWKUM ClassHub
                </span>
                <span className="text-[10px] font-semibold text-[#806A56] truncate">
                  Teacher Portal · <strong className="font-extrabold text-[#38271C]">{selectedSubject.name}</strong>
                </span>
              </div>
            </div>

            {/* Middle: Subject Switcher Dropdown if multi-subject */}
            {assignedSubjectsList.length > 1 && (
              <div className="hidden sm:flex items-center">
                <select
                  value={selectedSubject.id}
                  onChange={(e) => {
                    const match = assignedSubjectsList.find((s) => s.id === e.target.value);
                    if (match) setSelectedSubject(match);
                  }}
                  className="bg-[#F8F0E5] border border-[#D8C7B4] text-[#38271C] text-xs font-extrabold rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#493222] cursor-pointer"
                  title="Switch Active Subject Workspace"
                >
                  {assignedSubjectsList.map((subj) => (
                    <option key={subj.id} value={subj.id} className="font-bold">
                      {subj.name} {subj.code ? `(${subj.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Right: Teacher Profile Avatar & Sign Out */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#F3E9DD] transition-colors cursor-pointer"
                title="View Teacher Profile"
              >
                <div className="w-8 h-8 rounded-full bg-[#493222] text-[#FFF9F1] font-bold text-xs flex items-center justify-center border border-[#D8C7B4]">
                  {(currentUser.name && !currentUser.name.includes('@') ? currentUser.name : 'T').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-right leading-tight">
                  <span className="font-bold text-xs text-[#38271C]">
                    {(currentUser.name && !currentUser.name.includes('@')
                      ? currentUser.name
                      : currentUser.email ? currentUser.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\d+/g, '').trim().replace(/\b\w/g, (c) => c.toUpperCase()) : 'Teacher').split(' ')[0]}
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
              incomingAlerts={incomingAlerts}
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
