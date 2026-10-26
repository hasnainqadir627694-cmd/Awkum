import React from 'react';
import { Bell, Menu, Smartphone, Monitor, Shield } from 'lucide-react';
import { AwkumEmblem } from './AwkumLogo';
import { StudentProfile } from '../../data/portalData';

interface HeaderProps {
  student: StudentProfile;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenDrawer: () => void;
  isDeviceFrame: boolean;
  onToggleDeviceFrame: () => void;
  isCR?: boolean;
  onOpenCRPanel?: () => void;
  assignedClass?: string;
}

export const Header: React.FC<HeaderProps> = ({
  student,
  unreadCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenDrawer,
  isDeviceFrame,
  onToggleDeviceFrame,
  isCR = false,
  onOpenCRPanel,
  assignedClass,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6D8C7] px-4 py-2.5 transition-all">
      <div className="flex items-center justify-between max-w-5xl mx-auto gap-2">
        {/* Left: Menu trigger & AWKUM Brand */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenDrawer}
            className="p-1.5 -ml-1 text-[#493222] hover:bg-[#F3E9DD] rounded-lg transition-colors active:scale-95"
            aria-label="Open Navigation Menu"
            title="Menu"
          >
            <Menu className="w-5 h-5 text-[#493222]" />
          </button>

          <div
            onClick={onOpenDrawer}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <AwkumEmblem size={34} className="group-hover:scale-105 transition-transform" />
            <div className="flex flex-col leading-tight">
              <span className="font-serif font-bold text-sm tracking-wide text-[#38271C]">
                AWKUM
              </span>
              <span className="text-[10px] font-medium text-[#806A56]">
                Student Portal
              </span>
            </div>
          </div>
        </div>

        {/* Center: CR Panel Switcher (Visible on the top bar when CR role is granted) */}
        {isCR && (
          <div className="flex-1 flex justify-center items-center px-1">
            <button
              type="button"
              onClick={onOpenCRPanel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 border border-[#38271C] group cursor-pointer animate-fade-in"
              title={`Switch to Class Representative (CR) Management Panel (${assignedClass || 'Active CR'})`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="tracking-wide uppercase font-extrabold text-[11px] sm:text-xs">CR PANEL</span>
              {assignedClass && (
                <span className="hidden xs:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#38271C] text-[#D8C7B4] border border-[#5A4130]">
                  {assignedClass}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Right: Viewport toggle + Notifications + Profile Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Viewport Frame Mode Toggle (Hidden on actual tiny mobile screens) */}
          <button
            onClick={onToggleDeviceFrame}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#806A56] hover:text-[#38271C] bg-[#F8F0E5] hover:bg-[#EFE3D3] border border-[#E6D8C7] rounded-full transition-colors"
            title={isDeviceFrame ? 'Switch to Full Browser View' : 'Switch to Mobile Phone View'}
          >
            {isDeviceFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-[#493222]" />
                <span>Full View</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#493222]" />
                <span>Phone View</span>
              </>
            )}
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-[#493222] hover:bg-[#F3E9DD] rounded-full transition-colors active:scale-95"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-[#C84B31] rounded-full ring-2 ring-[#FFFDF9] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Student Avatar */}
          <button
            onClick={onOpenProfile}
            className="relative flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full hover:bg-[#F3E9DD] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#493222]"
            aria-label="Open Student Profile"
          >
            {student.avatarUrl && !student.avatarUrl.includes('images.unsplash.com') ? (
              <img
                src={student.avatarUrl}
                alt={student.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#493222]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#493222] text-[#FFF9F1] flex items-center justify-center font-bold text-xs border border-amber-400/40 shrink-0">
                {(student.name && !student.name.includes('@') ? student.name : 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden md:inline-block text-xs font-semibold text-[#38271C]">
              {(student.name && !student.name.includes('@') ? student.name : student.email ? student.email.split('@')[0] : 'Student').split(' ')[0]}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
