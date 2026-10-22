import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  User,
  Mail,
  GraduationCap,
  Building2,
  Calendar,
  LogOut,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { AdminUser } from '../../data/adminData';

interface CRProfileViewProps {
  currentUser: AdminUser;
  onBackToDashboard: () => void;
  onReturnToStudentPortal: () => void;
  onLogout: () => void;
}

export const CRProfileView: React.FC<CRProfileViewProps> = ({
  currentUser,
  onBackToDashboard,
  onReturnToStudentPortal,
  onLogout,
}) => {
  const assignedClass = currentUser.assignedClass || 'BSCS 3A';
  const studentId = currentUser.studentId || currentUser.id;
  const department = currentUser.department || 'Computer Science & Software Engineering';

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Top Header with Back to Dashboard */}
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
          CR Profile & Appointment
        </h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          Verified academic profile and Class Representative authorization details
        </p>
      </div>

      {/* 2. Primary Identity Card */}
      <div className="bg-white border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#493222] text-[#FFF9F1] font-bold text-2xl flex items-center justify-center shadow-sm shrink-0 border-2 border-[#E6D8C7]">
            {currentUser.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#38271C] truncate">
                {currentUser.name}
              </h2>
              <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active CR
              </span>
            </div>
            <p className="text-xs text-[#806A56] font-mono mt-0.5 truncate">
              {currentUser.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#EFE3D3] text-[#493222] rounded-md">
                ID: {studentId}
              </span>
              <span className="text-[11px] text-[#806A56]">
                Section {assignedClass}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="pt-3 border-t border-[#E6D8C7] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2.5 p-3 bg-[#F8F0E5]/70 rounded-xl">
            <Building2 className="w-4 h-4 text-[#493222] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-[#806A56] uppercase block">Department</span>
              <span className="font-medium text-[#38271C]">{department}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-[#F8F0E5]/70 rounded-xl">
            <GraduationCap className="w-4 h-4 text-[#493222] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-[#806A56] uppercase block">Institution</span>
              <span className="font-medium text-[#38271C]">Abdul Wali Khan University Mardan</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Official Role & Authorization Card (Matching Screen 13) */}
      <div className="bg-[#FFF9F1] border-2 border-[#493222] rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#493222] text-[#FFF9F1] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#E6D8C7]" />
            </div>
            <div>
              <span className="font-bold text-xs text-[#38271C] block">
                Class Representative Authorization
              </span>
              <span className="text-[10px] text-[#806A56]">
                Assigned Section: <strong>{assignedClass}</strong>
              </span>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-[#668064] text-white text-[10px] font-bold rounded-full shadow-2xs">
            Active Status
          </span>
        </div>

        <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl flex items-start gap-2.5 text-xs text-[#806A56]">
          <Info className="w-4 h-4 text-[#493222] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#38271C]">Assigned by Master Admin:</strong> Only the Master Administrator can appoint, reassign, or revoke your Class Representative status. Your normal Student Portal features remain completely available to you at all times.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={onReturnToStudentPortal}
            className="w-full py-2.5 px-4 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Switch to Student Portal</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 px-4 bg-white hover:bg-[#FDE8E4] border border-[#E6D8C7] hover:border-[#F5C2B8] text-[#C84B31] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
