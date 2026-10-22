import React from 'react';
import {
  LogOut,
  ShieldCheck,
  BookOpen,
  Mail,
  Building,
  HelpCircle,
  Bell,
  Lock,
} from 'lucide-react';
import { AdminUser, SubjectConfig } from '../../data/adminData';
import { AwkumEmblem } from '../common/AwkumLogo';

interface TeacherProfileViewProps {
  teacher: AdminUser;
  assignedSubjectsList: SubjectConfig[];
  onLogout: () => void;
}

export const TeacherProfileView: React.FC<TeacherProfileViewProps> = ({
  teacher,
  assignedSubjectsList,
  onLogout,
}) => {
  return (
    <div className="space-y-4">
      {/* 1. Profile Header Card */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs space-y-4 text-center">
        <div className="w-20 h-20 rounded-full bg-[#493222] text-[#FFF9F1] font-bold text-2xl flex items-center justify-center mx-auto shadow-md border-2 border-[#D8C7B4]">
          {teacher.name ? teacher.name.charAt(0) : 'T'}
        </div>

        <div>
          <h1 className="text-xl font-bold text-[#38271C]">
            {teacher.name || 'Subject Instructor'}
          </h1>
          <p className="text-xs font-semibold text-[#806A56] mt-0.5 font-mono">
            {teacher.email}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#EAF2E9] text-[#668064] text-xs font-bold rounded-full border border-[#C5DEC3]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authorized Subject Faculty</span>
          </div>
        </div>
      </div>

      {/* 2. Assigned Subjects Card */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-3">
        <h2 className="text-sm font-bold text-[#38271C] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#493222]" />
          <span>Assigned University Subjects ({assignedSubjectsList.length})</span>
        </h2>

        {assignedSubjectsList.length === 0 ? (
          <p className="text-xs text-[#806A56]">
            No active subject mapping. Please contact the Master Admin to assign subjects.
          </p>
        ) : (
          <div className="space-y-2">
            {assignedSubjectsList.map((subj) => (
              <div
                key={subj.id}
                className="p-3 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#38271C]">{subj.name}</span>
                  <span className="text-[11px] text-[#806A56] font-mono block">
                    {subj.code} · {subj.creditHours} Credit Hours
                  </span>
                </div>
                <span className="px-2.5 py-0.5 bg-[#EFE3D3] text-[#493222] text-[10px] font-bold rounded-md font-mono">
                  ACTIVE
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Account & Department Info */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-3">
        <h2 className="text-sm font-bold text-[#38271C] flex items-center gap-2">
          <Building className="w-4 h-4 text-[#493222]" />
          <span>Department & Identity</span>
        </h2>

        <div className="space-y-2 text-xs">
          <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl flex items-center justify-between">
            <span className="text-[#806A56]">Department:</span>
            <span className="font-bold text-[#38271C]">
              {teacher.department || 'Computer Science / SE'}
            </span>
          </div>

          <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl flex items-center justify-between">
            <span className="text-[#806A56]">Institution:</span>
            <span className="font-bold text-[#38271C]">
              Abdul Wali Khan University Mardan
            </span>
          </div>

          <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl flex items-center justify-between">
            <span className="text-[#806A56]">Campus:</span>
            <span className="font-bold text-[#38271C]">Garden Campus</span>
          </div>
        </div>
      </div>

      {/* 4. Actions & Logout */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-2">
        <button
          onClick={onLogout}
          className="w-full p-3 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-amber-300" />
          <span>Sign Out of AWKUM ClassHub</span>
        </button>
      </div>

      {/* Emblem Footer */}
      <div className="text-center pt-2 pb-4">
        <AwkumEmblem size={24} className="mx-auto mb-1 text-[#493222]" />
        <span className="text-[10px] text-[#806A56]">
          AWKUM ClassHub · Faculty Management Network
        </span>
      </div>
    </div>
  );
};
