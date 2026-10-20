import React from 'react';
import { Calendar, BookOpen, Home, ClipboardCheck, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';

export type TabType = 'home' | 'schedule' | 'classes' | 'assignments' | 'progress';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingAssignmentsCount: number;
  isDeviceFrame?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  pendingAssignmentsCount,
  isDeviceFrame = false,
}) => {
  const tabs = [
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'classes' as TabType, label: 'Classes', icon: BookOpen },
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'assignments' as TabType, label: 'Tasks', icon: ClipboardCheck, badge: pendingAssignmentsCount },
    { id: 'progress' as TabType, label: 'Progress', icon: BarChart2 },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 select-none transition-all ${
        isDeviceFrame ? 'max-w-md mx-auto' : 'w-full'
      }`}
    >
      <div className="w-full bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E5D7C3] shadow-[0_-4px_20px_rgba(56,39,28,0.06)] px-2 sm:px-4 py-1.5">
        <div className="flex items-center justify-around max-w-lg mx-auto h-14">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => onChangeTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer group ${
                  isActive ? 'text-[#38271C]' : 'text-[#7A624E] hover:text-[#38271C]'
                }`}
                aria-label={tab.label}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-all duration-200 ${
                      isActive
                        ? 'text-[#38271C] stroke-[2.2] scale-105'
                        : 'text-[#6D5441] group-hover:text-[#38271C] stroke-[1.8]'
                    }`}
                  />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#C84B31] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs border border-[#FFFDF9]">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] tracking-tight mt-1 transition-all ${
                    isActive
                      ? 'text-[#38271C] font-bold'
                      : 'text-[#6D5441] font-medium group-hover:text-[#38271C]'
                  }`}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
