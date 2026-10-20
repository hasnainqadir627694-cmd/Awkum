import React, { useState } from 'react';
import { UserCheck, ShieldCheck, Mail, ArrowRight, Plus } from 'lucide-react';
import { ClassSection, INITIAL_CLASSES, AdminUser } from '../../data/adminData';

interface CRAssignmentsViewProps {
  users: AdminUser[];
  onOpenRoleAssignment: (user: AdminUser) => void;
}

export const CRAssignmentsView: React.FC<CRAssignmentsViewProps> = ({
  users,
  onOpenRoleAssignment,
}) => {
  const [classes, setClasses] = useState<ClassSection[]>(INITIAL_CLASSES);
  const students = users.filter((u) => u.role === 'student' || u.role === 'cr');

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Class Representative (CR) Management</h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          Appoint and manage student Class Representatives authorized to record daily class attendance
        </p>
      </div>

      {/* 2. Grid of Sections and Assigned CRs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] font-bold text-[10px] rounded-md">
                  {cls.class}
                </span>
                <span className="text-xs font-bold text-[#38271C]">{cls.totalStudents} Students</span>
              </div>
              <h3 className="font-bold text-lg text-[#38271C]">Section {cls.section}</h3>
              <p className="text-xs text-[#806A56]">BS Computer Science · Garden Campus</p>
            </div>

            <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl">
              <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block mb-1">
                Appointed Class Representative
              </span>
              {cls.assignedCR ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#3A7BD5] text-[#FFF9F1] flex items-center justify-center font-bold text-xs shrink-0">
                    {cls.assignedCR.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#38271C] truncate">{cls.assignedCR}</div>
                    <div className="text-[11px] text-[#806A56] font-mono truncate">
                      {cls.assignedCREmail || 'cr@awkum.edu.pk'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center text-xs text-[#806A56] italic">
                  No Class Representative appointed yet
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const targetUser = students.find((s) => s.name === cls.assignedCR) || students[0];
                onOpenRoleAssignment(targetUser);
              }}
              className="w-full py-2 bg-[#F8F0E5] hover:bg-[#EFE3D3] border border-[#E6D8C7] rounded-xl text-xs font-bold text-[#493222] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{cls.assignedCR ? 'Reassign / Replace CR' : 'Appoint New CR'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
