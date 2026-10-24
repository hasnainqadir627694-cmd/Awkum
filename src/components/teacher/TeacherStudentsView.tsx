import React, { useState } from 'react';
import { Search, Users, ShieldCheck, Mail, GraduationCap } from 'lucide-react';
import { ClassStudentItem } from '../../data/classRosterData';
import { SubjectConfig } from '../../data/adminData';

interface TeacherStudentsViewProps {
  selectedSubject: SubjectConfig;
  roster: ClassStudentItem[];
  onBackToDashboard: () => void;
}

export const TeacherStudentsView: React.FC<TeacherStudentsViewProps> = ({
  selectedSubject,
  roster,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = roster.filter((st) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      st.name.toLowerCase().includes(q) ||
      st.rollNumber.toLowerCase().includes(q) ||
      st.email.toLowerCase().includes(q) ||
      (st.fatherName && st.fatherName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[#38271C]">
              Enrolled Students — <span className="text-[#493222] underline decoration-amber-600/40">{selectedSubject.name}</span>
            </h1>
            <p className="text-xs text-[#806A56] mt-0.5">
              Official roster for {selectedSubject.code} · Total Enrolled: {roster.length}
            </p>
          </div>
          <span className="px-3 py-1 bg-[#EAF2E9] text-[#668064] text-xs font-bold rounded-full border border-[#C5DEC3]">
            {filteredStudents.length} Active
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name, roll number, or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#806A56] hover:text-[#38271C]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 2. Students List */}
      {filteredStudents.length === 0 ? (
        <div className="p-8 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl text-center space-y-2">
          <Users className="w-10 h-10 text-[#806A56] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-[#38271C]">No Enrolled Students Found</h3>
          <p className="text-xs text-[#806A56]">
            {searchQuery
              ? `No student matching "${searchQuery}" was found.`
              : 'No students are currently registered for this subject.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredStudents.map((st) => (
            <div
              key={st.id}
              className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] hover:border-[#D8C7B4] rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#EFE3D3] text-[#493222] font-bold text-sm flex items-center justify-center shrink-0 border border-[#D8C7B4]">
                  {st.name.charAt(0)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-xs sm:text-sm text-[#38271C] truncate">
                      {st.name}
                    </h3>
                    <span className="px-2 py-0.2 bg-[#EFE3D3] text-[#493222] font-mono text-[10px] font-bold rounded">
                      {st.rollNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#806A56] mt-0.5 flex-wrap">
                    {st.fatherName && <span>S/D of {st.fatherName}</span>}
                    <span className="font-mono text-[#493222] flex items-center gap-1">
                      <Mail className="w-3 h-3 text-[#806A56]" />
                      {st.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full border border-[#C5DEC3]">
                  Enrolled
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
