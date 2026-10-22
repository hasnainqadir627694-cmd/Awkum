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
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  StudentProfile,
  ScheduleItem,
  DocumentItem,
  AssignmentItem,
  NoticeItem,
} from '../../data/portalData';
import { TabType } from '../common/BottomNav';

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
}) => {
  const firstName = student.name.split(' ')[0];

  return (
    <div className="space-y-4 pb-20">
      {/* Friendly Greeting Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
            Good Morning, {firstName}
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            Let's make today productive.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF9F1] border border-[#E6D8C7] rounded-full text-[11px] font-semibold text-[#668064]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#668064] animate-ping" />
          <span>Fall 2026</span>
        </div>
      </div>

      {/* Prominent Next Class Card (Dark Espresso) */}
      {nextClass ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#3D2719] via-[#493222] to-[#2B1B11] text-[#FFF9F1] rounded-2xl p-4 sm:p-5 shadow-md">
          {/* Subtle architectural background pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            {/* Top Row: Label & Countdown pill */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-[#E6D8C7]" />
                </div>
                <span className="text-xs font-semibold tracking-wider uppercase text-[#E6D8C7]">
                  Next Class
                </span>
              </div>
              {nextClass.startsIn && (
                <span className="px-2.5 py-0.5 bg-[#668064] text-white text-[11px] font-bold rounded-full shadow-xs">
                  Starts in {nextClass.startsIn}
                </span>
              )}
            </div>

            {/* Middle: Subject Name & Meta */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#FFF9F1]">
                  {nextClass.subjectName}
                </h3>
                <p className="text-xs text-[#E6D8C7]/90 font-medium mt-0.5">
                  {nextClass.teacher}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                <Code2 className="w-5 h-5 text-[#FFF9F1]" />
              </div>
            </div>

            {/* Details: Time & Room */}
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-white/10 text-xs text-[#E6D8C7]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 opacity-80" />
                <span>{nextClass.time}</span>
              </div>
              <span className="text-white/40">·</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 opacity-80" />
                <span>{nextClass.room}</span>
              </div>
            </div>

            {/* Bottom action button */}
            <button
              onClick={() => onChangeTab('schedule')}
              className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white/15 hover:bg-white/20 active:scale-[0.99] rounded-xl text-xs font-semibold text-[#FFF9F1] transition-colors"
            >
              <span>View Full Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 text-center">
          <Calendar className="w-6 h-6 text-[#806A56] mx-auto mb-1.5" />
          <h4 className="text-xs font-bold text-[#38271C]">No more classes today!</h4>
          <p className="text-[11px] text-[#806A56] mt-0.5">
            You are free for the rest of the day or can catch up on assignments.
          </p>
        </div>
      )}

      {/* Class Representative Access Card (Matching Reference Screen 04: Below Next Class) */}
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
                  {assignedClass || 'BSCS 3A'}
                </span>
              </div>
              <p className="text-xs text-[#806A56] truncate mt-0.5">
                Manage Attendance & Class Activities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-[#493222]">
            <ChevronRight className="w-5 h-5 text-[#806A56] group-hover:text-[#493222] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      )}

      {/* Metrics Grid (4 Clean Rounded Cards matching reference Screen 02) */}
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
              New Uploads
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

        {/* Card 3: Pending Tasks */}
        <div
          onClick={() => onChangeTab('assignments')}
          className="bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] rounded-2xl p-3.5 transition-all shadow-xs cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#806A56]">
              Pending Tasks
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

        {/* Card 4: Total Classes */}
        <div
          onClick={() => onChangeTab('classes')}
          className="bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] rounded-2xl p-3.5 transition-all shadow-xs cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#806A56]">
              Total Classes
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#F8F0E5] text-[#493222] flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#38271C] tracking-tight">
              6
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#806A56] mt-1">
            This Semester
          </p>
        </div>
      </div>

      {/* Today's Schedule Overview */}
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
            <span>See all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

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
                    {item.room}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#806A56]" />
            </div>
          ))}
        </div>
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
