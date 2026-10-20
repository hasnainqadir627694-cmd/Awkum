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
  const isHomeActive = activeTab === 'home';

  return (
    <nav
      aria-label="Bottom Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 select-none transition-all ${
        isDeviceFrame ? 'max-w-md mx-auto' : 'w-full'
      }`}
    >
      <div className="relative w-full h-[88px] sm:h-[92px]">
        {/* Sculpted SVG Background with Up-Swooping Ends & Center Home Dome */}
        <div className="absolute inset-0 pointer-events-none">
          <svg
            viewBox="0 0 400 92"
            preserveAspectRatio="none"
            className="w-full h-full drop-shadow-[0_-6px_16px_rgba(56,39,28,0.07)]"
          >
            {/* Base Fill */}
            <path
              d="M 0,14 C 0,38 16,46 42,46 L 155,46 C 168,46 176,10 200,10 C 224,10 232,46 245,46 L 358,46 C 384,46 400,38 400,14 L 400,92 L 0,92 Z"
              fill="#FFFDF9"
            />
            {/* Rich Espresso Sculpted Contour Stroke */}
            <path
              d="M 0,14 C 0,38 16,46 42,46 L 155,46 C 168,46 176,10 200,10 C 224,10 232,46 245,46 L 358,46 C 384,46 400,38 400,14"
              fill="none"
              stroke="#493222"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 5-Tab Navigation Actions Layer */}
        <div className="relative z-10 w-full h-full flex items-end justify-between px-3 pb-2 sm:pb-3">
          {/* 1. Schedule */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onChangeTab('schedule')}
            className="flex-1 flex flex-col items-center justify-center pb-1 group cursor-pointer"
          >
            <div className="relative p-1">
              <Calendar
                className={`w-5 h-5 transition-transform ${
                  activeTab === 'schedule'
                    ? 'text-[#38271C] stroke-[2.3] scale-105'
                    : 'text-[#5A4332] group-hover:text-[#38271C] stroke-[1.8]'
                }`}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                activeTab === 'schedule'
                  ? 'text-[#38271C] font-bold'
                  : 'text-[#6D5441] font-medium'
              }`}
            >
              Schedule
            </span>
          </motion.button>

          {/* 2. Classes */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onChangeTab('classes')}
            className="flex-1 flex flex-col items-center justify-center pb-1 group cursor-pointer"
          >
            <div className="relative p-1">
              <BookOpen
                className={`w-5 h-5 transition-transform ${
                  activeTab === 'classes'
                    ? 'text-[#38271C] stroke-[2.3] scale-105'
                    : 'text-[#5A4332] group-hover:text-[#38271C] stroke-[1.8]'
                }`}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                activeTab === 'classes'
                  ? 'text-[#38271C] font-bold'
                  : 'text-[#6D5441] font-medium'
              }`}
            >
              Classes
            </span>
          </motion.button>

          {/* 3. Center Elevated Home Button inside Sculpted Cradle */}
          <div className="relative flex-1 flex flex-col items-center justify-end pb-1">
            <div className="absolute -top-3 sm:-top-3.5 flex flex-col items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onChangeTab('home')}
                className={`relative w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-[0_6px_18px_rgba(56,39,28,0.32)] ring-4 ring-[#FFFDF9] transition-all cursor-pointer ${
                  isHomeActive
                    ? 'bg-gradient-to-br from-[#29170D] via-[#38271C] to-[#493222]'
                    : 'bg-gradient-to-br from-[#38271C] via-[#493222] to-[#2B1B11] hover:brightness-105'
                }`}
                aria-label="Home"
              >
                {/* Top specular reflection */}
                <div className="absolute inset-x-2.5 top-1 h-3 rounded-t-full bg-white/20 blur-[0.5px] pointer-events-none" />

                <Home
                  className={`w-6 h-6 text-[#FFF9F1] transition-transform duration-200 ${
                    isHomeActive ? 'scale-105 stroke-[2.3]' : 'stroke-[2]'
                  }`}
                />
              </motion.button>

              <span
                className={`text-[10px] mt-1 font-semibold tracking-tight transition-colors ${
                  isHomeActive ? 'text-[#38271C] font-bold' : 'text-[#6D5441]'
                }`}
              >
                Home
              </span>
            </div>
          </div>

          {/* 4. Tasks (Assignments) */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onChangeTab('assignments')}
            className="flex-1 flex flex-col items-center justify-center pb-1 group cursor-pointer"
          >
            <div className="relative p-1">
              <ClipboardCheck
                className={`w-5 h-5 transition-transform ${
                  activeTab === 'assignments'
                    ? 'text-[#38271C] stroke-[2.3] scale-105'
                    : 'text-[#5A4332] group-hover:text-[#38271C] stroke-[1.8]'
                }`}
              />
              {pendingAssignmentsCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 bg-[#C84B31] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs border border-[#FFFDF9]">
                  {pendingAssignmentsCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                activeTab === 'assignments'
                  ? 'text-[#38271C] font-bold'
                  : 'text-[#6D5441] font-medium'
              }`}
            >
              Tasks
            </span>
          </motion.button>

          {/* 5. Progress */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onChangeTab('progress')}
            className="flex-1 flex flex-col items-center justify-center pb-1 group cursor-pointer"
          >
            <div className="relative p-1">
              <BarChart2
                className={`w-5 h-5 transition-transform ${
                  activeTab === 'progress'
                    ? 'text-[#38271C] stroke-[2.3] scale-105'
                    : 'text-[#5A4332] group-hover:text-[#38271C] stroke-[1.8]'
                }`}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                activeTab === 'progress'
                  ? 'text-[#38271C] font-bold'
                  : 'text-[#6D5441] font-medium'
              }`}
            >
              Progress
            </span>
          </motion.button>
        </div>
      </div>
    </nav>
  );
};
