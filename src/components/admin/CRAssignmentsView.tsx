import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  ShieldCheck,
  Mail,
  Plus,
  GraduationCap,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  UserX,
  Users,
} from 'lucide-react';
import { ClassSection, AdminUser } from '../../data/adminData';
import { subscribeToClasses } from '../../lib/classService';
import { grantCRAccess, revokeCRAccess, searchUsersInFirestoreOrServer, mergeUsers } from '../../lib/authService';

interface CRAssignmentsViewProps {
  users: AdminUser[];
  adminEmail?: string;
  onNavigateToClasses?: () => void;
  initialSelectedClass?: string | null;
}

export const CRAssignmentsView: React.FC<CRAssignmentsViewProps> = ({
  users,
  adminEmail = 'hasnainbuilds724656@gmail.com',
  onNavigateToClasses,
  initialSelectedClass = null,
}) => {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [selectedClassForModal, setSelectedClassForModal] = useState<ClassSection | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedCandidateUser, setSelectedCandidateUser] = useState<AdminUser | null>(null);
  const [searchedCandidates, setSearchedCandidates] = useState<AdminUser[]>([]);

  const [showRevokeModalClass, setShowRevokeModalClass] = useState<ClassSection | null>(null);
  const [targetRevokeUser, setTargetRevokeUser] = useState<AdminUser | null>(null);
  const [revocationReason, setRevocationReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.role))
    : [];

  // Live search querying Firestore and server for student candidates
  useEffect(() => {
    const q = studentSearchQuery.trim();
    if (!q || q.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        const found = await searchUsersInFirestoreOrServer(q);
        if (Array.isArray(found) && found.length > 0) {
          setSearchedCandidates((prev) => mergeUsers(prev, found));
        }
      } catch (e) {}
    }, 250);

    return () => clearTimeout(timer);
  }, [studentSearchQuery]);

  useEffect(() => {
    const unsub = subscribeToClasses((liveClasses) => {
      setClasses(liveClasses);
      if (initialSelectedClass) {
        const target = liveClasses.find(
          (c) => `${c.class} ${c.section}`.toLowerCase() === initialSelectedClass.toLowerCase()
        );
        if (target) {
          setSelectedClassForModal(target);
        }
      }
    });
    return () => unsub();
  }, [initialSelectedClass]);

  const allDirectoryUsers = mergeUsers(safeUsers, searchedCandidates);

  // Handle granting CR access directly
  const handleConfirmGrantCR = async () => {
    if (!selectedClassForModal || !selectedCandidateUser) {
      setErrorMessage('Please select a student account to appoint as CR.');
      return;
    }

    const classStr = `${selectedClassForModal.class} ${selectedClassForModal.section}`;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await grantCRAccess(
        adminEmail,
        selectedCandidateUser.email,
        classStr,
        selectedCandidateUser.uid
      );

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to appoint Class Representative.');
        setIsSubmitting(false);
        return;
      }

      setSuccessToast(
        `Successfully appointed ${selectedCandidateUser.name} (${selectedCandidateUser.email}) as Class Representative for ${classStr}!`
      );
      setSelectedClassForModal(null);
      setSelectedCandidateUser(null);
      setStudentSearchQuery('');
      setIsSubmitting(false);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server error while appointing Class Representative.');
      setIsSubmitting(false);
    }
  };

  // Handle revoking CR access directly
  const handleConfirmRevokeCR = async () => {
    if (!showRevokeModalClass) return;

    const classKey = `${showRevokeModalClass.class} ${showRevokeModalClass.section}`.toLowerCase();
    const activeCR = targetRevokeUser || safeUsers.find(
      (u) =>
        (u.isCR || u.role === 'cr' || u.roles?.includes('cr')) &&
        u.crStatus !== 'revoked' &&
        (u.assignedClass?.toLowerCase() === classKey ||
          u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, ''))
    );

    if (!activeCR) {
      setErrorMessage('No active Class Representative found to revoke.');
      setShowRevokeModalClass(null);
      setTargetRevokeUser(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await revokeCRAccess(
        adminEmail,
        activeCR.email,
        revocationReason || 'Revoked by Master Administrator'
      );

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to revoke Class Representative access.');
        setIsSubmitting(false);
        return;
      }

      setSuccessToast(
        `Class Representative access for ${activeCR.name} (${activeCR.email}) on ${showRevokeModalClass.class} ${showRevokeModalClass.section} revoked.`
      );
      setShowRevokeModalClass(null);
      setRevocationReason('');
      setIsSubmitting(false);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server error while revoking CR access.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Class Representative (CR) Management</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Appoint, replace, and manage verified student Class Representatives authorized to record canonical daily class attendance
          </p>
        </div>
      </div>

      {/* Toast Feedback */}
      {successToast && (
        <div className="p-3.5 bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064] text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#668064] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-[#C84B31] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Classes Grid or Empty State */}
      {classes.length === 0 ? (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-8 sm:p-12 text-center shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F8F0E5] border border-[#E6D8C7] text-[#493222] flex items-center justify-center mx-auto shadow-2xs">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-[#38271C]">No Academic Classes Configured</h3>
            <p className="text-xs text-[#806A56] leading-relaxed">
              Default demo sections have been removed. Configure your intentional academic classes in the "Classes & Sections" view first. Then, students can enroll and be appointed as Class Representatives.
            </p>
          </div>
          {onNavigateToClasses && (
            <button
              onClick={onNavigateToClasses}
              className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Classes & Sections</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => {
            const classKey = `${cls.class} ${cls.section}`.toLowerCase();
            // Find all active assigned CRs from live user accounts
            const assignedCRUsers = safeUsers.filter(
              (u) =>
                (u.isCR || u.role === 'cr' || (Array.isArray(u.roles) && u.roles.includes('cr'))) &&
                u.crStatus !== 'revoked' &&
                (u.assignedClass?.toLowerCase() === classKey ||
                  u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, ''))
            );

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
                    <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] font-bold text-[10px] rounded-md font-mono">
                      {cls.class}
                    </span>
                    <span className="text-xs font-bold text-[#38271C]">
                      {enrolledStudents} {enrolledStudents === 1 ? 'Student' : 'Students'}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-[#38271C]">Section {cls.section}</h3>
                  <p className="text-xs text-[#806A56]">
                    Academic Section · Garden Campus Mardan
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
                      Appointed Class Representative{assignedCRUsers.length > 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] font-mono text-[#806A56]">
                      {assignedCRUsers.length > 0 ? `${assignedCRUsers.length} Active` : '0 Active'}
                    </span>
                  </div>

                  {assignedCRUsers.length > 0 ? (
                    <div className="space-y-2">
                      {assignedCRUsers.map((crUser) => (
                        <div
                          key={crUser.id || crUser.email}
                          className="flex items-center justify-between gap-2 p-2 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-[#3A7BD5] text-[#FFF9F1] flex items-center justify-center font-bold text-xs shrink-0">
                              {crUser.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-[#38271C] truncate">{crUser.name}</div>
                              <div className="text-[10px] text-[#806A56] font-mono truncate">{crUser.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {crUser.crAcknowledged === false ? (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[9px] rounded-full">
                                Pending Ack
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded-full">
                                Active
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setShowRevokeModalClass(cls);
                                setTargetRevokeUser(crUser);
                                setRevocationReason('');
                                setErrorMessage(null);
                              }}
                              className="p-1 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                              title={`Revoke CR privileges from ${crUser.name}`}
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : cls.assignedCR ? (
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

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedClassForModal(cls);
                      setSelectedCandidateUser(null);
                      setStudentSearchQuery('');
                      setErrorMessage(null);
                    }}
                    className="flex-1 py-2 bg-[#3A7BD5] hover:bg-[#2e64b0] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{assignedCRUsers.length > 0 ? 'Appoint / Add CR' : 'Appoint CR'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-Place Modal: Appoint Class Representative */}
      {selectedClassForModal && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedClassForModal(null)}
              className="absolute right-4 top-4 text-[#806A56] hover:text-[#38271C] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#38271C]">Appoint Class Representative</h2>
                <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] font-mono text-[10px] font-bold rounded-md">
                  {selectedClassForModal.class} {selectedClassForModal.section}
                </span>
              </div>
              <p className="text-xs text-[#806A56] mt-0.5">
                Select a registered student account to grant daily whole-class attendance marking authority
              </p>
            </div>

            {/* Enrolled Students Quick Picker */}
            {(() => {
              const classKey = `${selectedClassForModal.class} ${selectedClassForModal.section}`.toLowerCase();
              const enrolledList = safeUsers.filter(
                (u) =>
                  (u.assignedClass?.toLowerCase() === classKey ||
                    u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, '')) &&
                  !u.isCR &&
                  u.role !== 'cr'
              );

              return (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {enrolledList.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#38271C] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#3A7BD5]" />
                        <span>Enrolled Students in {selectedClassForModal.class} {selectedClassForModal.section} ({enrolledList.length})</span>
                      </label>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {enrolledList.map((stu) => {
                          const isSel = selectedCandidateUser?.id === stu.id;
                          return (
                            <div
                              key={stu.id}
                              onClick={() => setSelectedCandidateUser(stu)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                                isSel
                                  ? 'bg-[#3A7BD5]/10 border-[#3A7BD5] font-bold'
                                  : 'bg-white border-[#E6D8C7] hover:bg-[#F8F0E5]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-[#493222] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {stu.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <span className="text-[#38271C]">{stu.name}</span>
                                  <span className="text-[10px] text-[#806A56] font-mono ml-2">({stu.email})</span>
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="crCandidate"
                                checked={isSel}
                                onChange={() => setSelectedCandidateUser(stu)}
                                className="accent-[#3A7BD5]"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Or Search Directory */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-[#38271C] block">
                      Or Search All Registered Directory
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Search student by name, roll number, or Gmail..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none"
                      />
                    </div>
                  </div>

                  {studentSearchQuery.trim().length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {allDirectoryUsers
                        .filter(
                          (u) =>
                            u.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                            u.email.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                            (u.studentId && u.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                        )
                        .slice(0, 5)
                        .map((stu) => {
                          const isSel = selectedCandidateUser?.id === stu.id;
                          return (
                            <div
                              key={stu.id}
                              onClick={() => setSelectedCandidateUser(stu)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                                isSel
                                  ? 'bg-[#3A7BD5]/10 border-[#3A7BD5] font-bold'
                                  : 'bg-white border-[#E6D8C7] hover:bg-[#F8F0E5]'
                              }`}
                            >
                              <div className="truncate min-w-0">
                                <span className="text-[#38271C]">{stu.name}</span>
                                <span className="text-[10px] text-[#806A56] font-mono ml-2">({stu.email})</span>
                              </div>
                              <input
                                type="radio"
                                name="crCandidate"
                                checked={isSel}
                                onChange={() => setSelectedCandidateUser(stu)}
                                className="accent-[#3A7BD5]"
                              />
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Selected Confirmation Summary */}
            {selectedCandidateUser && (
              <div className="p-3 bg-[#EAF2E9] border border-[#C5DCC3] rounded-2xl text-xs text-[#4A5B49] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#668064]" />
                  <span>Selected Candidate: {selectedCandidateUser.name}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Appointing <strong>{selectedCandidateUser.name}</strong> ({selectedCandidateUser.email}) will grant Class Representative authority for {selectedClassForModal.class} Section {selectedClassForModal.section}.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E6D8C7]">
              <button
                type="button"
                onClick={() => setSelectedClassForModal(null)}
                className="px-4 py-2 border border-[#D8C7B4] rounded-xl text-xs font-bold text-[#806A56] hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGrantCR}
                disabled={!selectedCandidateUser || isSubmitting}
                className="px-5 py-2 bg-[#3A7BD5] hover:bg-[#2e64b0] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Appointing...</span>
                  </>
                ) : (
                  <span>Confirm & Grant CR Role</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revocation Modal */}
      {showRevokeModalClass && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowRevokeModalClass(null)}
              className="absolute right-4 top-4 text-[#806A56] hover:text-[#38271C] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-[#C84B31]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base">Revoke CR Access</h3>
            </div>

            <p className="text-xs text-[#38271C] leading-relaxed">
              Are you sure you want to revoke Class Representative privileges for{' '}
              <strong>
                {targetRevokeUser
                  ? `${targetRevokeUser.name} (${targetRevokeUser.email})`
                  : `${showRevokeModalClass.class} ${showRevokeModalClass.section}`}
              </strong>? The student account will remain active with standard student portal privileges.
            </p>

            <div>
              <label className="text-xs font-bold text-[#38271C] block mb-1">Revocation Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Term completed / Reassigned"
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeModalClass(null)}
                className="px-4 py-2 border border-[#D8C7B4] rounded-xl text-xs font-bold text-[#806A56] hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevokeCR}
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#C84B31] hover:bg-[#a53b24] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <span>Revoking...</span> : <span>Confirm Revocation</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

