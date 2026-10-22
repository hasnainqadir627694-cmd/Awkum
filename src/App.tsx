import React, { useState, useEffect } from 'react';
import {
  StudentProfile,
  INITIAL_STUDENT,
  SUBJECTS,
  SCHEDULE_ITEMS,
  DocumentItem,
  AssignmentItem,
  NotificationItem,
  DailyAttendanceRecord,
  NoticeItem,
} from './data/portalData';
import { AdminUser, UserRole, isUserCR } from './data/adminData';
import { Header } from './components/common/Header';
import { BottomNav, TabType } from './components/common/BottomNav';
import { SideDrawer } from './components/common/SideDrawer';
import { DocumentPreviewModal } from './components/common/DocumentPreviewModal';
import { AssignmentDetailModal } from './components/common/AssignmentDetailModal';
import { db, auth } from './lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToUserAccount, markCRAccessAcknowledged, resolveUserRole } from './lib/authService';
import { subscribeToStudentPersonalAttendance } from './lib/attendanceService';

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
import { CRLayout } from './components/cr/CRLayout';
import { CRAccessGrantedModal } from './components/cr/CRAccessGrantedModal';
import { TeacherLayout } from './components/teacher/TeacherLayout';

export default function App() {
  // Authentication & Role-Based Access State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // One Account, Two Experiences: Allows CR to seamlessly switch between Student Portal and CR Panel
  const [portalMode, setPortalModeState] = useState<'student' | 'cr'>(() => {
    if (typeof window !== 'undefined' && window.location.hash.toLowerCase() === '#cr') {
      return 'cr';
    }
    return 'student';
  });

  const setPortalMode = React.useCallback((mode: 'student' | 'cr') => {
    setPortalModeState(mode);
    if (typeof window !== 'undefined') {
      const targetHash = mode === 'cr' ? '#cr' : '#student';
      if (window.location.hash.toLowerCase() !== targetHash) {
        history.replaceState(null, '', `${window.location.pathname}${targetHash}`);
      }
    }
  }, []);
  const [showCRAccessModal, setShowCRAccessModal] = useState<boolean>(false);

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

  // Centralized Dynamic Application State (Clean from initial stage, no fake dummy data)
  const [student, setStudent] = useState<StudentProfile>(INITIAL_STUDENT);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reminders, setReminders] = useState<Record<string, { enabled: boolean; minutes: number }>>({});

  // Dynamic Real-time Calculations
  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingAssignmentsCount = assignments.filter((a) => a.status === 'todo').length;

  const totalFinalizedDays = attendanceRecords.filter((r) => r.finalized).length;
  const presentDaysCount = attendanceRecords.filter(
    (r) => r.finalized && r.status === 'present'
  ).length;
  const overallAttendancePercentage =
    totalFinalizedDays > 0
      ? Math.round((presentDaysCount / totalFinalizedDays) * 100)
      : 0;

  // Authentic weekday schedule based on actual current day
  const dayNames: ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[] = [
    'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
  ];
  const currentDay = dayNames[new Date().getDay()];
  const isWeekend = currentDay === 'Sun' || currentDay === 'Sat';

  const todaySchedule = isWeekend
    ? []
    : SCHEDULE_ITEMS.filter((item) => item.day === currentDay);

  const dueSoonAssignments = assignments.filter((item) => item.status === 'todo').slice(0, 2);

  // Next class calculation based on current time
  const now = new Date();
  const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();

  const nextClass = todaySchedule.find((item) => {
    const match = item.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return false;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m >= currentMinutesOfDay;
  }) || (todaySchedule.length > 0 ? todaySchedule[0] : undefined);

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

  // 1. Session Restoration on Initial Load & Firebase Auth State Listener
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        const cleanEmail = firebaseUser.email.trim().toLowerCase();
        try {
          const resolution = await resolveUserRole(cleanEmail, undefined, firebaseUser.uid);
          if (resolution.success && resolution.user && resolution.role) {
            handleLoginSuccess(resolution.user, resolution.role);
          }
        } catch (e) {
          console.info('[App Auth] State resolution notice:', e);
        }
      } else {
        // Fallback: Check remembered local session
        if (typeof window !== 'undefined') {
          try {
            const savedSession = localStorage.getItem('awkum_active_session');
            if (savedSession) {
              const parsed = JSON.parse(savedSession);
              if (parsed?.email) {
                const resolution = await resolveUserRole(parsed.email, undefined, parsed.uid);
                if (resolution.success && resolution.user && resolution.role) {
                  handleLoginSuccess(resolution.user, resolution.role);
                }
              }
            }
          } catch (e) {}
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time listener for current user permissions and role updates
  useEffect(() => {
    if (!currentUser?.email) return;

    const unsubscribe = subscribeToUserAccount(currentUser.email, (updatedUser) => {
      if (updatedUser) {
        setCurrentUser(updatedUser);
        if (updatedUser.role) {
          setUserRole(updatedUser.role);
        }
        if (isUserCR(updatedUser)) {
          if (!updatedUser.crAcknowledged) {
            setShowCRAccessModal(true);
          }
        } else if (updatedUser.crStatus === 'revoked') {
          // If role was explicitly revoked by Master Admin
          setShowCRAccessModal(false);
          setPortalMode('student');
          if (typeof window !== 'undefined' && window.location.hash === '#cr') {
            history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.email]);

  // 2b. URL Hash Guard: Respects #cr or #student in browser URL without flickering
  useEffect(() => {
    const handleHashCheck = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.toLowerCase();
      if (hash === '#cr') {
        if (!currentUser || isUserCR(currentUser) || currentUser.role === 'cr' || currentUser.isCR) {
          setPortalModeState('cr');
        }
      } else if (hash === '#student') {
        setPortalModeState('student');
      }
    };

    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, [currentUser]);

  // 2c. Real-time revocation guard: kick out only if CR privileges are explicitly revoked by Master Admin
  useEffect(() => {
    if (portalMode === 'cr' && currentUser?.crStatus === 'revoked') {
      setPortalMode('student');
      if (typeof window !== 'undefined' && window.location.hash === '#cr') {
        history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [currentUser?.crStatus, portalMode]);

  // 3. Real-time personal attendance subscription for enrolled student
  useEffect(() => {
    if (!currentUser || userRole === 'master_admin') return;

    const classId = currentUser.assignedClass || 'BSSE 1A';
    const studentId = currentUser.studentId || currentUser.id;
    const email = currentUser.email;

    const unsubscribe = subscribeToStudentPersonalAttendance(classId, studentId, email, (records) => {
      setAttendanceRecords(records);
    });

    return () => unsubscribe();
  }, [currentUser?.email, currentUser?.assignedClass, currentUser?.studentId, userRole]);

  // 4. Real-time Firestore synchronization for assignments, documents, and announcements
  useEffect(() => {
    if (!currentUser || userRole === 'master_admin' || !db) return;

    // A. Real assignments
    let unsubAssignments = () => {};
    try {
      unsubAssignments = onSnapshot(collection(db, 'assignments'), (snapshot) => {
        const list: AssignmentItem[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            list.push({ id: d.id, ...d.data() } as AssignmentItem);
          }
        });
        setAssignments(list);
      }, (err) => {
        console.info('[App] Assignments sync notice:', err.message);
      });
    } catch (e) {}

    // B. Real documents
    let unsubDocuments = () => {};
    try {
      unsubDocuments = onSnapshot(collection(db, 'documents'), (snapshot) => {
        const list: DocumentItem[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            list.push({ id: d.id, ...d.data() } as DocumentItem);
          }
        });
        setDocuments(list);
      }, (err) => {
        console.info('[App] Documents sync notice:', err.message);
      });
    } catch (e) {}

    // C. Real announcements
    let unsubNotices = () => {};
    try {
      unsubNotices = onSnapshot(collection(db, 'announcements'), (snapshot) => {
        const list: NoticeItem[] = [];
        snapshot.forEach((d) => {
          if (d.exists()) {
            const data = d.data();
            list.push({
              id: d.id,
              title: data.title || 'Official University Notice',
              content: data.message || data.content || '',
              department: 'Abdul Wali Khan University Mardan',
              date: data.date || 'Recent',
              urgent: !!data.urgent,
            });
          }
        });
        setNotices(list);
      }, (err) => {
        console.info('[App] Notices sync notice:', err.message);
      });
    } catch (e) {}

    return () => {
      unsubAssignments();
      unsubDocuments();
      unsubNotices();
    };
  }, [currentUser?.email, userRole]);

  const handleLoginSuccess = (user: AdminUser, role: UserRole) => {
    setCurrentUser(user);
    setUserRole(role);

    // Save active session for instant restoration on reload/deployment
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'awkum_active_session',
          JSON.stringify({
            email: user.email,
            uid: user.uid,
            role,
            savedAt: Date.now(),
          })
        );
      } catch (e) {}
    }

    if (role === 'student' || role === 'cr' || isUserCR(user)) {
      setStudent({
        id: user.studentId || user.id,
        name: user.name,
        fatherName: user.fatherName || 'Not Provided',
        email: user.email,
        department: user.department || 'Software Engineering',
        program: `BS ${user.department || 'Software Engineering'}`,
        university: 'Abdul Wali Khan University Mardan',
        session: user.semester?.includes('3rd') ? '2023 – 2027' : '2026 – 2030',
        semester: user.semester || '1st Semester',
        section: user.assignedClass ? user.assignedClass.split(' ').pop() || '1A' : '1A',
        cgpa: 0.0,
        phone: user.phone || '',
        emergencyContact: '',
        address: 'Garden Campus, Mardan, Khyber Pakhtunkhwa',
        avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400',
      });

      // Initialize welcome notification for new/returning student
      setNotifications([
        {
          id: `welcome-${user.id || Date.now()}`,
          title: 'Welcome to AWKUM ClassHub',
          category: 'Notices',
          message: `Welcome, ${user.name}! Your account is active for ${user.semester || '1st Semester'} (${user.department || 'Software Engineering'}, Section ${user.assignedClass ? user.assignedClass.split(' ').pop() || '1A' : '1A'}). Timetable and attendance records will accumulate here in real time.`,
          timestamp: 'Just now',
          read: false,
          actionTarget: { tab: 'home' },
        },
      ]);
    }

    // Check if newly granted CR requires the official access granted confirmation
    if (isUserCR(user) && !user.crAcknowledged) {
      setShowCRAccessModal(true);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('awkum_active_session');
        if (window.location.hash) {
          history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {}
    }
    if (auth) {
      signOut(auth).catch(() => {});
    }
    setCurrentUser(null);
    setUserRole(null);
    setPortalMode('student');
    setShowCRAccessModal(false);
    setShowProfile(false);
    setShowNotifications(false);
    setSelectedSubjectId(null);
    setAttendanceRecords([]);
    setAssignments([]);
    setDocuments([]);
  };

  // 1. If not authenticated, render the shared Login Screen
  if (!currentUser || !userRole) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. If Master Admin, render protected Master Admin Control Room
  if (userRole === 'master_admin') {
    return <AdminLayout currentUser={currentUser} onLogout={handleLogout} />;
  }

  // 3. If Faculty/Teacher, render dedicated Teacher Portal
  if (userRole === 'teacher') {
    return <TeacherLayout currentUser={currentUser} onLogout={handleLogout} />;
  }

  // 4. One Account, Two Experiences: If student activated CR workspace
  if (isUserCR(currentUser) && portalMode === 'cr') {
    return (
      <CRLayout
        currentUser={currentUser}
        todaySchedule={todaySchedule}
        nextClass={nextClass}
        onReturnToStudentPortal={() => {
          setPortalMode('student');
          if (typeof window !== 'undefined' && window.location.hash === '#cr') {
            history.replaceState(null, '', window.location.pathname);
          }
        }}
        onLogout={handleLogout}
      />
    );
  }

  // 5. Default: Render verified Student Portal (available to all students & CRs)
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
          isCR={isUserCR(currentUser)}
          assignedClass={currentUser?.assignedClass || 'BSCS 3A'}
          onOpenCRPanel={() => setPortalMode('cr')}
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
                      recentDocuments={documents}
                      dueSoonAssignments={dueSoonAssignments}
                      notices={notices}
                      onChangeTab={handleTabChange}
                      onOpenDocument={(doc) => setPreviewDocument(doc)}
                      onOpenAssignment={(asg) => setActiveAssignment(asg)}
                      overallAttendancePercentage={overallAttendancePercentage}
                      presentDaysCount={presentDaysCount}
                      totalDaysCount={totalFinalizedDays}
                      isCR={isUserCR(currentUser)}
                      assignedClass={currentUser?.assignedClass || 'BSSE 1A'}
                      onOpenCRPanel={() => setPortalMode('cr')}
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
                      subjects={SUBJECTS.map((s) => ({
                        ...s,
                        totalNotes: documents.filter((d) => d.subjectId === s.id).length,
                        totalAssignments: assignments.filter((a) => a.subjectId === s.id).length,
                      }))}
                      documents={documents}
                      assignments={assignments}
                      notices={notices}
                      selectedSubjectId={selectedSubjectId}
                      onSelectSubject={(id) => setSelectedSubjectId(id)}
                      onOpenDocument={(doc) => setPreviewDocument(doc)}
                      onOpenAssignment={(asg) => setActiveAssignment(asg)}
                    />
                  )}

                  {activeTab === 'assignments' && (
                    <AssignmentsScreen
                      assignments={assignments}
                      subjects={SUBJECTS.map((s) => ({
                        ...s,
                        totalNotes: documents.filter((d) => d.subjectId === s.id).length,
                        totalAssignments: assignments.filter((a) => a.subjectId === s.id).length,
                      }))}
                      onOpenAssignment={(asg) => setActiveAssignment(asg)}
                    />
                  )}

                  {activeTab === 'progress' && (
                    <ProgressScreen attendanceRecords={attendanceRecords} />
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
          pendingAssignmentsCount={pendingAssignmentsCount}
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
          isCR={isUserCR(currentUser)}
          assignedClass={currentUser?.assignedClass || (student.section ? `BSSE ${student.section}` : 'BSSE 1A')}
          onOpenCRPanel={() => {
            setIsDrawerOpen(false);
            setPortalMode('cr');
            if (typeof window !== 'undefined') {
              window.location.hash = 'cr';
            }
          }}
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

        <CRAccessGrantedModal
          isOpen={showCRAccessModal}
          assignedClass={currentUser?.assignedClass || (student.section ? `BSSE ${student.section}` : 'BSSE 1A')}
          onOpenCRPanel={() => {
            setShowCRAccessModal(false);
            if (currentUser?.email) {
              markCRAccessAcknowledged(currentUser.email);
            }
            setPortalMode('cr');
            if (typeof window !== 'undefined') {
              window.location.hash = 'cr';
            }
          }}
          onContinueStudentPortal={() => {
            setShowCRAccessModal(false);
            if (currentUser?.email) {
              markCRAccessAcknowledged(currentUser.email);
            }
          }}
        />
      </div>
    </div>
  );
}
