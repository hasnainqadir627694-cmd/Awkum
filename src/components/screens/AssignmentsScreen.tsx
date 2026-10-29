import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  ChevronRight,
  Download,
  Search,
  Lock,
} from 'lucide-react';
import { AssignmentItem, SubjectInfo } from '../../data/portalData';
import { VoiceInstructionPlayer } from '../common/VoiceInstructionPlayer';

interface AssignmentsScreenProps {
  assignments: AssignmentItem[];
  subjects: SubjectInfo[];
  onOpenAssignment: (asg: AssignmentItem) => void;
}

export const AssignmentsScreen: React.FC<AssignmentsScreenProps> = ({
  assignments,
  subjects,
  onOpenAssignment,
}) => {
  const [statusFilter, setStatusFilter] = useState<'todo' | 'submitted' | 'overdue'>('todo');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const now = Date.now();

  const isAssignmentOverdue = (item: AssignmentItem) => {
    if (item.status === 'submitted' || item.status === 'graded') return false;
    if (item.status === 'closed') return true;
    if (item.deadlineAt) {
      const deadlineEpoch = new Date(item.deadlineAt).getTime();
      if (!isNaN(deadlineEpoch)) {
        return now > deadlineEpoch;
      }
    }
    if (item.dueDate) {
      const dueEpoch = new Date(`${item.dueDate}T23:59:59`).getTime();
      if (!isNaN(dueEpoch)) {
        return now > dueEpoch;
      }
    }
    return item.status === 'overdue';
  };

  const getComputedStatus = (item: AssignmentItem): 'todo' | 'submitted' | 'overdue' => {
    if (item.status === 'submitted' || item.status === 'graded') return 'submitted';
    if (isAssignmentOverdue(item)) return 'overdue';
    return 'todo';
  };

  const filteredAssignments = assignments.filter((item) => {
    const targetSubj = subjects.find((s) => s.id === selectedSubjectId);
    const matchesSubject =
      selectedSubjectId === 'all' ||
      item.subjectId === selectedSubjectId ||
      (targetSubj && (item.subjectName === targetSubj.name || (item as any).subject === targetSubj.name));

    if (!matchesSubject) return false;

    const computedStatus = getComputedStatus(item);
    if (statusFilter !== computedStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubj = item.subjectName.toLowerCase().includes(q);
      const matchDesc = (item.description || item.questionPreview || '').toLowerCase().includes(q);
      return matchTitle || matchSubj || matchDesc;
    }

    return true;
  });

  const todoCount = assignments.filter((a) => getComputedStatus(a) === 'todo').length;
  const submittedCount = assignments.filter((a) => getComputedStatus(a) === 'submitted').length;
  const overdueCount = assignments.filter((a) => getComputedStatus(a) === 'overdue').length;

  const formatDeadlineRemaining = (item: AssignmentItem) => {
    if (item.status === 'submitted') return 'Submitted';
    if (item.status === 'graded') return `Graded: ${item.grade ?? ''}`;

    let targetDateEpoch = 0;
    if (item.deadlineAt) {
      targetDateEpoch = new Date(item.deadlineAt).getTime();
    } else if (item.dueDate) {
      targetDateEpoch = new Date(`${item.dueDate}T23:59:59`).getTime();
    }

    if (targetDateEpoch > 0) {
      const diffMs = targetDateEpoch - now;
      if (diffMs <= 0) {
        return item.allowLate ? 'Late Submissions Open' : 'Submissions Closed';
      }
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays > 1) return `Due in ${diffDays} days`;
      if (diffDays === 1) return 'Due tomorrow';
      if (diffHours > 0) return `Due in ${diffHours}h`;
      return 'Due shortly';
    }

    return `Due ${item.dueDate || 'Soon'}`;
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Title & Overview */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-[#38271C]">
            Assignments & Tasks
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            Course problem sets, homework, voice guidelines, and submissions
          </p>
        </div>
      </div>

      {/* Primary Filter Tabs: To Do / Submitted / Past Due */}
      <div className="flex items-center p-1 bg-[#EFE3D3] rounded-2xl border border-[#E6D8C7]">
        <button
          type="button"
          onClick={() => setStatusFilter('todo')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            statusFilter === 'todo'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <span>To Do</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              statusFilter === 'todo'
                ? 'bg-[#C84B31] text-white'
                : 'bg-[#E6D8C7] text-[#493222]'
            }`}
          >
            {todoCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('submitted')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            statusFilter === 'submitted'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <span>Submitted</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              statusFilter === 'submitted'
                ? 'bg-[#668064] text-white'
                : 'bg-[#E6D8C7] text-[#493222]'
            }`}
          >
            {submittedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('overdue')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            statusFilter === 'overdue'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <span>Past Due</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              statusFilter === 'overdue'
                ? 'bg-[#C84B31] text-white'
                : 'bg-[#E6D8C7] text-[#493222]'
            }`}
          >
            {overdueCount}
          </span>
        </button>
      </div>

      {/* Subject Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setSelectedSubjectId('all')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedSubjectId === 'all'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
              : 'bg-[#FFF9F1] border border-[#E6D8C7] text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          All Subjects
        </button>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => setSelectedSubjectId(sub.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedSubjectId === sub.id
                ? 'bg-[#493222] text-[#FFF9F1] shadow-2xs'
                : 'bg-[#FFF9F1] border border-[#E6D8C7] text-[#806A56] hover:text-[#38271C]'
            }`}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#806A56] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search assignments by title or topic..."
          className="w-full pl-10 pr-4 py-2 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
        />
      </div>

      {/* Assignment Cards List */}
      <div className="space-y-3">
        {filteredAssignments.length === 0 ? (
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#668064] mx-auto opacity-70" />
            <h4 className="text-sm font-bold text-[#38271C]">
              {statusFilter === 'todo'
                ? "You're all caught up!"
                : statusFilter === 'submitted'
                ? 'No submitted assignments yet'
                : 'No past due assignments'}
            </h4>
            <p className="text-xs text-[#806A56] max-w-xs mx-auto">
              {statusFilter === 'todo'
                ? 'Great job! You have no pending submissions due at this time.'
                : 'There are no assignments matching this status filter.'}
            </p>
          </div>
        ) : (
          filteredAssignments.map((asg) => {
            const isClosed = asg.status === 'closed' || (isAssignmentOverdue(asg) && !asg.allowLate);
            const isSubmitted = asg.status === 'submitted';
            const isGraded = asg.status === 'graded';
            const remainingLabel = formatDeadlineRemaining(asg);

            return (
              <div
                key={asg.id}
                onClick={() => onOpenAssignment(asg)}
                className="p-4 sm:p-5 bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] hover:border-[#D8C7B4] rounded-3xl transition-all shadow-2xs cursor-pointer group active:scale-[0.99] space-y-3"
              >
                {/* 1. Header Row: Subject, Teacher, Dynamic Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-[#493222] uppercase tracking-wide">
                        {asg.subjectName}
                      </span>
                      <span className="text-[#806A56] text-xs">·</span>
                      <span className="text-xs text-[#806A56] font-medium truncate">
                        {asg.teacher}
                      </span>
                    </div>

                    {/* Bold Assignment Title */}
                    <h3 className="text-sm sm:text-base font-extrabold text-[#38271C] group-hover:text-[#493222] transition-colors leading-snug pt-0.5">
                      {asg.title}
                    </h3>
                  </div>

                  {/* Dynamic Status Pill */}
                  <div className="shrink-0">
                    {isGraded ? (
                      <span className="text-[10px] font-bold text-[#493222] bg-[#EFE3D3] border border-[#D8C7B4] px-2.5 py-1 rounded-full">
                        Graded: {asg.grade}
                      </span>
                    ) : isSubmitted ? (
                      <span className="text-[10px] font-bold text-[#668064] bg-[#EAF2E9] border border-[#C5DEC3] px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Submitted</span>
                      </span>
                    ) : isClosed ? (
                      <span className="text-[10px] font-bold text-[#C84B31] bg-[#FDE8E4] border border-[#F5C2B8] px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Closed</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                        {remainingLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Written Instructions Preview (if present) */}
                {(asg.description || asg.questionPreview) && (
                  <p className="text-xs text-[#806A56] line-clamp-2 leading-relaxed">
                    {asg.description || asg.questionPreview}
                  </p>
                )}

                {/* 3. Playable Voice Instructions Player (if present) */}
                {asg.voiceInstructionUrl && (
                  <div className="pt-0.5">
                    <VoiceInstructionPlayer
                      audioUrl={asg.voiceInstructionUrl}
                      durationFormatted={asg.voiceInstructionDurationFormatted}
                      title="Instructor Spoken Instructions"
                      compact={true}
                    />
                  </div>
                )}

                {/* 4. Attached Teacher Reference File (if present) */}
                {asg.attachedFileName && (
                  <div
                    onClick={(e) => {
                      if (asg.attachedFileUrl) {
                        e.stopPropagation();
                        window.open(asg.attachedFileUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl flex items-center justify-between text-xs text-[#493222] hover:bg-[#F8F0E5] transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate font-semibold">
                      <Paperclip className="w-3.5 h-3.5 text-[#806A56] shrink-0" />
                      <span className="truncate">{asg.attachedFileName}</span>
                      {asg.attachedFileSize && (
                        <span className="text-[10px] text-[#806A56]">({asg.attachedFileSize})</span>
                      )}
                    </div>
                    {asg.attachedFileUrl && (
                      <span className="text-[11px] font-bold text-[#493222] flex items-center gap-1 shrink-0 ml-2">
                        <Download className="w-3 h-3" />
                        <span>Open</span>
                      </span>
                    )}
                  </div>
                )}

                {/* 5. Card Footer: Deadline, Marks & Clear Primary Action */}
                <div className="flex items-center justify-between text-xs text-[#806A56] pt-2.5 border-t border-[#E6D8C7]">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#806A56]">
                      <Clock className="w-3.5 h-3.5 text-[#493222]" />
                      <span>Due: {asg.dueDate} {asg.dueTime ? `(${asg.dueTime})` : ''}</span>
                    </span>
                    <span>·</span>
                    <span className="font-bold text-[#38271C] text-[11px]">
                      {asg.totalMarks || 10} Marks
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-xs text-[#493222] group-hover:translate-x-0.5 transition-transform shrink-0">
                    <span>
                      {isGraded
                        ? 'View Score & Feedback'
                        : isSubmitted
                        ? 'View Submission'
                        : isClosed
                        ? 'View Details'
                        : 'View & Submit'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
