import React, { useState } from 'react';
import {
  Home,
  Calendar,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Bell,
  User,
  Settings,
  HelpCircle,
  LogOut,
  X,
  Database,
  Phone,
  Shield,
  ShieldCheck,
  ChevronRight,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AwkumEmblem } from './AwkumLogo';
import { StudentProfile } from '../../data/portalData';
import { TabType } from './BottomNav';
import { PWAInstallModal } from './PWAInstallModal';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: TabType;
  onChangeTab?: (tab: TabType) => void;
  student: StudentProfile;
  unreadCount: number;
  pendingAssignmentsCount?: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
  isCR?: boolean;
  assignedClass?: string;
  onOpenCRPanel?: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  activeTab = 'home',
  onChangeTab,
  student,
  unreadCount,
  pendingAssignmentsCount = 0,
  onOpenNotifications,
  onOpenProfile,
  onOpenSettings,
  onOpenHelp,
  onLogout,
  isCR = false,
  assignedClass,
  onOpenCRPanel,
}) => {
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleNavTab = (tab: TabType) => {
    if (onChangeTab) {
      onChangeTab(tab);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop with smooth fade transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer sidebar with smooth spring slide transition */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 300,
              mass: 0.8,
            }}
            className="relative w-84 max-w-[85vw] bg-[#FFF9F1] border-r border-[#E6D8C7] flex flex-col h-full z-10 shadow-2xl"
          >
            {/* Close Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-3 p-1.5 text-[#806A56] hover:text-[#38271C] hover:bg-[#F3E9DD] rounded-full transition-colors z-20 cursor-pointer"
              aria-label="Close Menu"
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* Student Profile Header */}
            <div className="p-5 border-b border-[#E6D8C7] bg-[#F8F0E5]/70">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {student.avatarUrl && !student.avatarUrl.includes('images.unsplash.com') ? (
                    <img
                      src={student.avatarUrl}
                      alt={student.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#493222] shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#493222] text-[#FFF9F1] flex items-center justify-center font-bold text-base border-2 border-[#493222] shadow-sm">
                      {student.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-[#668064] text-white rounded-full ring-2 ring-[#FFF9F1]">
                    <ShieldCheck className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="font-bold text-[#38271C] text-sm leading-tight truncate">
                    {student.name}
                  </span>
                  <span className="text-xs font-semibold text-[#806A56] tracking-wide mt-0.5 font-mono truncate">
                    {student.id}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-[#668064] font-medium truncate">
                      {student.program} · Sem {student.semester.charAt(0)}
                    </span>
                    {isCR && (
                      <span className="px-1.5 py-0.2 bg-[#493222] text-[#FFF9F1] text-[9px] font-bold rounded-sm">
                        CR
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Scrollable Navigation Body */}
            <nav className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-4">
              {/* SECTION 1: ACADEMIC PORTAL NAVIGATION */}
              <div>
                <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#806A56]/80 block mb-1.5">
                  Academic Portal
                </span>
                <div className="space-y-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavTab('home')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'home'
                        ? 'bg-[#EFE3D3] text-[#38271C] font-bold'
                        : 'text-[#38271C] hover:bg-[#F3E9DD]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'home' ? 'bg-[#493222] text-[#FFF9F1]' : 'bg-[#EFE3D3] text-[#493222]'}`}>
                        <Home className="w-4 h-4" />
                      </div>
                      <span>Dashboard Overview</span>
                    </div>
                    {activeTab === 'home' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#493222]" />
                    )}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavTab('schedule')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'schedule'
                        ? 'bg-[#EFE3D3] text-[#38271C] font-bold'
                        : 'text-[#38271C] hover:bg-[#F3E9DD]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'schedule' ? 'bg-[#493222] text-[#FFF9F1]' : 'bg-[#EFE3D3] text-[#493222]'}`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span>Class Timetable & Schedule</span>
                    </div>
                    {activeTab === 'schedule' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#493222]" />
                    )}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavTab('classes')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'classes'
                        ? 'bg-[#EFE3D3] text-[#38271C] font-bold'
                        : 'text-[#38271C] hover:bg-[#F3E9DD]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'classes' ? 'bg-[#493222] text-[#FFF9F1]' : 'bg-[#EFE3D3] text-[#493222]'}`}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span>Enrolled Subjects & Classes</span>
                    </div>
                    {activeTab === 'classes' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#493222]" />
                    )}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavTab('assignments')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'assignments'
                        ? 'bg-[#EFE3D3] text-[#38271C] font-bold'
                        : 'text-[#38271C] hover:bg-[#F3E9DD]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'assignments' ? 'bg-[#493222] text-[#FFF9F1]' : 'bg-[#EFE3D3] text-[#493222]'}`}>
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <span>Assignments & Tasks</span>
                    </div>
                    {pendingAssignmentsCount > 0 ? (
                      <span className="px-2 py-0.5 bg-[#C84B31] text-white text-[10px] font-bold rounded-full">
                        {pendingAssignmentsCount} todo
                      </span>
                    ) : (
                      activeTab === 'assignments' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#493222]" />
                      )
                    )}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavTab('progress')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'progress'
                        ? 'bg-[#EFE3D3] text-[#38271C] font-bold'
                        : 'text-[#38271C] hover:bg-[#F3E9DD]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${activeTab === 'progress' ? 'bg-[#493222] text-[#FFF9F1]' : 'bg-[#EFE3D3] text-[#493222]'}`}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span>Attendance & Progress Record</span>
                    </div>
                    {activeTab === 'progress' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#493222]" />
                    )}
                  </motion.button>
                </div>
              </div>

              {/* SECTION 2: ACCOUNT & ALERTS */}
              <div>
                <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#806A56]/80 block mb-1.5">
                  Account & Alerts
                </span>
                <div className="space-y-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onOpenProfile();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F3E9DD] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-[#EFE3D3] text-[#493222]">
                        <User className="w-4 h-4" />
                      </div>
                      <span>Student Profile & Record</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#806A56]" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onOpenNotifications();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F3E9DD] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-[#EFE3D3] text-[#493222]">
                        <Bell className="w-4 h-4" />
                      </div>
                      <span>Notifications & Alerts</span>
                    </div>
                    {unreadCount > 0 ? (
                      <span className="px-2 py-0.5 bg-[#C84B31] text-white text-[10px] font-bold rounded-full">
                        {unreadCount} new
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#806A56]" />
                    )}
                  </motion.button>
                </div>
              </div>

              {/* SECTION 3: SYSTEM & PREFERENCES */}
              <div>
                <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#806A56]/80 block mb-1.5">
                  Settings & Services
                </span>
                <div className="space-y-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onOpenSettings();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F3E9DD] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-[#EFE3D3] text-[#493222]">
                        <Settings className="w-4 h-4" />
                      </div>
                      <span>Portal Preferences</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#806A56]" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onOpenProfile();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F3E9DD] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-[#EFE3D3] text-[#493222]">
                        <Database className="w-4 h-4" />
                      </div>
                      <span>Cloud & Firebase Status</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#668064]">
                      Online
                    </span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onOpenHelp();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F3E9DD] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-[#EFE3D3] text-[#493222]">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <span>Help & Department Support</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#806A56]" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowInstallModal(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#38271C] hover:bg-[#F3E9DD] transition-colors bg-[#EFE3D3]/40 border border-[#E6D8C7]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-[#493222] text-[#FFF9F1]">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold">Download Mobile App</span>
                        <span className="text-[10px] text-[#806A56]">Install PWA on phone / home screen</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#EAF2E9] text-[#668064] px-2 py-0.5 rounded-full font-bold">
                      Ready
                    </span>
                  </motion.button>
                </div>
              </div>

              {/* SECTION 4: CLASS REPRESENTATIVE (CR) PANEL ENTRY */}
              {/* Positioned at the bottom of the navigation menu, separated by a clean divider */}
              {isCR && onOpenCRPanel && (
                <div className="pt-2">
                  <div className="border-t border-[#E6D8C7] pt-3 pb-1">
                    <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#806A56] block mb-2">
                      Class Representative Workspace
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onOpenCRPanel();
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold text-[#FFF9F1] bg-[#493222] hover:bg-[#38271C] transition-all shadow-md group cursor-pointer border border-[#38271C] active:scale-98"
                      aria-label="Open Class Representative Control Panel"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30 group-hover:scale-105 transition-transform shrink-0">
                          <Shield className="w-5 h-5 text-amber-300" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold tracking-wide">CR Control Panel</span>
                            <span className="text-[9px] bg-[#668064] text-white px-2 py-0.5 rounded-full font-bold">
                              CR Active
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-[#E6D8C7] block mt-0.5">
                            {assignedClass ? `Attendance & Roster · ${assignedClass}` : 'Daily Attendance & Class Management'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-300 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1" />
                    </motion.button>
                  </div>
                </div>
              )}

              {/* SECTION 5: UNIVERSITY SUPPORT CONTACTS CARD */}
              <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl shadow-xs space-y-1.5">
                <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
                  {isCR ? 'Department Advisory' : 'Department & Class Representative'}
                </span>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#38271C]">
                      {isCR ? 'Department Office' : (assignedClass ? `CR ${assignedClass}` : 'Class Representative')}
                    </span>
                    <span className="text-[11px] text-[#668064] font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3" /> +92 937 843356
                    </span>
                  </div>
                  <p className="text-[11px] text-[#806A56]">
                    Software Engineering Dept · Garden Campus, Mardan
                  </p>
                </div>
              </div>

              {/* LOGOUT */}
              <div className="pt-1">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#C84B31] hover:bg-[#FDE8E4] transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout of AWKUM ClassHub</span>
                </motion.button>
              </div>
            </nav>

            {/* PWA Modal */}
            <PWAInstallModal
              isOpen={showInstallModal}
              onClose={() => setShowInstallModal(false)}
            />

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E6D8C7] flex flex-col items-center text-center bg-[#F8F0E5]/40">
              <AwkumEmblem size={26} className="mb-1 text-[#493222]" />
              <span className="text-[11px] font-serif font-bold text-[#38271C]">
                Abdul Wali Khan University Mardan
              </span>
              <span className="text-[10px] text-[#806A56]">
                Garden Campus · Student Portal v1.0
              </span>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
