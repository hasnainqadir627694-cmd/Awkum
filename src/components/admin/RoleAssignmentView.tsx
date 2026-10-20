import React, { useState } from 'react';
import {
  Shield,
  Search,
  Check,
  GraduationCap,
  Briefcase,
  UserCheck,
  Crown,
  AlertCircle,
  Save,
} from 'lucide-react';
import { AdminUser, UserRole, OFFICIAL_SUBJECTS, INITIAL_CLASSES } from '../../data/adminData';

interface RoleAssignmentViewProps {
  users: AdminUser[];
  initialSelectedUser?: AdminUser | null;
  onSaveRole: (
    userId: string,
    newRole: UserRole,
    assignedSubjects?: string[],
    assignedClass?: string
  ) => void;
  onCancel: () => void;
}

export const RoleAssignmentView: React.FC<RoleAssignmentViewProps> = ({
  users,
  initialSelectedUser,
  onSaveRole,
  onCancel,
}) => {
  const [selectedUser, setSelectedUser] = useState<AdminUser>(
    initialSelectedUser || users.find((u) => u.role === 'teacher') || users[1]
  );
  const [selectedRole, setSelectedRole] = useState<UserRole>(selectedUser.role);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>(
    selectedUser.assignedSubjects || ['PF Theory']
  );
  const [assignedClass, setAssignedClass] = useState<string>(
    selectedUser.assignedClass || 'BSCS 3A'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setAssignedSubjects(user.assignedSubjects || ['PF Theory']);
    setAssignedClass(user.assignedClass || 'BSCS 3A');
  };

  const handleToggleSubject = (subject: string) => {
    setAssignedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSave = () => {
    onSaveRole(
      selectedUser.id,
      selectedRole,
      selectedRole === 'teacher' ? assignedSubjects : undefined,
      selectedRole === 'cr' ? assignedClass : undefined
    );
    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
    }, 2500);
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Assign or Change User Role</h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          Select a user and assign a role with specific subject or section permissions
        </p>
      </div>

      {successToast && (
        <div className="p-3.5 bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064] rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>Role updated successfully! User session permissions and audit logs synchronized.</span>
        </div>
      )}

      {/* 2. User Selector & Active Card */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user or email to change role..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />

          {searchQuery.trim() && (
            <div className="absolute top-12 left-0 right-0 bg-white border border-[#D8C7B4] rounded-xl shadow-lg max-h-48 overflow-y-auto z-20 divide-y divide-[#E6D8C7]">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    handleSelectUser(u);
                    setSearchQuery('');
                  }}
                  className="p-2.5 hover:bg-[#F8F0E5] cursor-pointer flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-[#38271C]">{u.name} ({u.email})</span>
                  <span className="text-[10px] uppercase font-bold text-[#806A56]">{u.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected User Highlight Card (Matching Mockup 4) */}
        <div className="flex items-center justify-between p-4 bg-white border border-[#E6D8C7] rounded-2xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#EFE3D3] text-[#493222] font-bold text-lg flex items-center justify-center">
              {selectedUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#38271C]">{selectedUser.name}</h3>
                <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                  {selectedUser.status}
                </span>
              </div>
              <p className="text-xs text-[#806A56] font-mono">{selectedUser.email}</p>
              <p className="text-[11px] text-[#806A56]/70 mt-0.5">
                Registered: {selectedUser.registeredDate} · Current Role: <strong className="text-[#38271C] uppercase">{selectedUser.role}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Role & Permission Selection */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column: Select Role */}
        <div className="md:col-span-7 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-[#38271C] mb-2">Select Role</h2>

          {/* Student */}
          <label
            onClick={() => setSelectedRole('student')}
            className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedRole === 'student'
                ? 'bg-white border-[#493222] shadow-xs ring-1 ring-[#493222]'
                : 'bg-white/60 border-[#E6D8C7] hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="role"
              checked={selectedRole === 'student'}
              onChange={() => setSelectedRole('student')}
              className="mt-1 accent-[#493222]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#806A56]" />
                <span className="font-bold text-xs text-[#38271C]">Student</span>
              </div>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                Access to standard student portal, attendance viewing, syllabus documents, and task submissions.
              </p>
            </div>
          </label>

          {/* Class Representative */}
          <label
            onClick={() => setSelectedRole('cr')}
            className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedRole === 'cr'
                ? 'bg-white border-[#3A7BD5] shadow-xs ring-1 ring-[#3A7BD5]'
                : 'bg-white/60 border-[#E6D8C7] hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="role"
              checked={selectedRole === 'cr'}
              onChange={() => setSelectedRole('cr')}
              className="mt-1 accent-[#3A7BD5]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#3A7BD5]" />
                <span className="font-bold text-xs text-[#38271C]">Class Representative (CR)</span>
              </div>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                Manage daily attendance marking for assigned section and post section notices.
              </p>
            </div>
          </label>

          {/* Subject Teacher */}
          <label
            onClick={() => setSelectedRole('teacher')}
            className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedRole === 'teacher'
                ? 'bg-white border-[#668064] shadow-xs ring-1 ring-[#668064]'
                : 'bg-white/60 border-[#E6D8C7] hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="role"
              checked={selectedRole === 'teacher'}
              onChange={() => setSelectedRole('teacher')}
              className="mt-1 accent-[#668064]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#668064]" />
                <span className="font-bold text-xs text-[#38271C]">Subject Teacher</span>
              </div>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                Upload lecture slides, manage assignments, evaluate submissions, and publish subject notices.
              </p>
            </div>
          </label>

          {/* Master Admin */}
          <label
            onClick={() => setSelectedRole('master_admin')}
            className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              selectedRole === 'master_admin'
                ? 'bg-white border-[#B78103] shadow-xs ring-1 ring-[#B78103]'
                : 'bg-white/60 border-[#E6D8C7] hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="role"
              checked={selectedRole === 'master_admin'}
              onChange={() => setSelectedRole('master_admin')}
              className="mt-1 accent-[#B78103]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#B78103]" />
                <span className="font-bold text-xs text-[#38271C]">Master Admin</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-[#FFF3CD] text-[#B78103] font-bold rounded">Restricted</span>
              </div>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                Full system control, live branding, user role governance, subject assignment, and audit logs.
              </p>
            </div>
          </label>
        </div>

        {/* Right Column: Assign Permissions */}
        <div className="md:col-span-5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#38271C] mb-2">Assign Permissions</h2>

            {selectedRole === 'teacher' && (
              <div className="space-y-3">
                <p className="text-xs text-[#806A56]">
                  Select the official university subject(s) this faculty member is authorized to teach:
                </p>
                <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-[#E6D8C7]">
                  {OFFICIAL_SUBJECTS.map((subj) => {
                    const isChecked = assignedSubjects.includes(subj);
                    return (
                      <label
                        key={subj}
                        className="flex items-center gap-2.5 text-xs text-[#38271C] font-semibold cursor-pointer py-1"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSubject(subj)}
                          className="w-4 h-4 accent-[#493222] rounded cursor-pointer"
                        />
                        <span>{subj}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedRole === 'cr' && (
              <div className="space-y-3">
                <p className="text-xs text-[#806A56]">
                  Select the Class Section this Class Representative is assigned to:
                </p>
                <select
                  value={assignedClass}
                  onChange={(e) => setAssignedClass(e.target.value)}
                  className="w-full p-3 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                >
                  {INITIAL_CLASSES.map((cls) => (
                    <option key={cls.id} value={`${cls.class} ${cls.section}`}>
                      {cls.class} {cls.section} (Garden Campus)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedRole === 'student' && (
              <div className="p-4 bg-white border border-[#E6D8C7] rounded-2xl text-xs text-[#806A56] space-y-2">
                <p>Standard enrolled student permissions.</p>
                <p className="text-[11px]">Enrolled in 6 semester subjects according to BSCS academic curriculum.</p>
              </div>
            )}

            {selectedRole === 'master_admin' && (
              <div className="p-4 bg-[#FFF3CD]/50 border border-[#F0D597] rounded-2xl text-xs text-[#856404] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Root Authority Warning
                </p>
                <p className="text-[11px] leading-relaxed">
                  Grants unlimited administrative privileges to govern university records, live portal branding, and security policies.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-white border border-[#E6D8C7] text-xs font-semibold text-[#806A56] hover:text-[#38271C] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Assign Role</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
