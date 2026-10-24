import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  Users,
  History,
  BellRing,
  ArrowLeft,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { AdminUser } from '../../data/adminData';
import { ScheduleItem } from '../../data/portalData';
import { getEnrolledStudentsForClass, ClassStudentItem } from '../../data/classRosterData';
import {
  AttendanceSession,
  getDailyAttendanceSession,
  formatDateKey,
  subscribeToClassAttendance,
} from '../../lib/attendanceService';
import { AwkumEmblem } from '../common/AwkumLogo';
import { CRDashboardView } from './CRDashboardView';
import { CRAttendanceMarkingView } from './CRAttendanceMarkingView';
import { CRClassRosterView } from './CRClassRosterView';
import { CRAttendanceHistoryView } from './CRAttendanceHistoryView';
import { CRNotifyTeacherView } from './CRNotifyTeacherView';
import { CRAttendanceCorrectionModal } from './CRAttendanceCorrectionModal';
import { CRProfileView } from './CRProfileView';
import { CRSchedulePlannerView } from './CRSchedulePlannerView';

interface CRLayoutProps {
  currentUser: AdminUser;
  todaySchedule: ScheduleItem[];
  nextClass: ScheduleItem | undefined;
  onReturnToStudentPortal: () => void;
  onLogout: () => void;
}

export type CRTabType = 'dashboard' | 'attendance' | 'schedule' | 'students' | 'history' | 'notify' | 'profile';

export const CRLayout: React.FC<CRLayoutProps> = ({
  currentUser,
  todaySchedule,
  nextClass,
  onReturnToStudentPortal,
  onLogout,
}) => {
  const assignedClass = currentUser.assignedClass || 'BSCS 3A';
  const [activeTab, setActiveTab] = useState<CRTabType>('dashboard');
  const [roster, setRoster] = useState<ClassStudentItem[]>([]);
  const [todaySession, setTodaySession] = useState<AttendanceSession | null>(null);
  const [allSessions, setAllSessions] = useState<AttendanceSession[]>([]);
  const [correctingSession, setCorrectingSession] = useState<AttendanceSession | null>(null);
  const [preselectedNotifyClass, setPreselectedNotifyClass] = useState<ScheduleItem | undefined>(undefined);

  // Load roster and real-time attendance sessions
  useEffect(() => {
    const students = getEnrolledStudentsForClass(assignedClass);
    setRoster(students);

    // Initial fetch of today's session
    getDailyAttendanceSession(assignedClass, formatDateKey()).then((sess) => {
      setTodaySession(sess);
    });

    // Real-time listener for class attendance sessions
    const unsubscribe = subscribeToClassAttendance(assignedClass, (sessions) => {
      setAllSessions(sessions);
      const todayKey = formatDateKey();
      const todayMatch = sessions.find((s) => s.date === todayKey);
      if (todayMatch) {
        setTodaySession(todayMatch);
      }
    });

    return () => unsubscribe();
  }, [assignedClass]);

  const handleOpenNotifyTeacher = (classItem: ScheduleItem) => {
    setPreselectedNotifyClass(classItem);
    setActiveTab('notify');
  };

  return (
    <div className="min-h-screen bg-[#F8F0E5] text-[#38271C] flex flex-col justify-between selection:bg-[#493222] selection:text-[#FFF9F1]">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
        {/* Top Persistent Bar: Return to Student Portal & CR Identity */}
        <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6D8C7] px-4 py-2.5 transition-all">
          <div className="flex items-center justify-between gap-2">
            {/* Left: CR Portal Brand */}
            <div className="flex items-center gap-2">
              <AwkumEmblem size={30} />
              <div className="flex flex-col leading-tight">
                <span className="font-serif font-bold text-sm tracking-wide text-[#38271C]">
                  AWKUM
                </span>
                <span className="text-[10px] font-semibold text-[#806A56]">
                  CR Panel · {assignedClass}
                </span>
              </div>
            </div>

            {/* Center / Return Button: Click to go back to Student Portal */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={onReturnToStudentPortal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-full text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-95 group border border-[#38271C]"
                title="Return to Student Portal"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-300 group-hover:-translate-x-0.5 transition-transform" />
                <span className="tracking-wide uppercase font-extrabold text-[11px] sm:text-xs">STUDENT PORTAL</span>
              </button>
            </div>

            {/* Right: CR Student Profile Badge (Clickable to open Screen 13 Profile) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 cursor-pointer p-1 -mr-1 rounded-xl hover:bg-[#F3E9DD] transition-colors"
              title="View CR Profile"
            >
              <div className="w-7 h-7 rounded-full bg-[#EFE3D3] text-[#493222] font-bold text-xs flex items-center justify-center border border-[#493222]/30">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-right leading-tight">
                <span className="font-bold text-xs text-[#38271C]">{currentUser.name.split(' ')[0]}</span>
                <span className="text-[9px] text-[#668064] font-semibold">Active CR</span>
              </div>
            </button>
          </div>
        </header>

        {/* Main Work Area */}
        <main className="p-4 flex-1">
          {activeTab === 'dashboard' && (
            <CRDashboardView
              assignedClass={assignedClass}
              todaySession={todaySession}
              totalEnrolled={roster.length}
              recentSessions={allSessions}
              nextClass={nextClass}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNotifyTeacherClick={handleOpenNotifyTeacher}
            />
          )}

          {activeTab === 'attendance' && (
            <CRAttendanceMarkingView
              assignedClass={assignedClass}
              crUser={{ id: currentUser.id, name: currentUser.name, email: currentUser.email }}
              roster={roster}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onGoToHistory={() => {
                setActiveTab('history');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onAttendanceFinalized={(sess) => {
                setTodaySession(sess);
                setAllSessions((prev) => [sess, ...prev.filter((p) => p.id !== sess.id)]);
              }}
            />
          )}

          {activeTab === 'schedule' && (
            <CRSchedulePlannerView
              assignedClass={assignedClass}
              crUser={{ id: currentUser.id, name: currentUser.name, email: currentUser.email }}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'students' && (
            <CRClassRosterView
              assignedClass={assignedClass}
              roster={roster}
              todaySession={todaySession}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'history' && (
            <CRAttendanceHistoryView
              assignedClass={assignedClass}
              sessions={allSessions}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onOpenSessionCorrection={(sess) => setCorrectingSession(sess)}
            />
          )}

          {activeTab === 'notify' && (
            <CRNotifyTeacherView
              assignedClass={assignedClass}
              crUser={{ id: currentUser.id, name: currentUser.name, email: currentUser.email }}
              todaySchedule={todaySchedule}
              preselectedClass={preselectedNotifyClass}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'profile' && (
            <CRProfileView
              currentUser={currentUser}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onReturnToStudentPortal={onReturnToStudentPortal}
              onLogout={onLogout}
            />
          )}
        </main>
      </div>

      {/* Bottom Sticky Mobile Navigation for CR Panel */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E6D8C7] py-2 px-3 shadow-lg max-w-2xl mx-auto">
        <div className="flex items-center justify-around">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('attendance');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'attendance' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <CalendarCheck className={`w-5 h-5 ${activeTab === 'attendance' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Attendance</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('schedule');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'schedule' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === 'schedule' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Schedule</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('students');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'students' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'students' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Students</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'history' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <History className={`w-5 h-5 ${activeTab === 'history' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">History</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('notify');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'notify' ? 'text-[#493222] font-bold' : 'text-[#806A56]'
            }`}
          >
            <BellRing className={`w-5 h-5 ${activeTab === 'notify' ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px]">Alerts</span>
          </button>
        </div>
      </nav>

      {/* Global Attendance Correction Modal when initiated from history */}
      {correctingSession && (
        <CRAttendanceCorrectionModal
          session={correctingSession}
          roster={roster}
          crName={currentUser.name}
          onClose={() => setCorrectingSession(null)}
          onSuccess={(revised) => {
            setCorrectingSession(null);
            setAllSessions((prev) => [revised, ...prev.filter((p) => p.id !== revised.id)]);
            if (revised.date === formatDateKey()) {
              setTodaySession(revised);
            }
          }}
        />
      )}
    </div>
  );
};
