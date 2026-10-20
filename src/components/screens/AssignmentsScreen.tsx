import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Paperclip,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { AssignmentItem, SubjectInfo } from '../../data/portalData';

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

  const filteredAssignments = assignments.filter((item) => {
    const matchesSubject =
      selectedSubjectId === 'all' || item.subjectId === selectedSubjectId;

    if (statusFilter === 'todo') {
      return matchesSubject && item.status === 'todo';
    } else if (statusFilter === 'submitted') {
      return matchesSubject && (item.status === 'submitted' || item.status === 'graded');
    } else {
      return matchesSubject && item.status === 'overdue';
    }
  });

  const todoCount = assignments.filter((a) => a.status === 'todo').length;
  const submittedCount = assignments.filter(
    (a) => a.status === 'submitted' || a.status === 'graded'
  ).length;
  const overdueCount = assignments.filter((a) => a.status === 'overdue').length;

  return (
    <div className="space-y-4 pb-20">
      {/* Title */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
            Assignments
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            Course tasks, homework, and problem sets
          </p>
        </div>
      </div>

      {/* Primary Filter Tabs: To Do / Submitted / Past Due */}
      <div className="flex items-center p-1 bg-[#EFE3D3] rounded-xl border border-[#E6D8C7]">
        <button
          onClick={() => setStatusFilter('todo')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            statusFilter === 'todo'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <span>To Do</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              statusFilter === 'todo'
                ? 'bg-[#C84B31] text-white'
                : 'bg-[#E6D8C7] text-[#493222]'
            }`}
          >
            {todoCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('submitted')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            statusFilter === 'submitted'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <span>Submitted</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              statusFilter === 'submitted'
                ? 'bg-[#668064] text-white'
                : 'bg-[#E6D8C7] text-[#493222]'
            }`}
          >
            {submittedCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('overdue')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            statusFilter === 'overdue'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          <span>Past Due</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              statusFilter === 'overdue'
                ? 'bg-[#C84B31] text-white'
                : 'bg-[#E6D8C7] text-[#493222]'
            }`}
          >
            {overdueCount}
          </span>
        </button>
      </div>

      {/* Subject Filter Pill Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setSelectedSubjectId('all')}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
            selectedSubjectId === 'all'
              ? 'bg-[#493222] text-[#FFF9F1]'
              : 'bg-[#FFF9F1] border border-[#E6D8C7] text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          All Subjects
        </button>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectId(sub.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              selectedSubjectId === sub.id
                ? 'bg-[#493222] text-[#FFF9F1]'
                : 'bg-[#FFF9F1] border border-[#E6D8C7] text-[#806A56] hover:text-[#38271C]'
            }`}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* Assignment Cards List */}
      <div className="space-y-3">
        {filteredAssignments.length === 0 ? (
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#668064] mx-auto mb-2" />
            <h4 className="text-sm font-bold text-[#38271C]">
              {statusFilter === 'todo'
                ? "You're all caught up!"
                : 'No assignments found'}
            </h4>
            <p className="text-xs text-[#806A56] mt-1 max-w-xs mx-auto">
              {statusFilter === 'todo'
                ? 'Great job! You have no pending submissions due at this time.'
                : 'There are no assignments matching the selected status or subject filter.'}
            </p>
          </div>
        ) : (
          filteredAssignments.map((asg) => (
            <div
              key={asg.id}
              onClick={() => onOpenAssignment(asg)}
              className="p-4 bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] hover:border-[#493222] rounded-2xl transition-all shadow-xs cursor-pointer group active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wide">
                      {asg.subjectName}
                    </span>
                    <span>·</span>
                    <span className="text-[10px] text-[#806A56]">
                      {asg.teacher}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#38271C] group-hover:text-[#493222] transition-colors">
                    {asg.title}
                  </h3>
                </div>

                {/* Status Badges */}
                <div className="shrink-0">
                  {asg.status === 'todo' && (
                    <span className="text-[10px] font-bold text-[#C84B31] bg-[#FDE8E4] px-2 py-0.5 rounded-full">
                      Due Soon
                    </span>
                  )}
                  {asg.status === 'submitted' && (
                    <span className="text-[10px] font-bold text-[#668064] bg-[#EAF2E9] px-2 py-0.5 rounded-full">
                      Submitted
                    </span>
                  )}
                  {asg.status === 'graded' && (
                    <span className="text-[10px] font-bold text-[#493222] bg-[#EFE3D3] px-2 py-0.5 rounded-full">
                      Graded: {asg.grade}
                    </span>
                  )}
                  {asg.status === 'overdue' && (
                    <span className="text-[10px] font-bold text-[#C84B31] bg-[#FDE8E4] px-2 py-0.5 rounded-full">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Preview text */}
              <p className="text-xs text-[#806A56] line-clamp-2 mt-2 leading-relaxed">
                {asg.questionPreview}
              </p>

              {/* Card Footer */}
              <div className="flex items-center justify-between text-[11px] text-[#806A56] mt-3 pt-3 border-t border-[#E6D8C7]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#493222]" />
                    <span>
                      {asg.dueDate} ({asg.dueTime})
                    </span>
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-[#38271C]">
                    {asg.totalMarks} Marks
                  </span>
                </div>

                <div className="flex items-center gap-1 font-semibold text-[#493222] group-hover:translate-x-0.5 transition-transform">
                  <span>
                    {asg.status === 'todo'
                      ? 'Submit'
                      : asg.status === 'graded'
                      ? 'View Score'
                      : 'View Details'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
