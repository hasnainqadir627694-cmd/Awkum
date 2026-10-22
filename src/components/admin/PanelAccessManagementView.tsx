import React, { useState } from 'react';
import {
  Shield,
  Search,
  Check,
  UserCheck,
  Briefcase,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  User,
  Sliders,
  Lock,
  FileText,
} from 'lucide-react';
import { AdminUser, OFFICIAL_SUBJECTS, INITIAL_CLASSES } from '../../data/adminData';
import { grantCRAccess, revokeCRAccess, grantTeacherAccess, revokeTeacherAccess } from '../../lib/authService';

interface PanelAccessManagementViewProps {
  users: AdminUser[];
  adminEmail: string;
  onRefreshUsers: () => void;
}

export const PanelAccessManagementView: React.FC<PanelAccessManagementViewProps> = ({
  users,
  adminEmail,
  onRefreshUsers,
}) => {
  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.email))
    : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [panelType, setPanelType] = useState<'teacher' | 'cr'>('cr');
  
  // Teacher form state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['PF Theory']);
  const [selectedClass, setSelectedClass] = useState<string>('BSCS 3A');

  // CR form state
  const [crClass, setCrClass] = useState<string>('BSCS 3A');

  // Revocation modal state
  const [revokingTarget, setRevokingTarget] = useState<{ user: AdminUser; type: 'teacher' | 'cr' } | null>(null);
  const [revocationReason, setRevocationReason] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredUsers = safeUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.studentId && u.studentId.toLowerCase().includes(q))
    );
  });

  const handleToggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const handleGrantAssignment = async () => {
    if (!selectedUser) {
      showToast('Please select a registered user account.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (panelType === 'cr') {
        const res = await grantCRAccess(adminEmail, selectedUser.email, crClass, selectedUser.uid);
        if (res.success) {
          showToast(`Successfully granted CR Panel access for ${crClass} to ${selectedUser.email}`);
          onRefreshUsers();
        } else {
          showToast(res.error || 'Failed to grant CR access.');
        }
      } else {
        if (selectedSubjects.length === 0) {
          showToast('Please select at least one subject for Teacher Panel assignment.');
          setIsSubmitting(false);
          return;
        }
        const res = await grantTeacherAccess(adminEmail, selectedUser.email, selectedSubjects, selectedClass, selectedUser.uid);
        if (res.success) {
          showToast(`Successfully granted Teacher Panel access to ${selectedUser.email}`);
          onRefreshUsers();
        } else {
          showToast(res.error || 'Failed to grant Teacher Panel access.');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteRevoke = async () => {
    if (!revokingTarget) return;
    setIsSubmitting(true);
    try {
      const { user, type } = revokingTarget;
      const reason = revocationReason.trim() || 'Master Admin revocation';

      if (type === 'cr') {
        const res = await revokeCRAccess(adminEmail, user.email, reason);
        if (res.success) {
          showToast(`Successfully revoked CR Panel access from ${user.email}`);
          onRefreshUsers();
        } else {
          showToast(res.error || 'Failed to revoke CR access.');
        }
      } else {
        const res = await revokeTeacherAccess(adminEmail, user.email, reason);
        if (res.success) {
          showToast(`Successfully revoked Teacher Panel access from ${user.email}`);
          onRefreshUsers();
        } else {
          showToast(res.error || 'Failed to revoke Teacher Panel access.');
        }
      }
      setRevokingTarget(null);
      setRevocationReason('');
    } catch (err: any) {
      showToast(err?.message || 'Revocation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#24170F] text-[#FFF9F1] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-amber-400/30 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Panel Access Management</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Strict Gmail-bound UID authorization, subject/class mapping, and immediate revocation for Teacher & CR Panels
          </p>
        </div>
        <button
          onClick={onRefreshUsers}
          className="self-start md:self-auto px-4 py-2 bg-[#FFF9F1] hover:bg-[#EFE3D3] border border-[#E6D8C7] rounded-xl text-xs font-bold text-[#493222] transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Directory</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registered Users Directory Search & Selection */}
        <div className="lg:col-span-5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#38271C] flex items-center gap-2">
              <User className="w-4 h-4 text-[#806A56]" />
              <span>Registered Accounts ({safeUsers.length})</span>
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#EFE3D3] text-[#493222] rounded-md">
              UID Bound
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#806A56]" />
            <input
              type="text"
              placeholder="Search and select a registered Gmail account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E6D8C7] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]/20"
            />
          </div>

          {/* Users List */}
          <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-amber-900/10">
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#806A56] italic">
                No registered accounts match your search.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUser?.email.toLowerCase() === u.email.toLowerCase();
                const isTeacher = u.role === 'teacher' || u.teacherStatus === 'active';
                const isCR = u.role === 'cr' || u.isCR;

                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#493222] text-[#FFF9F1] border-[#493222] shadow-md'
                        : 'bg-white hover:bg-[#F8F0E5] border-[#E6D8C7] text-[#38271C]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover border border-amber-400/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{u.name}</div>
                        <div className={`text-[11px] font-mono truncate ${isSelected ? 'text-amber-200' : 'text-[#806A56]'}`}>
                          {u.email}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#EFE3D3] text-[#493222]'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                          {isTeacher && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                              Teacher Panel
                            </span>
                          )}
                          {isCR && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                              CR ({u.assignedClass})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Panel Assignment & Management Console */}
        <div className="lg:col-span-7 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs flex flex-col justify-between space-y-6">
          {selectedUser ? (
            <div className="space-y-6">
              {/* Selected User Header Card */}
              <div className="p-4 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#493222] text-[#FFF9F1] flex items-center justify-center font-bold text-base shrink-0">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
                      Selected Target Account
                    </span>
                    <h3 className="font-bold text-sm text-[#38271C] truncate">{selectedUser.name}</h3>
                    <div className="text-xs text-[#806A56] font-mono truncate">{selectedUser.email}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono px-2.5 py-1 bg-[#EFE3D3] text-[#493222] rounded-lg font-bold block mb-1">
                    UID: {selectedUser.uid || 'Verified'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Status: Active
                  </span>
                </div>
              </div>

              {/* Panel Type Selector Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#38271C] block">Select Panel Type to Assign</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPanelType('cr')}
                    className={`py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      panelType === 'cr'
                        ? 'bg-[#493222] text-[#FFF9F1] border-[#493222] shadow-sm'
                        : 'bg-white hover:bg-[#F8F0E5] text-[#38271C] border-[#E6D8C7]'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Class Representative (CR) Panel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelType('teacher')}
                    className={`py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      panelType === 'teacher'
                        ? 'bg-[#493222] text-[#FFF9F1] border-[#493222] shadow-sm'
                        : 'bg-white hover:bg-[#F8F0E5] text-[#38271C] border-[#E6D8C7]'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Teacher Faculty Panel</span>
                  </button>
                </div>
              </div>

              {/* Conditional Configuration based on Panel Type */}
              {panelType === 'cr' ? (
                <div className="space-y-3 p-4 bg-white border border-[#E6D8C7] rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#38271C]">Assign Authorized Class & Section</span>
                    <span className="text-[10px] text-[#806A56]">One active CR per class</span>
                  </div>
                  <select
                    value={crClass}
                    onChange={(e) => setCrClass(e.target.value)}
                    className="w-full bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#38271C] focus:outline-none"
                  >
                    {INITIAL_CLASSES.map((cls) => (
                      <option key={cls.id} value={`${cls.class} ${cls.section}`}>
                        {cls.class} Section {cls.section} ({cls.class === 'BSSE' ? 'Software Engineering' : 'Computer Science'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#806A56]">
                    Granting CR access adds the CR Panel button to this student's top bar while preserving their normal Student Portal access.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-white border border-[#E6D8C7] rounded-2xl">
                  <div>
                    <span className="text-xs font-bold text-[#38271C] block mb-1">Assign Semester Subjects (Multiple Select)</span>
                    <p className="text-[11px] text-[#806A56] mb-3">
                      Select which official subjects this instructor is authorized to teach and manage.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {OFFICIAL_SUBJECTS.map((subj) => {
                        const isChecked = selectedSubjects.includes(subj);
                        return (
                          <button
                            key={subj}
                            type="button"
                            onClick={() => handleToggleSubject(subj)}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-[#493222] text-[#FFF9F1] border-[#493222]'
                                : 'bg-[#FFF9F1] hover:bg-[#EFE3D3] text-[#38271C] border-[#E6D8C7]'
                            }`}
                          >
                            <span>{subj}</span>
                            {isChecked && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-[#38271C] block mb-1">Primary Department / Class</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#38271C] focus:outline-none"
                    >
                      {INITIAL_CLASSES.map((cls) => (
                        <option key={cls.id} value={`${cls.class} ${cls.section}`}>
                          {cls.class} Section {cls.section}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Active Assignments & Revocation Actions for this User */}
              <div className="p-4 bg-white border border-[#E6D8C7] rounded-2xl space-y-3">
                <span className="text-xs font-bold text-[#38271C] block">Current Active Panel Authorizations</span>
                <div className="space-y-2">
                  {(selectedUser.role === 'cr' || selectedUser.isCR) && (
                    <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-blue-900">CR Panel Authorization</span>
                        <div className="text-[11px] text-blue-700">Assigned Class: {selectedUser.assignedClass || 'BSCS 3A'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRevokingTarget({ user: selectedUser, type: 'cr' })}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                      >
                        Revoke CR
                      </button>
                    </div>
                  )}

                  {(selectedUser.role === 'teacher' || selectedUser.teacherStatus === 'active') && (
                    <div className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-amber-900">Teacher Panel Authorization</span>
                        <div className="text-[11px] text-amber-700">
                          Subjects: {selectedUser.assignedSubjects?.join(', ') || 'PF Theory'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRevokingTarget({ user: selectedUser, type: 'teacher' })}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                      >
                        Revoke Teacher
                      </button>
                    </div>
                  )}

                  {selectedUser.role !== 'cr' && !selectedUser.isCR && selectedUser.role !== 'teacher' && selectedUser.teacherStatus !== 'active' && (
                    <div className="py-2 text-center text-xs text-[#806A56] italic">
                      No active panel assignments. Standard Student Portal privileges only.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Grant Panel */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleGrantAssignment}
                className="w-full py-3 bg-[#493222] hover:bg-[#342217] text-[#FFF9F1] rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>{isSubmitting ? 'Saving Assignment...' : `Confirm & Grant ${panelType === 'cr' ? 'CR' : 'Teacher'} Panel Access`}</span>
              </button>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-[#806A56]">
              Select a registered user account from the directory to configure panel access.
            </div>
          )}
        </div>
      </div>

      {/* Revocation Confirmation Modal */}
      {revokingTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base">Confirm Panel Revocation</h3>
            </div>
            <p className="text-xs text-[#38271C] leading-relaxed">
              You are about to revoke <span className="font-bold uppercase">{revokingTarget.type} Panel</span> access from{' '}
              <span className="font-bold">{revokingTarget.user.name}</span> ({revokingTarget.user.email}). This takes effect immediately across all active sessions and devices.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#38271C]">Revocation Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Semester ended / Role reassigned..."
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="w-full bg-white border border-[#E6D8C7] rounded-xl px-3.5 py-2 text-xs text-[#38271C] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRevokingTarget(null)}
                className="flex-1 py-2.5 bg-[#F8F0E5] hover:bg-[#EFE3D3] text-[#493222] rounded-xl font-bold text-xs border border-[#E6D8C7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteRevoke}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
