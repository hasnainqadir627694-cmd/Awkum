import React, { useState } from 'react';
import { Briefcase, UserCheck, Check, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { SubjectConfig, INITIAL_SUBJECTS, AdminUser } from '../../data/adminData';

interface TeacherAssignmentsViewProps {
  users: AdminUser[];
  onOpenRoleAssignment: (user: AdminUser | null) => void;
}

export const TeacherAssignmentsView: React.FC<TeacherAssignmentsViewProps> = ({
  users,
  onOpenRoleAssignment,
}) => {
  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.role))
    : [];
  const teachers = safeUsers.filter((u) => u.role === 'teacher');
  const activeTeachers = safeUsers.filter(
    (u) =>
      (u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'))) &&
      u.teacherStatus !== 'revoked'
  );
  const [subjects] = useState<SubjectConfig[]>(INITIAL_SUBJECTS);

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
        {subjects.map((subj) => {
          // Find real assigned instructor dynamically from safeUsers
          const dynamicTeacher = activeTeachers.find((t) =>
            Array.isArray(t.assignedSubjects) &&
            t.assignedSubjects.some(
              (s) =>
                s.toLowerCase() === subj.name.toLowerCase() ||
                s.toLowerCase() === subj.code.toLowerCase() ||
                subj.name.toLowerCase().includes(s.toLowerCase())
            )
          );

          const teacherName = dynamicTeacher?.name || subj.assignedTeacher;
          const teacherEmail = dynamicTeacher?.email || subj.teacherEmail;

          // Health indicator for subject instructor
          let healthBadge = null;
          if (dynamicTeacher) {
            if (dynamicTeacher.status === 'suspended') {
              healthBadge = (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-[10px] rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-red-600" />
                  Suspended
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

          return (
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
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
                    Assigned Instructor
                  </span>
                  {healthBadge}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#493222] text-[#FFF9F1] flex items-center justify-center font-bold text-xs shrink-0">
                    {teacherName ? teacherName.charAt(0) : '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#38271C] truncate">
                      {teacherName || 'No teacher assigned'}
                    </div>
                    <div className="text-[11px] text-[#806A56] font-mono truncate">
                      {teacherEmail || 'Awaiting Master Admin assignment'}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onOpenRoleAssignment(dynamicTeacher || null);
                }}
                className="w-full py-2 bg-[#F8F0E5] hover:bg-[#EFE3D3] border border-[#E6D8C7] rounded-xl text-xs font-bold text-[#493222] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{teacherName ? 'Reassign / Update Instructor' : 'Assign Faculty Member'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Assigned Faculty Members Directory */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#38271C]">Assigned Faculty Members ({activeTeachers.length})</h2>
            <p className="text-xs text-[#806A56]">Accounts granted Teacher Panel access and subject responsibilities</p>
          </div>
          <button
            onClick={() => onOpenRoleAssignment(null)}
            className="px-3 py-1.5 bg-[#493222] text-[#FFF9F1] hover:bg-[#38271C] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Assign New Teacher</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeTeachers.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-[#E6D8C7] rounded-2xl bg-white/50 text-xs text-[#806A56]">
            No active Faculty accounts assigned yet. Click "Assign New Teacher" above to assign a registered Gmail.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#38271C]">
              <thead className="bg-[#F8F0E5] text-[#806A56] uppercase text-[10px] font-bold border-b border-[#E6D8C7]">
                <tr>
                  <th className="py-2.5 px-3">Faculty Name & Gmail</th>
                  <th className="py-2.5 px-3">Assigned Subject(s)</th>
                  <th className="py-2.5 px-3">UID / Firebase Auth</th>
                  <th className="py-2.5 px-3">Granted Date</th>
                  <th className="py-2.5 px-3">Account Health</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D8C7]/50 bg-white">
                {activeTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-[#FFF9F1]/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#38271C]">{t.name}</div>
                      <div className="text-[11px] text-[#806A56] font-mono">{t.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(t.assignedSubjects) && t.assignedSubjects.length > 0 ? (
                          t.assignedSubjects.map((subj, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-[#EFE3D3] text-[#493222] font-semibold text-[10px] rounded-md">
                              {subj}
                            </span>
                          ))
                        ) : (
                          <span className="text-amber-700 italic text-[10px]">No subjects mapped</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-[#806A56]">
                      {t.uid ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {t.uid.length > 16 ? `${t.uid.slice(0, 14)}...` : t.uid}
                        </span>
                      ) : (
                        <span className="text-amber-700">In Directory</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[#806A56]">
                      {t.teacherAssignedAt
                        ? new Date(t.teacherAssignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : t.registeredDate || 'Recently Assigned'}
                    </td>
                    <td className="py-3 px-3">
                      {t.status === 'suspended' ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-[10px] rounded-full">
                          Suspended
                        </span>
                      ) : !t.assignedSubjects || t.assignedSubjects.length === 0 ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                          Pending Scope
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                          Healthy / Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onOpenRoleAssignment(t)}
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
