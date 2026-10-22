import React from 'react';
import {
  CalendarCheck,
  History,
  BellRing,
  Users,
  Clock,
  ArrowRight,
  FileDown,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AttendanceSession } from '../../lib/attendanceService';
import { ScheduleItem } from '../../data/portalData';
import { downloadAttendancePDF } from '../../lib/pdfReportService';

interface CRDashboardViewProps {
  assignedClass: string;
  todaySession: AttendanceSession | null;
  totalEnrolled: number;
  recentSessions: AttendanceSession[];
  nextClass: ScheduleItem | undefined;
  onNavigateTab: (tab: 'dashboard' | 'attendance' | 'students' | 'history' | 'notify') => void;
  onNotifyTeacherClick: (classItem: ScheduleItem) => void;
}

export const CRDashboardView: React.FC<CRDashboardViewProps> = ({
  assignedClass,
  todaySession,
  totalEnrolled,
  recentSessions,
  nextClass,
  onNavigateTab,
  onNotifyTeacherClick,
}) => {
  const isRecordedToday = !!todaySession && todaySession.finalized;

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] text-[10px] font-bold rounded-md uppercase tracking-wider">
              CR Workspace
            </span>
            <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-md">
              {assignedClass}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#38271C] mt-1 tracking-tight">
            Class Representative Dashboard
          </h1>
          <p className="text-xs text-[#806A56]">
            Daily whole-class attendance and teacher notifications
          </p>
        </div>

        {/* Live sync pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E6D8C7] rounded-full text-xs font-semibold text-[#668064] self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#668064] animate-pulse" />
          <span>Roster Synchronized</span>
        </div>
      </div>

      {/* 2. Today's Attendance Status Hero Card */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 shadow-sm border transition-all ${
          isRecordedToday
            ? 'bg-gradient-to-br from-[#FFF9F1] via-[#F8F0E5] to-[#EFE3D3] border-[#C5DEC3]'
            : 'bg-gradient-to-br from-[#3D2719] via-[#493222] to-[#2B1B11] text-[#FFF9F1] border-[#38271C]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                  isRecordedToday
                    ? 'bg-[#EAF2E9] text-[#668064]'
                    : 'bg-[#C84B31] text-white animate-pulse'
                }`}
              >
                {isRecordedToday ? 'Today Finalized' : 'Attendance Pending'}
              </span>
              <span className={`text-xs ${isRecordedToday ? 'text-[#806A56]' : 'text-[#E6D8C7]'}`}>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <h2
              className={`text-lg sm:text-xl font-bold tracking-tight ${
                isRecordedToday ? 'text-[#38271C]' : 'text-[#FFF9F1]'
              }`}
            >
              {isRecordedToday
                ? `${todaySession?.presentCount} of ${todaySession?.totalEnrolled} Students Present`
                : 'Attendance has not been recorded today'}
            </h2>

            <p
              className={`text-xs mt-1 max-w-md leading-relaxed ${
                isRecordedToday ? 'text-[#806A56]' : 'text-[#E6D8C7]/80'
              }`}
            >
              {isRecordedToday
                ? `Official daily session recorded with ${todaySession?.attendancePercentage}% attendance. Printable A4 PDF report generated.`
                : `Ensure all enrolled students in ${assignedClass} are marked before 05:00 PM.`}
            </p>
          </div>

          {isRecordedToday && todaySession && (
            <button
              onClick={() => downloadAttendancePDF(todaySession)}
              className="px-3 py-2 bg-white hover:bg-[#F8F0E5] border border-[#D8C7B4] text-[#493222] rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Download PDF Report"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
          )}
        </div>

        {/* Primary Action Button inside Hero Card */}
        <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
          <button
            onClick={() => onNavigateTab('attendance')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              isRecordedToday
                ? 'bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1]'
                : 'bg-[#FFF9F1] hover:bg-white text-[#38271C]'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>{isRecordedToday ? 'Review / Amend Today' : 'Mark Today\'s Attendance Now'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Four Main Quick Actions Grid */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#806A56] block mb-2 px-1">
          Quick Actions
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Action 1: Mark Attendance */}
          <button
            onClick={() => onNavigateTab('attendance')}
            className="p-4 bg-[#FFF9F1] hover:bg-white border border-[#E6D8C7] rounded-2xl shadow-2xs text-left transition-all group cursor-pointer active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFE3D3] text-[#493222] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-[#38271C] block">Mark Attendance</span>
            <span className="text-[10px] text-[#806A56] mt-0.5 block">Whole-class session</span>
          </button>

          {/* Action 2: Class Students */}
          <button
            onClick={() => onNavigateTab('students')}
            className="p-4 bg-[#FFF9F1] hover:bg-white border border-[#E6D8C7] rounded-2xl shadow-2xs text-left transition-all group cursor-pointer active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EAF2E9] text-[#668064] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-[#38271C] block">Class Students</span>
            <span className="text-[10px] text-[#806A56] mt-0.5 block">{totalEnrolled} enrolled roster</span>
          </button>

          {/* Action 3: Notify Teacher */}
          <button
            onClick={() => onNavigateTab('notify')}
            className="p-4 bg-[#FFF9F1] hover:bg-white border border-[#E6D8C7] rounded-2xl shadow-2xs text-left transition-all group cursor-pointer active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F0F5FA] text-[#3A7BD5] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <BellRing className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-[#38271C] block">Notify Teacher</span>
            <span className="text-[10px] text-[#806A56] mt-0.5 block">Upcoming class alerts</span>
          </button>

          {/* Action 4: Attendance History */}
          <button
            onClick={() => onNavigateTab('history')}
            className="p-4 bg-[#FFF9F1] hover:bg-white border border-[#E6D8C7] rounded-2xl shadow-2xs text-left transition-all group cursor-pointer active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F8F0E5] text-[#806A56] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-[#38271C] block">Attendance History</span>
            <span className="text-[10px] text-[#806A56] mt-0.5 block">Past dates & PDFs</span>
          </button>
        </div>
      </div>

      {/* 4. Upcoming Class & Teacher Alert Card */}
      {nextClass && (
        <div className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Next Scheduled Class Today
            </span>
            {nextClass.startsIn && (
              <span className="px-2 py-0.5 bg-[#668064] text-white text-[10px] font-bold rounded-full">
                Starts in {nextClass.startsIn}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#38271C]">{nextClass.subjectName}</h3>
              <p className="text-xs text-[#806A56] mt-0.5">
                Instructor: <strong className="text-[#38271C]">{nextClass.teacher}</strong> · {nextClass.room}
              </p>
              <p className="text-[11px] text-[#806A56] font-mono mt-0.5">{nextClass.time}</p>
            </div>

            <button
              onClick={() => onNotifyTeacherClick(nextClass)}
              className="px-3.5 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Notify Teacher</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Recent Attendance Sessions Activity */}
      <div className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#806A56] uppercase tracking-wider">
            Recent Attendance Activity
          </span>
          <button
            onClick={() => onNavigateTab('history')}
            className="text-xs font-semibold text-[#493222] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#806A56] bg-white rounded-xl border border-[#E6D8C7]">
            <FileSpreadsheet className="w-7 h-7 mx-auto mb-1 text-[#806A56]/60" />
            <p className="font-semibold text-[#38271C]">No attendance recorded yet</p>
            <p className="text-[11px] text-[#806A56] mt-0.5">
              Click &quot;Mark Attendance&quot; to record today&apos;s whole-class session.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E6D8C7] bg-white rounded-xl border border-[#E6D8C7] overflow-hidden">
            {recentSessions.slice(0, 3).map((s) => (
              <div key={s.id} className="p-3 flex items-center justify-between hover:bg-[#F8F0E5] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EFE3D3] text-[#493222] flex items-center justify-center font-bold text-xs">
                    {s.dayOfWeek}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#38271C]">{s.displayDate}</span>
                      <span className="px-1.5 py-0.2 bg-[#EAF2E9] text-[#668064] text-[9px] font-bold rounded">
                        {s.attendancePercentage}%
                      </span>
                    </div>
                    <span className="text-[11px] text-[#806A56]">
                      {s.presentCount} Present · {s.absentCount} Absent
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => downloadAttendancePDF(s)}
                  className="p-1.5 text-[#493222] hover:bg-[#EFE3D3] rounded-lg transition-colors cursor-pointer"
                  title="Download Attendance PDF"
                >
                  <FileDown className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
