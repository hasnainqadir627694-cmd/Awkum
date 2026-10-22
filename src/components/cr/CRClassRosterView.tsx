import React, { useState } from 'react';
import { Search, Users, Check, X, ArrowLeft, Filter, Phone, Mail, GraduationCap } from 'lucide-react';
import { ClassStudentItem } from '../../data/classRosterData';
import { AttendanceSession } from '../../lib/attendanceService';

interface CRClassRosterViewProps {
  assignedClass: string;
  roster: ClassStudentItem[];
  todaySession: AttendanceSession | null;
  onBackToDashboard: () => void;
}

export const CRClassRosterView: React.FC<CRClassRosterViewProps> = ({
  assignedClass,
  roster,
  todaySession,
  onBackToDashboard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'present' | 'absent'>('all');

  const filtered = roster.filter((st) => {
    const todayStatus = todaySession?.records[st.rollNumber]?.status;

    if (filterMode === 'present' && todayStatus !== 'present') return false;
    if (filterMode === 'absent' && todayStatus !== 'absent') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        st.rollNumber.toLowerCase().includes(q) ||
        st.fatherName.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header with back button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#806A56] hover:text-[#38271C] p-1.5 -ml-1 rounded-lg hover:bg-[#F3E9DD] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] text-[10px] font-bold rounded-md">
          {assignedClass}
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-[#38271C] tracking-tight">
          Class Students Roster
        </h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          Official enrollment directory for {assignedClass} ({roster.length} registered students)
        </p>
      </div>

      {/* 2. Search & Filter Controls */}
      <div className="space-y-2 bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, or father name..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />
        </div>

        {/* Tab Filters */}
        {todaySession?.finalized && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-[#806A56] mr-1">Filter:</span>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#493222] text-[#FFF9F1]'
                  : 'bg-white text-[#806A56] hover:bg-[#EFE3D3]'
              }`}
            >
              All ({roster.length})
            </button>
            <button
              onClick={() => setFilterMode('present')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                filterMode === 'present'
                  ? 'bg-[#668064] text-white'
                  : 'bg-white text-[#668064] hover:bg-[#EAF2E9]'
              }`}
            >
              Present Today ({todaySession.presentCount})
            </button>
            <button
              onClick={() => setFilterMode('absent')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                filterMode === 'absent'
                  ? 'bg-[#C84B31] text-white'
                  : 'bg-white text-[#C84B31] hover:bg-[#FDE8E4]'
              }`}
            >
              Absent Today ({todaySession.absentCount})
            </button>
          </div>
        )}
      </div>

      {/* 3. Students List */}
      <div className="space-y-2.5">
        {roster.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#806A56] bg-white rounded-2xl border border-[#E6D8C7] space-y-1.5">
            <Users className="w-8 h-8 mx-auto text-[#806A56]/50" />
            <p className="font-bold text-sm text-[#38271C]">No students are assigned to this class yet.</p>
            <p className="text-[11px] text-[#806A56]">
              Enrolled students will appear here once registered for {assignedClass}.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#806A56] bg-white rounded-2xl border border-[#E6D8C7]">
            No students found matching your query in this class.
          </div>
        ) : (
          filtered.map((st, idx) => {
            const todayRecord = todaySession?.records[st.rollNumber];
            return (
              <div
                key={st.id}
                className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#EFE3D3] text-[#493222] font-bold text-sm flex items-center justify-center shrink-0">
                    {st.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[#38271C] truncate">
                        {st.name}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-[#EFE3D3] text-[#493222] rounded shrink-0">
                        {st.rollNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#806A56] block truncate mt-0.5">
                      S/D of {st.fatherName} · {st.email}
                    </span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="shrink-0 text-right">
                  {todayRecord ? (
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full inline-flex items-center gap-1 ${
                        todayRecord.status === 'present'
                          ? 'bg-[#EAF2E9] text-[#668064]'
                          : 'bg-[#FDE8E4] text-[#C84B31]'
                      }`}
                    >
                      {todayRecord.status === 'present' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span className="capitalize">{todayRecord.status}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-[#F8F0E5] text-[#806A56] text-[10px] font-semibold rounded-full">
                      Enrolled
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
