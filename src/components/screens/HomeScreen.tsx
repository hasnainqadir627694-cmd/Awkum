import React from 'react';
import {
  Clock,
  MapPin,
  TrendingUp,
  FileText,
  CheckSquare,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Code2,
  Calendar,
  AlertCircle,
  Download,
  ShieldCheck,
  Radio,
  Timer,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  StudentProfile,
  ScheduleItem,
  DocumentItem,
  AssignmentItem,
  NoticeItem,
} from '../../data/portalData';
import { TabType } from '../common/BottomNav';
import {
  LiveScheduleState,
  ScheduledClassOccurrence,
} from '../../lib/scheduleEngine';

interface HomeScreenProps {
  student: StudentProfile;
  nextClass: ScheduleItem | undefined;
  todaySchedule: ScheduleItem[];
  recentDocuments: DocumentItem[];
  dueSoonAssignments: AssignmentItem[];
  notices: NoticeItem[];
  onChangeTab: (tab: TabType) => void;
  onOpenDocument: (doc: DocumentItem) => void;
  onOpenAssignment: (asg: AssignmentItem) => void;
  overallAttendancePercentage: number;
  presentDaysCount: number;
  totalDaysCount: number;
  isCR?: boolean;
  assignedClass?: string;
  onOpenCRPanel?: () => void;
  totalSubjectsCount?: number;
  liveScheduleState?: LiveScheduleState | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  student,
  nextClass,
  todaySchedule,
  recentDocuments,
  dueSoonAssignments,
  notices,
  onChangeTab,
  onOpenDocument,
  onOpenAssignment,
  overallAttendancePercentage,
  presentDaysCount,
  totalDaysCount,
  isCR,
  assignedClass,
  onOpenCRPanel,
  totalSubjectsCount = 0,
  liveScheduleState,
}) => {
  const cleanFullName = student.name && !student.name.includes('@')
    ? student.name
    : (student.email ? student.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\d+/g, '').trim() : 'Student');
  const firstName = (cleanFullName.split(' ')[0] || 'Student').replace(/\b\w/g, (c) => c.toUpperCase());

  const currentClass = liveScheduleState?.currentClass;
  const activeNextClass = liveScheduleState?.nextClass;
  const countdown = liveScheduleState?.countdown;
  const todayOccurrences = liveScheduleState?.todayClasses || [];

  return (
    <div className="space-y-4 pb-20">
      {/* Friendly Greeting Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
            Good Morning, {firstName}
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            Department of Computer Science & Software Engineering
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF9F1] border border-[#E6D8C7] rounded-full text-[11px] font-semibold text-[#668064]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#668064] animate-ping" />
          <span>Fall 2026</span>
        </div>
      </div>

      {/* 1. ACTIVE CLASS IN PROGRESS CARD */}
      {currentClass ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#2E1F14] via-[#493222] to-[#24170E] text-[#FFF9F1] rounded-2xl p-4 sm:p-5 shadow-lg border border-[#668064]/40">
          <div className="relative z-10 space-y-3">
            {/* Top Bar: Pulsing LIVE badge + Countdown */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#668064] text-white text-[11px] font-bold rounded-full shadow-xs tracking-wide">
                  <Radio className="w-3 h-3 animate-pulse" />
                  CLASS IN PROGRESS
                </span>
                <span className="text-[11px] text-[#E6D8C7] font-medium hidden sm:inline">
                  {currentClass.startTime} – {currentClass.endTime}
                </span>
              </div>
              {countdown && (
                <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-lg border border-white/10 text-xs font-mono font-bold text-[#E6D8C7]">
                  <Timer className="w-3.5 h-3.5 text-[#668064]" />
                  <span>Ends in {countdown.formatted}</span>
                </div>
              )}
            </div>

            {/* Subject & Instructor */}
            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold tracking-widest text-[#E6D8C7]/80 uppercase">
                  {currentClass.subjectCode}
                </span>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#FFF9F1] truncate">
                  {currentClass.subjectName}
                </h3>
                <p className="text-xs text-[#E6D8C7]/90 font-medium mt-0.5">
                  {currentClass.teacherName || 'Faculty Instructor'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                <Code2 className="w-5 h-5 text-[#FFF9F1]" />
              </div>
            </div>

            {/* Progress Bar */}
            {countdown && (
              <div className="space-y-1">
                <div className="w-full bg-white/15 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#668064] h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.min(100, Math.max(2, countdown.progressPercentage))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#E6D8C7]/80">
                  <span>Started {currentClass.startTime}</span>
                  <span>{Math.round(countdown.progressPercentage)}% completed</span>
                  <span>Ends {currentClass.endTime}</span>
                </div>
              </div>
            )}

            {/* Location & Details */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-[#E6D8C7]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 opacity-80" />
                <span>{currentClass.room || 'Department Hall'}</span>
              </div>
              <button
                onClick={() => onChangeTab('schedule')}
                className="flex items-center gap-1 hover:text-white font-semibold transition-colors text-xs"
              >
                <span>Full Timetable</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : activeNextClass ? (
        /* 2. NEXT CLASS UPCOMING CARD */
        <div className="relative overflow-hidden bg-gradient-to-br from-[#3D2719] via-[#493222] to-[#2B1B11] text-[#FFF9F1] rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-[#E6D8C7]" />
                </div>
                <span className="text-xs font-semibold tracking-wider uppercase text-[#E6D8C7]">
                  {liveScheduleState?.state === 'break' ? 'Break · Next Class' : 'Next Class Today'}
                </span>
              </div>
              {countdown && (
                <span className="px-2.5 py-0.5 bg-[#668064] text-white text-[11px] font-bold rounded-full shadow-xs">
                  Starts in {countdown.formatted}
                </span>
              )}
            </div>

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#E6D8C7]/80 uppercase">
                  {activeNextClass.subjectCode}
                </span>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#FFF9F1]">
                  {activeNextClass.subjectName}
                </h3>
                <p className="text-xs text-[#E6D8C7]/90 font-medium mt-0.5">
                  {activeNextClass.teacherName || 'Faculty Instructor'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                <Code2 className="w-5 h-5 text-[#FFF9F1]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10 text-xs text-[#E6D8C7]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 opacity-80" />
                <span>{activeNextClass.startTime} - {activeNextClass.endTime}</span>
              </div>
              <span className="text-white/40">·</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 opacity-80" />
                <span>{activeNextClass.room || 'Department Lecture Hall'}</span>
              </div>
            </div>

            <button
              onClick={() => onChangeTab('schedule')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white/15 hover:bg-white/20 active:scale-[0.99] rounded-xl text-xs font-semibold text-[#FFF9F1] transition-colors"
            >
              <span>View Full Weekly Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* 3. NO MORE CLASSES TODAY OR NO SCHEDULE */
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 text-center">
          <Calendar className="w-6 h-6 text-[#806A56] mx-auto mb-1.5" />
          <h4 className="text-xs font-bold text-[#38271C]">
            {liveScheduleState?.state === 'completed_today'
              ? "All today's classes completed!"
              : liveScheduleState?.state === 'no_classes_today'
              ? 'No classes scheduled for today'
              : 'Class Timetable'}
          </h4>
          <p className="text-[11px] text-[#806A56] mt-0.5">
            {liveScheduleState?.state === 'completed_today'
              ? 'Great job today. You can catch up on course notes or pending assignments.'
              : liveScheduleState?.state === 'no_classes_today'
              ? 'Enjoy your free day or prepare for upcoming lectures.'
              : 'Check the weekly schedule tab for published lecture timings.'}
          </p>
        </div>
      )}

      {/* Class Representative Access Card */}
      {isCR && onOpenCRPanel && (
        <div
          onClick={onOpenCRPanel}
          className="p-4 bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#493222]/30 hover:border-[#493222] rounded-2xl shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] group animate-in fade-in"
          role="button"
          tabIndex={0}
          aria-label="Open Class Representative Panel"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#493222] text-[#FFF9F1] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#38271C] tracking-tight">
                  CR Panel
                </h3>
                <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full shrink-0">
                  {assignedClass || 'BSSE 1A'}
                </span>
              </div>
              <p className="text-xs text-[#806A56] truncate mt-0.5">
                Manage Attendance & Weekly Timetable
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-[#493222]">
            <ChevronRight className="w-5 h-5 text-[#806A56] group-hover:text-[#493222] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Attendance */}
        <div
          onClick={() => onChangeTab('progress')}
          className="bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] rounded-2xl p-3.5 transition-all shadow-xs cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#806A56]">
              Attendance
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#EAF2E9] text-[#668064] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#38271C] tracking-tight">
              {totalDaysCount > 0 ? `${overallAttendancePercentage}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#806A56] mt-1">
            {totalDaysCount > 0 ? `${presentDaysCount} of ${totalDaysCount} classes` : '0 sessions logged'}
          </p>
        </div>

        {/* Card 2: New Uploads */}
        <div
          onClick={() => onChangeTab('classes')}
          className="bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] rounded-2xl p-3.5 transition-all shadow-xs cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#806A56]">
              Study Materials
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#F8F0E5] text-[#493222] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#38271C] tracking-tight">
              {recentDocuments.length}
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#806A56] mt-1">
            {recentDocuments.length === 1 ? '1 file available' : `${recentDocuments.length} files available`}
          </p>
        </div>

        {/* Card 3: Pending Assignments */}
        <div
          onClick={() => onChangeTab('assignments')}
          className="bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] rounded-2xl p-3.5 transition-all shadow-xs cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#806A56]">
              Pending Assignments
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FDE8E4] text-[#C84B31] flex items-center justify-center">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#38271C] tracking-tight">
              {dueSoonAssignments.length}
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#806A56] mt-1">
            {dueSoonAssignments.length === 0 ? 'All caught up' : 'Due this week'}
          </p>
        </div>

        {/* Card 4: Total Classes / Configured Subjects */}
        <div
          onClick={() => onChangeTab('classes')}
          className="bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] rounded-2xl p-3.5 transition-all shadow-xs cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#806A56]">
              Curriculum Courses
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#F8F0E5] text-[#493222] flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#38271C] tracking-tight">
              {totalSubjectsCount}
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#806A56] mt-1">
            {totalSubjectsCount === 1 ? '1 Subject Configured' : `${totalSubjectsCount} Subjects Configured`}
          </p>
        </div>
      </div>

      {/* Today's Schedule Overview with Real Statuses */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#493222]" />
            <h3 className="text-xs font-bold text-[#38271C] uppercase tracking-wider">
              Today's Schedule
            </h3>
          </div>
          <button
            onClick={() => onChangeTab('schedule')}
            className="text-xs font-semibold text-[#806A56] hover:text-[#493222] flex items-center gap-1"
          >
            <span>Weekly view</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayOccurrences.length > 0 ? (
          <div className="space-y-2">
            {todayOccurrences.map((occ) => {
              const isCurrent = currentClass?.occurrenceId === occ.occurrenceId;
              const isNext = activeNextClass?.occurrenceId === occ.occurrenceId;

              return (
                <div
                  key={occ.occurrenceId}
                  onClick={() => onChangeTab('schedule')}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    occ.isCancelled
                      ? 'bg-rose-50/60 border-rose-200 opacity-75'
                      : isCurrent
                      ? 'bg-[#493222] text-[#FFF9F1] border-[#493222] shadow-xs'
                      : isNext
                      ? 'bg-white border-[#668064] ring-1 ring-[#668064]/30'
                      : 'bg-white border-[#E6D8C7] hover:border-[#493222]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                        isCurrent
                          ? 'bg-white/20 text-[#FFF9F1]'
                          : 'bg-[#F8F0E5] text-[#493222]'
                      }`}
                    >
                      {occ.startTime}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4
                          className={`text-xs font-bold truncate ${
                            occ.isCancelled
                              ? 'line-through text-rose-700'
                              : isCurrent
                              ? 'text-[#FFF9F1]'
                              : 'text-[#38271C]'
                          }`}
                        >
                          {occ.subjectName}
                        </h4>
                        {occ.isCancelled && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                            Cancelled
                          </span>
                        )}
                        {occ.isRescheduled && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Rescheduled
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-bold bg-[#668064] text-white px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                        {isNext && (
                          <span className="text-[10px] font-bold bg-[#EAF2E9] text-[#668064] px-1.5 py-0.5 rounded">
                            Next
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate ${
                          isCurrent ? 'text-[#E6D8C7]' : 'text-[#806A56]'
                        }`}
                      >
                        {occ.room || 'Main Hall'} · {occ.teacherName || 'Faculty'}
                        {occ.cancelReason && ` · Note: ${occ.cancelReason}`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 ${
                      isCurrent ? 'text-[#E6D8C7]' : 'text-[#806A56]'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        ) : todaySchedule.length > 0 ? (
          <div className="space-y-2">
            {todaySchedule.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => onChangeTab('schedule')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E6D8C7] hover:border-[#493222] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-[#493222] bg-[#F8F0E5] px-2 py-1 rounded-lg shrink-0">
                    {item.startTime}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#38271C]">
                      {item.subjectName}
                    </h4>
                    <p className="text-[11px] text-[#806A56]">
                      {item.room} · {item.teacher}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#806A56]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[#806A56] bg-white/50 rounded-xl border border-dashed border-[#E6D8C7]">
            No class occurrences scheduled for today.
          </div>
        )}
      </div>

      {/* Due Soon Assignments */}
      {dueSoonAssignments.length > 0 && (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-[#C84B31]" />
              <h3 className="text-xs font-bold text-[#38271C] uppercase tracking-wider">
                Assignments Due Soon
              </h3>
            </div>
            <button
              onClick={() => onChangeTab('assignments')}
              className="text-xs font-semibold text-[#806A56] hover:text-[#493222] flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {dueSoonAssignments.map((asg) => (
              <div
                key={asg.id}
                onClick={() => onOpenAssignment(asg)}
                className="p-3 bg-white border border-[#E6D8C7] rounded-xl hover:border-[#493222] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-[#806A56] uppercase tracking-wide">
                      {asg.subjectName}
                    </span>
                    <h4 className="text-xs font-bold text-[#38271C] line-clamp-1">
                      {asg.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#C84B31] bg-[#FDE8E4] px-2 py-0.5 rounded-full shrink-0">
                    Due {asg.dueDate.split(',')[0]}
                  </span>
                </div>
                <p className="text-[11px] text-[#806A56] line-clamp-1 mt-1">
                  {asg.questionPreview}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Published Documents */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#493222]" />
            <h3 className="text-xs font-bold text-[#38271C] uppercase tracking-wider">
              Recent Class Materials
            </h3>
          </div>
          <button
            onClick={() => onChangeTab('classes')}
            className="text-xs font-semibold text-[#806A56] hover:text-[#493222] flex items-center gap-1"
          >
            <span>Browse Classes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {recentDocuments.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#806A56] italic bg-white/50 rounded-xl border border-dashed border-[#E6D8C7]">
              No study materials uploaded yet for this semester. Files uploaded by your teachers will appear here.
            </div>
          ) : (
            recentDocuments.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                className="flex items-center justify-between p-2.5 bg-white border border-[#E6D8C7] rounded-xl hover:border-[#493222] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FDE8E4] text-[#C84B31] flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                    {doc.fileType}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#38271C] line-clamp-1 group-hover:text-[#493222]">
                      {doc.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-[#806A56] mt-0.5">
                      <span>{doc.subjectName}</span>
                      <span>·</span>
                      <span>{doc.fileSize}</span>
                      <span>·</span>
                      <span>{doc.uploadDate}</span>
                    </div>
                  </div>
                </div>
                <div className="p-1.5 text-[#806A56] group-hover:text-[#493222]">
                  <Download className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* University Announcement Notice */}
      {notices[0] && (
        <div className="p-3.5 bg-[#FFF9F1] border-l-4 border-[#493222] border-y border-r border-[#E6D8C7] rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#493222] shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#38271C]">
                  {notices[0].title}
                </h4>
                {notices[0].urgent && (
                  <span className="text-[9px] font-bold text-[#C84B31] bg-[#FDE8E4] px-1.5 py-0.2 rounded">
                    Official
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#806A56] mt-0.5 line-clamp-2">
                {notices[0].content}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
