/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  StudentProfile,
  INITIAL_STUDENT,
  SUBJECTS,
  SCHEDULE_ITEMS,
  DAILY_ATTENDANCE_RECORDS,
  DOCUMENTS,
  ASSIGNMENTS,
  NOTIFICATIONS,
  NOTICES,
  DocumentItem,
  AssignmentItem,
  NotificationItem,
} from './data/portalData';
import { AdminUser, UserRole } from './data/adminData';
import { Header } from './components/common/Header';
import { BottomNav, TabType } from './components/common/BottomNav';
import { SideDrawer } from './components/common/SideDrawer';
import { DocumentPreviewModal } from './components/common/DocumentPreviewModal';
import { AssignmentDetailModal } from './components/common/AssignmentDetailModal';
import { db } from './lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

// Screens & Layouts
import { LoginScreen } from './components/screens/LoginScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { ScheduleScreen } from './components/screens/ScheduleScreen';
import { ClassesScreen } from './components/screens/ClassesScreen';
import { AssignmentsScreen } from './components/screens/AssignmentsScreen';
import { ProgressScreen } from './components/screens/ProgressScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { AdminLayout } from './components/admin/AdminLayout';
import { UnavailablePortalScreen } from './components/screens/UnavailablePortalScreen';

export default function App() {
  // Authentication & Role-Based Access State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Navigation & View state for Student Portal
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isDeviceFrame, setIsDeviceFrame] = useState<boolean>(false);

  // Selected drill-down states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<AssignmentItem | null>(null);

  // Centralized Application State
  const [student, setStudent] = useState<StudentProfile>(INITIAL_STUDENT);
  const [assignments, setAssignments] = useState<AssignmentItem[]>(ASSIGNMENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const [reminders, setReminders] = useState<Record<string, { enabled: boolean; minutes: number }>>({
    'sch-wed-1': { enabled: true, minutes: 15 },
  });

  // Calculate key metrics
  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingAssignmentsCount = assignments.filter((a) => a.status === 'todo').length;

  const totalFinalizedDays = DAILY_ATTENDANCE_RECORDS.filter((r) => r.finalized).length;
  const presentDaysCount = DAILY_ATTENDANCE_RECORDS.filter(
    (r) => r.finalized && r.status === 'present'
  ).length;
  const overallAttendancePercentage =
    totalFinalizedDays > 0
      ? Math.round((presentDaysCount / totalFinalizedDays) * 100)
      : 0;

  // Next upcoming class
  const nextClass = SCHEDULE_ITEMS.find((item) => item.day === 'Wed' && item.startsIn);
  const todaySchedule = SCHEDULE_ITEMS.filter((item) => item.day === 'Wed');
  const dueSoonAssignments = assignments.filter((item) => item.status === 'todo').slice(0, 2);

  // Handlers
  const handleToggleReminder = (classId: string, minutes: number) => {
    setReminders((prev) => {
      const current = prev[classId];
      if (current?.enabled) {
        const next = { ...prev };
        delete next[classId];
        return next;
      } else {
        return {
          ...prev,
          [classId]: { enabled: true, minutes },
        };
      }
    });
  };

  const handleSubmitAssignmentWork = (
    assignmentId: string,
    answerText: string,
    fileName: string,
    fileUrl?: string
  ) => {
    const now = new Date();
    const formattedDate = `Oct 19, 2026 at ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    setAssignments((prev) =>
      prev.map((asg) =>
        asg.id === assignmentId
          ? {
              ...asg,
              status: 'submitted',
              submissionDate: formattedDate,
              submittedContent: answerText,
              submittedFileName: fileName,
            }
          : asg
      )
    );

    // Also update preview modal if open
    setActiveAssignment((prev) =>
      prev && prev.id === assignmentId
        ? {
            ...prev,
            status: 'submitted',
            submissionDate: formattedDate,
            submittedContent: answerText,
            submittedFileName: fileName,
          }
        : prev
    );

    // Persist to Cloud Firestore if permitted by security rules
    if (db) {
      addDoc(collection(db, 'submissions'), {
        assignmentId,
        studentId: student.id,
        studentName: student.name,
        submittedContent: answerText,
        submittedFileName: fileName,
        fileUrl: fileUrl || null,
        storageProvider: fileUrl ? 'cloudinary' : 'local',
        timestamp: serverTimestamp(),
      }).catch((err) => {
        console.info('[Firestore] Submission recorded in student session. Remote sync awaiting authenticated user:', err?.message || err);
      });
    }

    // Dispatch a new local notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Assignment Submitted',
      category: 'Assignments',
      message: 'Your work for assignment was submitted successfully via Cloudinary.',
      timestamp: 'Just now',
      read: false,
      actionTarget: {
        tab: 'assignments',
      },
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.actionTarget?.tab) {
      setActiveTab(notif.actionTarget.tab);
      setShowNotifications(false);
    }
  };

  const handleUpdateStudent = (updated: Partial<StudentProfile>) => {
    setStudent((prev) => ({ ...prev, ...updated }));
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setShowNotifications(false);
    setShowProfile(false);
    if (tab !== 'classes') {
      setSelectedSubjectId(null);
    }
  };

  const handleLoginSuccess = (user: AdminUser, role: UserRole) => {
    setCurrentUser(user);
    setUserRole(role);
    if (role === 'student') {
      setStudent((prev) => ({
        ...prev,
        name: user.name || prev.name,
        id: user.studentId || prev.id,
        email: user.email || prev.email,
        department: user.department || prev.department,
        program: `BS ${user.department || 'Software Engineering'}`,
        semester: user.semester || prev.semester,
        fatherName: user.fatherName || prev.fatherName,
      }));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole(null);
    setShowProfile(false);
    setShowNotifications(false);
    setSelectedSubjectId(null);
  };

  // 1. If not authenticated, render the shared Login Screen
  if (!currentUser || !userRole) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. If Master Admin, render protected Master Admin Control Room
  if (userRole === 'master_admin') {
    return <AdminLayout currentUser={currentUser} onLogout={handleLogout} />;
  }

  // 3. If Teacher or CR (portals in development), render dedicated advisory screen
  if (userRole === 'teacher' || userRole === 'cr') {
    return <UnavailablePortalScreen user={currentUser} onLogout={handleLogout} />;
  }

  // 4. Default: Render verified Student Portal
  return (
    <div className="min-h-screen bg-[#EFE3D3]/40 text-[#38271C] flex justify-center selection:bg-[#493222] selection:text-[#FFF9F1]">
      {/* Container: If isDeviceFrame is on, wraps into an authentic smartphone shell */}
      <div
        className={`w-full transition-all duration-300 ${
          isDeviceFrame
            ? 'max-w-[430px] my-4 sm:my-8 rounded-[40px] shadow-2xl border-[10px] border-[#38271C] overflow-hidden bg-[#F8F0E5] ring-1 ring-black/10'
            : 'max-w-2xl bg-[#F8F0E5] min-h-screen shadow-md'
        }`}
      >
        {/* Device Speaker Notch in Phone Mode */}
        {isDeviceFrame && (
          <div className="bg-[#38271C] h-5 w-full flex items-center justify-center">
            <div className="w-16 h-1.5 bg-[#493222] rounded-full" />
          </div>
        )}

        {/* Global App Shell Header */}
        <Header
          student={student}
          unreadCount={unreadCount}
          onOpenNotifications={() => {
            setShowNotifications(!showNotifications);
            setShowProfile(false);
          }}
          onOpenProfile={() => {
            setShowProfile(!showProfile);
            setShowNotifications(false);
          }}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          isDeviceFrame={isDeviceFrame}
          onToggleDeviceFrame={() => setIsDeviceFrame(!isDeviceFrame)}
        />

        {/* Main Content Area with Smooth Page Transitions */}
        <main className="p-4 pb-28 relative min-h-[calc(100vh-120px)] overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={
                showNotifications
                  ? 'notifications'
                  : showProfile
                  ? 'profile'
                  : selectedSubjectId
                  ? `subject-${selectedSubjectId}`
                  : activeTab
              }
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {showNotifications ? (
                <NotificationsScreen
                  notifications={notifications}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onNotificationClick={handleNotificationClick}
                  onClearAll={() => setNotifications([])}
                />
              ) : showProfile ? (
                <ProfileScreen
                  student={student}
                  onUpdateStudent={handleUpdateStudent}
                  onLogout={handleLogout}
                />
              ) : (
                <>
                  {activeTab === 'home' && (
                    <HomeScreen
                      student={student}
                      nextClass={nextClass}
                      todaySchedule={todaySchedule}
                      recentDocuments={DOCUMENTS}
                      dueSoonAssignments={dueSoonAssignments}
                      notices={NOTICES}
                      onChangeTab={handleTabChange}
                      onOpenDocument={(doc) => setPreviewDocument(doc)}
                      onOpenAssignment={(asg) => setActiveAssignment(asg)}
                      overallAttendancePercentage={overallAttendancePercentage}
                      presentDaysCount={presentDaysCount}
                      totalDaysCount={totalFinalizedDays}
                    />
                  )}

                  {activeTab === 'schedule' && (
                    <ScheduleScreen
                      scheduleItems={SCHEDULE_ITEMS}
                      reminders={reminders}
                      onToggleReminder={handleToggleReminder}
                    />
                  )}

                  {activeTab === 'classes' && (
                    <ClassesScreen
                      subjects={SUBJECTS}
                      documents={DOCUMENTS}
                      assignments={assignments}
                      notices={NOTICES}
                      selectedSubjectId={selectedSubjectId}
                      onSelectSubject={(id) => setSelectedSubjectId(id)}
                      onOpenDocument={(doc) => setPreviewDocument(doc)}
                      onOpenAssignment={(asg) => setActiveAssignment(asg)}
                    />
                  )}

                  {activeTab === 'assignments' && (
                    <AssignmentsScreen
                      assignments={assignments}
                      subjects={SUBJECTS}
                      onOpenAssignment={(asg) => setActiveAssignment(asg)}
                    />
                  )}

                  {activeTab === 'progress' && (
                    <ProgressScreen attendanceRecords={DAILY_ATTENDANCE_RECORDS} />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Docked Mobile Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          pendingAssignmentsCount={pendingAssignmentsCount}
          isDeviceFrame={isDeviceFrame}
        />

        {/* Side Drawer Menu */}
        <SideDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          student={student}
          unreadCount={unreadCount}
          onOpenNotifications={() => {
            setShowNotifications(true);
            setShowProfile(false);
          }}
          onOpenProfile={() => {
            setShowProfile(true);
            setShowNotifications(false);
          }}
          onOpenSettings={() => {
            setShowProfile(true);
            setShowNotifications(false);
          }}
          onOpenHelp={() => {
            setShowProfile(true);
            setShowNotifications(false);
          }}
          onLogout={handleLogout}
        />

        {/* Modals */}
        <DocumentPreviewModal
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
        />

        <AssignmentDetailModal
          assignment={activeAssignment}
          onClose={() => setActiveAssignment(null)}
          onSubmitWork={handleSubmitAssignmentWork}
        />
      </div>
    </div>
  );
}
