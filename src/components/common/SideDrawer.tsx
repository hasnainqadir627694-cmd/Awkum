import React from 'react';
import {
  Bell,
  User,
  Settings,
  HelpCircle,
  LogOut,
  X,
  Database,
  Phone,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AwkumEmblem } from './AwkumLogo';
import { StudentProfile } from '../../data/portalData';
import { TabType } from './BottomNav';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: TabType;
  onChangeTab?: (tab: TabType) => void;
  student: StudentProfile;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  student,
  unreadCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenSettings,
  onOpenHelp,
  onLogout,
}) => {
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
            className="relative w-80 max-w-[85vw] bg-[#FFF9F1] border-r border-[#E6D8C7] flex flex-col h-full z-10 shadow-2xl"
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
                  <img
                    src={student.avatarUrl}
                    alt={student.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#493222] shadow-sm"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-[#668064] text-white rounded-full ring-2 ring-[#FFF9F1]">
                    <ShieldCheck className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[#38271C] text-sm leading-tight">
                    {student.name}
                  </span>
                  <span className="text-xs font-semibold text-[#806A56] tracking-wide mt-0.5">
                    {student.id}
                  </span>
                  <span className="text-[11px] text-[#668064] font-medium">
                    {student.program} · Sem {student.semester.charAt(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Non-duplicate Drawer Navigation */}
            <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4">
              {/* SECTION 1: ACCOUNT & ALERTS */}
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

              {/* SECTION 2: SYSTEM & PREFERENCES */}
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
                </div>
              </div>

              {/* SECTION 3: UNIVERSITY SUPPORT CONTACTS CARD */}
              <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl shadow-xs space-y-2">
                <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
                  Department & Class Representative
                </span>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#38271C]">CR Usman Khan</span>
                    <span className="text-[11px] text-[#668064] font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3" /> +92 333 5556677
                    </span>
                  </div>
                  <p className="text-[11px] text-[#806A56]">
                    CS Dept · Garden Campus, Mardan
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
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#C84B31] hover:bg-[#FDE8E4] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout of AWKUM ClassHub</span>
                </motion.button>
              </div>
            </nav>

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
