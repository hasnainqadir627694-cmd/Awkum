import React, { useState } from 'react';
import { UserCheck, ShieldCheck, Mail, ArrowRight, Plus } from 'lucide-react';
import { ClassSection, INITIAL_CLASSES, AdminUser } from '../../data/adminData';

interface CRAssignmentsViewProps {
  users: AdminUser[];
  onOpenRoleAssignment: (user?: AdminUser | null, preselectedClass?: string) => void;
}

export const CRAssignmentsView: React.FC<CRAssignmentsViewProps> = ({
  users,
  onOpenRoleAssignment,
}) => {
  const [classes, setClasses] = useState<ClassSection[]>(INITIAL_CLASSES);
  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.role))
    : [];
  const students = safeUsers.filter((u) => u.role === 'student' || u.role === 'cr');

  // Active CRs list
  const activeCRs = safeUsers.filter(
    (u) =>
      (u.isCR || u.role === 'cr' || (Array.isArray(u.roles) && u.roles.includes('cr'))) &&
      u.crStatus !== 'revoked'
  );

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
        {classes.map((cls) => {
          const classKey = `${cls.class} ${cls.section}`.toLowerCase();
          // Find real assigned CR from live user accounts
          const assignedCRUser = safeUsers.find(
            (u) =>
              (u.isCR || u.role === 'cr' || (Array.isArray(u.roles) && u.roles.includes('cr'))) &&
              u.crStatus !== 'revoked' &&
              (u.assignedClass?.toLowerCase() === classKey ||
                u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, ''))
          );

          const realCRName = assignedCRUser?.name || cls.assignedCR;
          const realCREmail = assignedCRUser?.email || cls.assignedCREmail;

          // Account Health Status
          let healthBadge = null;
          if (assignedCRUser) {
            if (assignedCRUser.status === 'suspended') {
              healthBadge = (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-[10px] rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-red-600" />
                  Account Suspended
                </span>
              );
            } else if (assignedCRUser.crAcknowledged === false) {
              healthBadge = (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                  Pending Ack
                </span>
              );
            } else {
              healthBadge = (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Healthy / Active
                </span>
              );
            }
          }

          // Real enrolled count in this class/section
          const enrolledStudents = safeUsers.filter(
            (u) =>
              (u.role === 'student' || (Array.isArray(u.roles) && u.roles.includes('student'))) &&
              (u.assignedClass?.toLowerCase() === classKey ||
                u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, ''))
          ).length;

          return (
            <div
              key={cls.id}
              className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] font-bold text-[10px] rounded-md">
                    {cls.class}
                  </span>
                  <span className="text-xs font-bold text-[#38271C]">
                    {enrolledStudents} {enrolledStudents === 1 ? 'Student' : 'Students'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-[#38271C]">Section {cls.section}</h3>
                <p className="text-xs text-[#806A56]">
                  {cls.class === 'BSSE' ? 'BS Software Engineering' : 'BS Computer Science'} · Garden Campus
                </p>
              </div>

              <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
                    Appointed Class Representative
                  </span>
                  {healthBadge}
                </div>
                {realCRName ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#3A7BD5] text-[#FFF9F1] flex items-center justify-center font-bold text-xs shrink-0">
                      {realCRName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#38271C] truncate">{realCRName}</div>
                      <div className="text-[11px] text-[#806A56] font-mono truncate">
                        {realCREmail || 'cr@awkum.edu.pk'}
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
                  const targetClassStr = `${cls.class} ${cls.section}`;
                  onOpenRoleAssignment(assignedCRUser || null, targetClassStr);
                }}
                className="w-full py-2 bg-[#F8F0E5] hover:bg-[#EFE3D3] border border-[#E6D8C7] rounded-xl text-xs font-bold text-[#493222] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{realCRName ? 'Reassign / Replace CR' : 'Appoint New CR'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. All Active Class Representatives Directory */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#38271C]">Active CR Accounts ({activeCRs.length})</h2>
            <p className="text-xs text-[#806A56]">Registered student accounts with authorized Class Representative privileges</p>
          </div>
          <button
            onClick={() => onOpenRoleAssignment(null)}
            className="px-3 py-1.5 bg-[#493222] text-[#FFF9F1] hover:bg-[#38271C] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Appoint CR</span>
          </button>
        </div>

        {activeCRs.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-[#E6D8C7] rounded-2xl bg-white/50 text-xs text-[#806A56]">
            No active Class Representatives found. Click "Appoint CR" above to assign a student.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#38271C]">
              <thead className="bg-[#F8F0E5] text-[#806A56] uppercase text-[10px] font-bold border-b border-[#E6D8C7]">
                <tr>
                  <th className="py-2.5 px-3">Student Name & Gmail</th>
                  <th className="py-2.5 px-3">Assigned Class</th>
                  <th className="py-2.5 px-3">UID / Firebase Auth</th>
                  <th className="py-2.5 px-3">Granted Date</th>
                  <th className="py-2.5 px-3">Account Health</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D8C7]/50 bg-white">
                {activeCRs.map((cr) => (
                  <tr key={cr.id} className="hover:bg-[#FFF9F1]/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#38271C]">{cr.name}</div>
                      <div className="text-[11px] text-[#806A56] font-mono">{cr.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] font-bold text-[10px] rounded-md">
                        {cr.assignedClass || 'BSCS 3A'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-[#806A56]">
                      {cr.uid ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {cr.uid.length > 16 ? `${cr.uid.slice(0, 14)}...` : cr.uid}
                        </span>
                      ) : (
                        <span className="text-amber-700">In Directory</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[#806A56]">
                      {cr.crAssignedAt
                        ? new Date(cr.crAssignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : cr.registeredDate || 'Recently Assigned'}
                    </td>
                    <td className="py-3 px-3">
                      {cr.status === 'suspended' ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-[10px] rounded-full">
                          Suspended
                        </span>
                      ) : cr.crAcknowledged === false ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                          Pending Ack
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                          Healthy / Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onOpenRoleAssignment(cr, cr.assignedClass)}
                        className="px-2.5 py-1 bg-[#F8F0E5] hover:bg-[#EFE3D3] text-[#493222] font-bold text-[11px] rounded-lg border border-[#E6D8C7] transition-colors cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
