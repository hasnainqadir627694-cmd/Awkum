import React, { useState } from 'react';
import { Briefcase, UserCheck, Check, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { SubjectConfig, INITIAL_SUBJECTS, AdminUser } from '../../data/adminData';

interface TeacherAssignmentsViewProps {
  users: AdminUser[];
  onOpenRoleAssignment: (user: AdminUser) => void;
}

export const TeacherAssignmentsView: React.FC<TeacherAssignmentsViewProps> = ({
  users,
  onOpenRoleAssignment,
}) => {
  const teachers = users.filter((u) => u.role === 'teacher');
  const [subjects, setSubjects] = useState<SubjectConfig[]>(INITIAL_SUBJECTS);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Teacher & Faculty Subject Mapping</h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          Map authorized university teachers to their assigned semester subjects
        </p>
      </div>

      {/* 2. Grid of 6 Subjects and Assigned Faculty */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subj) => (
          <div
            key={subj.id}
            className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-[#EFE3D3] text-[#493222] font-mono text-[10px] font-bold rounded-md">
                  {subj.code}
                </span>
                <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                  {subj.status}
                </span>
              </div>
              <h3 className="font-bold text-base text-[#38271C]">{subj.name}</h3>
              <p className="text-xs text-[#806A56] mt-0.5">{subj.creditHours} Credit Hours · Garden Campus</p>
            </div>

            <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl">
              <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block mb-1">
                Assigned Instructor
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#493222] text-[#FFF9F1] flex items-center justify-center font-bold text-xs shrink-0">
                  {subj.assignedTeacher ? subj.assignedTeacher.charAt(0) : '?'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#38271C] truncate">
                    {subj.assignedTeacher || 'No teacher assigned'}
                  </div>
                  <div className="text-[11px] text-[#806A56] font-mono truncate">
                    {subj.teacherEmail || 'Awaiting Master Admin assignment'}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const matchedTeacher = teachers.find((t) => t.email === subj.teacherEmail) || teachers[0];
                onOpenRoleAssignment(matchedTeacher);
              }}
              className="w-full py-2 bg-[#F8F0E5] hover:bg-[#EFE3D3] border border-[#E6D8C7] rounded-xl text-xs font-bold text-[#493222] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Reassign / Update Instructor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
